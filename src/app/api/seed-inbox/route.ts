import { NextResponse } from "next/server";

import { prisma } from "@/lib/prisma";
import { requireTenantOrganization } from "@/server/require-tenant-organization";

export async function POST() {
  const tenant = await requireTenantOrganization();
  if (!tenant.ok) {
    return tenant.response;
  }

  const organizationId = tenant.organizationId;

  const conversation = await prisma.$transaction(async (tx) => {
    const customer = await tx.customer.create({
      data: {
        organizationId,
        name: "Alex Rivera",
        email: "alex@example.com",
      },
    });

    const channel = await tx.channel.create({
      data: {
        organizationId,
        type: "WEBSITE_CHAT",
        name: "Website",
      },
    });

    const conv = await tx.conversation.create({
      data: {
        organizationId,
        customerId: customer.id,
        channelId: channel.id,
        status: "OPEN",
      },
    });

    await tx.message.createMany({
      data: [
        {
          organizationId,
          conversationId: conv.id,
          content: "Hi — I placed an order yesterday and haven’t received a shipping confirmation yet.",
          direction: "INBOUND",
          senderType: "CUSTOMER",
        },
        {
          organizationId,
          conversationId: conv.id,
          content: "Thanks for reaching out! I’ve pulled up your order and will send tracking shortly.",
          direction: "OUTBOUND",
          senderType: "AGENT",
        },
        {
          organizationId,
          conversationId: conv.id,
          content: "Great, appreciate the quick reply.",
          direction: "INBOUND",
          senderType: "CUSTOMER",
        },
      ],
    });

    return tx.conversation.findUniqueOrThrow({
      where: { id: conv.id },
      include: {
        customer: true,
        channel: true,
        messages: { orderBy: { createdAt: "asc" } },
        notes: { orderBy: { createdAt: "asc" } },
      },
    });
  });

  return NextResponse.json({ conversation });
}
