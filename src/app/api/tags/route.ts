import { NextResponse } from "next/server";

import { prisma } from "@/lib/prisma";
import { requireTenantOrganization } from "@/server/require-tenant-organization";

export async function GET() {
  const tenant = await requireTenantOrganization();
  if (!tenant.ok) {
    return tenant.response;
  }

  const tags = await prisma.tag.findMany({
    where: { organizationId: tenant.organizationId },
    orderBy: { name: "asc" },
  });

  return NextResponse.json({ tags });
}

export async function POST(request: Request) {
  const tenant = await requireTenantOrganization();
  if (!tenant.ok) {
    return tenant.response;
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const nameRaw =
    typeof body === "object" && body !== null && "name" in body ? (body as { name?: unknown }).name : undefined;
  const colorRaw =
    typeof body === "object" && body !== null && "color" in body ? (body as { color?: unknown }).color : undefined;

  if (typeof nameRaw !== "string" || nameRaw.trim().length === 0) {
    return NextResponse.json({ error: "name required" }, { status: 400 });
  }
  if (typeof colorRaw !== "string" || colorRaw.trim().length === 0) {
    return NextResponse.json({ error: "color required" }, { status: 400 });
  }

  const tag = await prisma.tag.create({
    data: {
      organizationId: tenant.organizationId,
      name: nameRaw.trim(),
      color: colorRaw.trim(),
    },
  });

  return NextResponse.json({ tag });
}
