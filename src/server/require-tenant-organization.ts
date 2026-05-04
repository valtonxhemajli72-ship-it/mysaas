import { auth } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";

import { prisma } from "@/lib/prisma";

type TenantOk = { ok: true; organizationId: string };
type TenantErr = { ok: false; response: NextResponse };

export type TenantAuthResult = TenantOk | TenantErr;

/** Resolves Clerk session + active org to our multi-tenant `Organization.id`. */
export async function requireTenantOrganization(): Promise<TenantAuthResult> {
  const { userId, orgId } = await auth();

  if (!userId) {
    return { ok: false, response: NextResponse.json({ error: "Unauthorized" }, { status: 401 }) };
  }

  if (!orgId) {
    return {
      ok: false,
      response: NextResponse.json({ error: "No active organization" }, { status: 403 }),
    };
  }

  const organization = await prisma.organization.findUnique({
    where: { clerkOrgId: orgId },
    select: { id: true },
  });

  if (!organization) {
    return {
      ok: false,
      response: NextResponse.json(
        { error: "Organization not found for active Clerk organization" },
        { status: 403 },
      ),
    };
  }

  return { ok: true, organizationId: organization.id };
}
