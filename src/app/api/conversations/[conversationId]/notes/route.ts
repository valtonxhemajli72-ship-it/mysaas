import { NextResponse } from "next/server";

import { prisma } from "@/lib/prisma";
import { requireTenantOrganization } from "@/server/require-tenant-organization";

export async function POST(
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

  const contentRaw =
    typeof body === "object" && body !== null && "content" in body
      ? (body as { content?: unknown }).content
      : undefined;

  if (typeof contentRaw !== "string" || contentRaw.trim().length === 0) {
    return NextResponse.json({ error: "content required" }, { status: 400 });
  }

  const conversation = await prisma.conversation.findFirst({
    where: {
      id: conversationId,
      organizationId: tenant.organizationId,
    },
    select: { id: true, organizationId: true },
  });

  if (!conversation) {
    return NextResponse.json({ error: "Conversation not found" }, { status: 404 });
  }

  const note = await prisma.note.create({
    data: {
      organizationId: conversation.organizationId,
      conversationId: conversation.id,
      content: contentRaw.trim(),
    },
  });

  return NextResponse.json({ note });
}
