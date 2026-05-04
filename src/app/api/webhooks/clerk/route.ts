import { headers } from "next/headers";
import { Webhook } from "svix";

import { prisma } from "@/lib/prisma";
import { clerkRoleToOrgRole } from "@/lib/org-role";

type ClerkWebhookEvent = {
  type: string;
  data: Record<string, unknown>;
};

export async function POST(req: Request) {
  const secret = process.env.CLERK_WEBHOOK_SIGNING_SECRET;
  if (!secret) {
    return new Response("Missing CLERK_WEBHOOK_SIGNING_SECRET", { status: 500 });
  }

  const payload = await req.text();
  const h = await headers();
  const svixId = h.get("svix-id");
  const svixTimestamp = h.get("svix-timestamp");
  const svixSignature = h.get("svix-signature");

  if (!svixId || !svixTimestamp || !svixSignature) {
    return new Response("Missing svix headers", { status: 400 });
  }

  let evt: ClerkWebhookEvent;
  try {
    const wh = new Webhook(secret);
    evt = wh.verify(payload, {
      "svix-id": svixId,
      "svix-timestamp": svixTimestamp,
      "svix-signature": svixSignature,
    }) as ClerkWebhookEvent;
  } catch {
    return new Response("Invalid signature", { status: 400 });
  }

  try {
    await handleClerkEvent(evt);
  } catch (e) {
    console.error("[clerk webhook]", e);
    return new Response("Webhook handler error", { status: 500 });
  }

  return new Response(null, { status: 204 });
}

function orgIdFromPayload(data: Record<string, unknown>): string {
  const org = data.organization;
  if (org && typeof org === "object" && "id" in org) return String((org as { id?: string }).id ?? "");
  if (data.organization_id != null) return String(data.organization_id);
  if (data.organizationId != null) return String(data.organizationId);
  return "";
}

function userIdFromMembershipPayload(data: Record<string, unknown>): string {
  const pud = data.public_user_data ?? data.publicUserData;
  if (pud && typeof pud === "object") {
    const o = pud as { user_id?: string; userId?: string };
    if (o.userId) return String(o.userId);
    if (o.user_id) return String(o.user_id);
  }
  if (data.user_id != null) return String(data.user_id);
  if (data.userId != null) return String(data.userId);
  return "";
}

async function handleClerkEvent(evt: ClerkWebhookEvent) {
  const { type, data } = evt;

  switch (type) {
    case "organization.created":
    case "organization.updated": {
      const id = String(data.id ?? "");
      const name = String(data.name ?? "Organization");
      const slugRaw = data.slug != null ? String(data.slug) : "";
      const slug = slugRaw.length > 0 ? slugRaw : `org-${id.replace("org_", "").slice(0, 12)}`;
      const imageUrl =
        data.image_url != null
          ? String(data.image_url)
          : data.imageUrl != null
            ? String(data.imageUrl)
            : null;

      await prisma.organization.upsert({
        where: { clerkOrgId: id },
        create: {
          clerkOrgId: id,
          name,
          slug,
          imageUrl,
        },
        update: {
          name,
          slug,
          imageUrl,
        },
      });
      break;
    }
    case "organization.deleted": {
      const id = String(data.id ?? "");
      await prisma.organization.deleteMany({ where: { clerkOrgId: id } });
      break;
    }
    case "organizationMembership.created":
    case "organizationMembership.updated": {
      const orgId = orgIdFromPayload(data);
      const userId = userIdFromMembershipPayload(data);
      const role = clerkRoleToOrgRole(String(data.role ?? ""));

      if (!orgId || !userId) break;

      const org = await prisma.organization.findUnique({ where: { clerkOrgId: orgId } });
      if (!org) break;

      await prisma.orgMembership.upsert({
        where: {
          organizationId_clerkUserId: {
            organizationId: org.id,
            clerkUserId: userId,
          },
        },
        create: {
          organizationId: org.id,
          clerkUserId: userId,
          role,
        },
        update: { role },
      });
      break;
    }
    case "organizationMembership.deleted": {
      const orgId = orgIdFromPayload(data);
      const userId = userIdFromMembershipPayload(data);
      if (!orgId || !userId) break;

      const org = await prisma.organization.findUnique({ where: { clerkOrgId: orgId } });
      if (!org) break;

      await prisma.orgMembership.deleteMany({
        where: { organizationId: org.id, clerkUserId: userId },
      });
      break;
    }
    case "user.created":
    case "user.updated": {
      const clerkUserId = String(data.id ?? "");
      const emails = (data.email_addresses ?? data.emailAddresses) as unknown;
      let primary = "";
      if (Array.isArray(emails) && emails[0] && typeof emails[0] === "object") {
        const e = emails[0] as { email_address?: string; emailAddress?: string };
        primary = String(e.email_address ?? e.emailAddress ?? "");
      }
      const first =
        data.first_name != null ? String(data.first_name) : data.firstName != null ? String(data.firstName) : "";
      const last =
        data.last_name != null ? String(data.last_name) : data.lastName != null ? String(data.lastName) : "";
      const displayName = [first, last].filter(Boolean).join(" ") || primary || null;
      const imageUrl =
        data.image_url != null
          ? String(data.image_url)
          : data.imageUrl != null
            ? String(data.imageUrl)
            : null;

      if (!clerkUserId) break;

      await prisma.userProfile.upsert({
        where: { clerkUserId },
        create: {
          clerkUserId,
          email: primary || null,
          displayName,
          imageUrl,
        },
        update: {
          email: primary || null,
          displayName,
          imageUrl,
        },
      });
      break;
    }
    case "user.deleted": {
      const clerkUserId = String(data.id ?? "");
      if (!clerkUserId) break;
      await prisma.userProfile.deleteMany({ where: { clerkUserId } });
      break;
    }
    default:
      break;
  }
}
