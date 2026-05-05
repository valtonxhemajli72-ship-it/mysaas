import { NextResponse } from "next/server";

import { prisma } from "@/lib/prisma";
import { requireTenantOrganization } from "@/server/require-tenant-organization";

export async function PATCH(
  request: Request,
  context: { params: Promise<{ conversationId: string }> },
) {
  const tenant = await requireTenantOrganization();
  if (!tenant.ok) {
    return tenant.response;
  }

  const { conversationId } = await context.params;

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const tagIdsRaw =
    typeof body === "object" && body !== null && "tagIds" in body
      ? (body as { tagIds?: unknown }).tagIds
      : undefined;

  if (!Array.isArray(tagIdsRaw) || !tagIdsRaw.every((id) => typeof id === "string")) {
    return NextResponse.json({ error: "tagIds must be an array of strings" }, { status: 400 });
  }

  const tagIds = tagIdsRaw as string[];

  const conversation = await prisma.conversation.findFirst({
    where: {
      id: conversationId,
      organizationId: tenant.organizationId,
    },
    select: { id: true },
  });

  if (!conversation) {
    return NextResponse.json({ error: "Conversation not found" }, { status: 404 });
  }

  if (tagIds.length > 0) {
    const validCount = await prisma.tag.count({
      where: {
        id: { in: tagIds },
        organizationId: tenant.organizationId,
      },
    });

    if (validCount !== tagIds.length) {
      return NextResponse.json({ error: "One or more tags are invalid for this organization" }, { status: 400 });
    }
  }

  const updated = await prisma.conversation.update({
    where: { id: conversationId },
    data: {
      tags: {
        set: tagIds.map((id) => ({ id })),
      },
    },
    include: {
      customer: true,
      channel: true,
      messages: { orderBy: { createdAt: "asc" } },
      notes: { orderBy: { createdAt: "asc" } },
      tags: {
        orderBy: { name: "asc" },
      },
    },
  });

  return NextResponse.json({ conversation: updated });
}
