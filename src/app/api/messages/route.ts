import { NextResponse } from "next/server";

import { prisma } from "@/lib/prisma";

export async function POST(request: Request) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const conversationId =
    typeof body === "object" && body !== null && "conversationId" in body
      ? (body as { conversationId?: unknown }).conversationId
      : undefined;
  const content =
    typeof body === "object" && body !== null && "content" in body ? (body as { content?: unknown }).content : undefined;

  if (typeof conversationId !== "string" || conversationId.length === 0) {
    return NextResponse.json({ error: "conversationId required" }, { status: 400 });
  }
  if (typeof content !== "string" || content.trim().length === 0) {
    return NextResponse.json({ error: "content required" }, { status: 400 });
  }

  const conversation = await prisma.conversation.findUnique({
    where: { id: conversationId },
    select: { organizationId: true },
  });

  if (!conversation) {
    return NextResponse.json({ error: "Conversation not found" }, { status: 404 });
  }

  const message = await prisma.message.create({
    data: {
      organizationId: conversation.organizationId,
      conversationId,
      content: content.trim(),
      direction: "OUTBOUND",
      senderType: "AGENT",
    },
  });

  return NextResponse.json(message);
}
