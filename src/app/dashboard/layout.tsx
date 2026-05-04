import Link from "next/link";
import { auth } from "@clerk/nextjs/server";
import { OrganizationSwitcher, SignedIn } from "@clerk/nextjs";

import { DashboardNav } from "@/components/dashboard-nav";
import { UserNav } from "@/components/user-nav";
import { syncOrganizationFromClerk } from "@/server/sync-organization";

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const { orgId } = await auth();

  if (orgId) {
    await syncOrganizationFromClerk(orgId);
  }

  return (
    <div className="flex min-h-screen flex-col">
      <header className="bg-background/95 supports-[backdrop-filter]:bg-background/60 sticky top-0 z-40 border-b backdrop-blur">
        <div className="container mx-auto flex h-14 items-center justify-between gap-4 px-4">
          <div className="flex items-center gap-4">
            <Link href="/dashboard" className="font-semibold tracking-tight">
              MySaaS
            </Link>
            <DashboardNav />
            <SignedIn>
              <OrganizationSwitcher
                hidePersonal
                afterCreateOrganizationUrl="/dashboard"
                afterSelectOrganizationUrl="/dashboard"
                appearance={{
                  elements: {
                    rootBox: "flex justify-center",
                    organizationSwitcherTrigger: "border border-input bg-background rounded-md px-2 py-1",
                  },
                }}
              />
            </SignedIn>
          </div>
          <UserNav />
        </div>
      </header>
      <div className="container mx-auto flex-1 px-4 py-8">{children}</div>
    </div>
  );
}
