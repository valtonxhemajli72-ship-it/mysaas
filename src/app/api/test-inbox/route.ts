import { NextResponse } from "next/server";

import { prisma } from "@/lib/prisma";

const ORGANIZATION_ID = "test-org-id";

export async function POST() {
  // Ensure FK target exists (Organization requires clerkOrgId, name, slug).
  await prisma.organization.upsert({
    where: { id: ORGANIZATION_ID },
    create: {
      id: ORGANIZATION_ID,
      clerkOrgId: "org_test_inbox_api",
      name: "Test Organization",
      slug: "test-org-inbox-api",
    },
    update: {},
  });

  const customer = await prisma.customer.create({
    data: {
      organizationId: ORGANIZATION_ID,
      name: "John Doe",
      email: "john@example.com",
    },
  });

  const channel = await prisma.channel.create({
    data: {
      organizationId: ORGANIZATION_ID,
      type: "WEBSITE_CHAT",
      name: "Website",
    },
  });

  const conversation = await prisma.conversation.create({
    data: {
      organizationId: ORGANIZATION_ID,
      customerId: customer.id,
      channelId: channel.id,
      status: "OPEN",
    },
  });

  const message = await prisma.message.create({
    data: {
      organizationId: ORGANIZATION_ID,
      conversationId: conversation.id,
      content: "Hello, I need help",
      direction: "INBOUND",
      senderType: "CUSTOMER",
    },
  });

  return NextResponse.json({
    organizationId: ORGANIZATION_ID,
    customer,
    channel,
    conversation,
    message,
  });
}
