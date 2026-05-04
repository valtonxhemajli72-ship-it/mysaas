import { clerkClient } from "@clerk/nextjs/server";

import { prisma } from "@/lib/prisma";
import { clerkRoleToOrgRole } from "@/lib/org-role";

/** Upsert the active Clerk organization and its memberships into Prisma (tenant rows). */
export async function syncOrganizationFromClerk(organizationId: string) {
  const client = await clerkClient();
  const org = await client.organizations.getOrganization({ organizationId });

  const slug =
    org.slug && org.slug.length > 0
      ? org.slug
      : `org-${org.id.replace("org_", "").slice(0, 12)}`;

  const organization = await prisma.organization.upsert({
    where: { clerkOrgId: org.id },
    create: {
      clerkOrgId: org.id,
      name: org.name,
      slug,
      imageUrl: org.imageUrl ?? undefined,
    },
    update: {
      name: org.name,
      slug,
      imageUrl: org.imageUrl ?? undefined,
    },
  });

  const { data: memberships } = await client.organizations.getOrganizationMembershipList({
    organizationId,
    limit: 100,
  });

  const clerkUserIds = new Set<string>();

  for (const m of memberships) {
    const userId = m.publicUserData?.userId;
    if (!userId) continue;
    clerkUserIds.add(userId);
    const role = clerkRoleToOrgRole(m.role);

    await prisma.orgMembership.upsert({
      where: {
        organizationId_clerkUserId: {
          organizationId: organization.id,
          clerkUserId: userId,
        },
      },
      create: {
        organizationId: organization.id,
        clerkUserId: userId,
        role,
      },
      update: { role },
    });
  }

  if (clerkUserIds.size > 0) {
    await prisma.orgMembership.deleteMany({
      where: {
        organizationId: organization.id,
        clerkUserId: { notIn: [...clerkUserIds] },
      },
    });
  } else {
    await prisma.orgMembership.deleteMany({
      where: { organizationId: organization.id },
    });
  }

  return organization;
}
