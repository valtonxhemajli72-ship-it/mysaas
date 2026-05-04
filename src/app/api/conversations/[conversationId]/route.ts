import { NextResponse } from "next/server";

import { prisma } from "@/lib/prisma";
import { requireTenantOrganization } from "@/server/require-tenant-organization";

const STATUSES = ["OPEN", "PENDING", "CLOSED"] as const;
type ConversationStatus = (typeof STATUSES)[number];

function isConversationStatus(value: string): value is ConversationStatus {
  return (STATUSES as readonly string[]).includes(value);
}

export async function PATCH(request: Request, context: { params: Promise<{ conversationId: string }> }) {
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

  const statusRaw =
    typeof body === "object" && body !== null && "status" in body
      ? (body as { status?: unknown }).status
      : undefined;

  if (typeof statusRaw !== "string" || !isConversationStatus(statusRaw)) {
    return NextResponse.json({ error: "status must be OPEN, PENDING, or CLOSED" }, { status: 400 });
  }

  const inTenant = await prisma.conversation.findFirst({
    where: {
      id: conversationId,
      organizationId: tenant.organizationId,
    },
    select: { id: true },
  });

  if (!inTenant) {
    return NextResponse.json({ error: "Conversation not found" }, { status: 404 });
  }

  const conversation = await prisma.conversation.update({
    where: { id: conversationId },
    data: { status: statusRaw },
    include: {
      customer: true,
      channel: true,
      messages: { orderBy: { createdAt: "asc" } },
    },
  });

  return NextResponse.json({ conversation });
}
