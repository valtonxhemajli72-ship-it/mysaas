import { NextResponse } from "next/server";

import { prisma } from "@/lib/prisma";
import { requireTenantOrganization } from "@/server/require-tenant-organization";

export async function GET() {
  const tenant = await requireTenantOrganization();
  if (!tenant.ok) {
    return tenant.response;
  }

  const conversations = await prisma.conversation.findMany({
    where: { organizationId: tenant.organizationId },
    orderBy: { createdAt: "desc" },
    include: {
      customer: true,
      channel: true,
      messages: {
        orderBy: { createdAt: "asc" },
      },
      notes: {
        orderBy: { createdAt: "asc" },
      },
      tags: {
        orderBy: { name: "asc" },
      },
    },
  });

  return NextResponse.json({ conversations });
}
