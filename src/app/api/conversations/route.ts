import { NextResponse } from "next/server";

import { prisma } from "@/lib/prisma";

export async function GET() {
  const conversations = await prisma.conversation.findMany({
    orderBy: { createdAt: "desc" },
    include: {
      customer: true,
      channel: true,
      messages: {
        orderBy: { createdAt: "asc" },
      },
    },
  });

  return NextResponse.json({ conversations });
}
