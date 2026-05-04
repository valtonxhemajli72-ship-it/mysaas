import Link from "next/link";
import { auth } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { prisma } from "@/lib/prisma";

export default async function DashboardPage() {
  const { userId, orgId } = await auth();
  if (!userId) redirect("/sign-in");

  if (!orgId) {
    return (
      <div className="mx-auto max-w-lg space-y-6">
        <Card>
          <CardHeader>
            <CardTitle>Select an organization</CardTitle>
            <CardDescription>
              Multi-tenant routes are scoped to a Clerk organization. Use the switcher in the header to create or join
              an organization.
            </CardDescription>
          </CardHeader>
          <CardContent className="flex gap-2">
            <Button asChild variant="outline">
              <Link href="/">Back home</Link>
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  const organization = await prisma.organization.findUnique({
    where: { clerkOrgId: orgId },
    include: {
      memberships: { orderBy: { createdAt: "asc" } },
    },
  });

  return (
    <div className="mx-auto max-w-3xl space-y-8">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Dashboard</h1>
        <p className="text-muted-foreground mt-1">
          Tenant data for <span className="text-foreground font-medium">{organization?.name ?? "your org"}</span>{" "}
          (Clerk org <code className="rounded bg-muted px-1 py-0.5 text-xs">{orgId}</code>).
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Organization (Prisma)</CardTitle>
          <CardDescription>Synced on each dashboard load and via Clerk webhooks.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4 text-sm">
          {organization ? (
            <>
              <div className="grid gap-1">
                <span className="text-muted-foreground">Name</span>
                <span>{organization.name}</span>
              </div>
              <div className="grid gap-1">
                <span className="text-muted-foreground">Slug</span>
                <span>{organization.slug}</span>
              </div>
              <div className="grid gap-1">
                <span className="text-muted-foreground">Members ({organization.memberships.length})</span>
                <ul className="border-border mt-1 divide-y rounded-md border">
                  {organization.memberships.map((m) => (
                    <li key={m.id} className="flex items-center justify-between px-3 py-2">
                      <code className="text-xs">{m.clerkUserId}</code>
                      <span className="text-muted-foreground">{m.role}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </>
          ) : (
            <p className="text-muted-foreground">No organization row yet — it will appear after the first sync.</p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
