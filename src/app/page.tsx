import Link from "next/link";
import { SignedIn, SignedOut, SignInButton, SignUpButton } from "@clerk/nextjs";

import { Button } from "@/components/ui/button";

export default function HomePage() {
  return (
    <div className="flex min-h-screen flex-col">
      <header className="border-b">
        <div className="container mx-auto flex h-14 items-center justify-between px-4">
          <span className="font-semibold tracking-tight">MySaaS</span>
          <nav className="flex items-center gap-2">
            <SignedOut>
              <SignInButton mode="modal">
                <Button variant="ghost" size="sm">
                  Sign in
                </Button>
              </SignInButton>
              <SignUpButton mode="modal">
                <Button size="sm">Get started</Button>
              </SignUpButton>
            </SignedOut>
            <SignedIn>
              <Button asChild size="sm">
                <Link href="/dashboard">Dashboard</Link>
              </Button>
            </SignedIn>
          </nav>
        </div>
      </header>
      <main className="container mx-auto flex flex-1 flex-col justify-center gap-6 px-4 py-16">
        <div className="max-w-2xl space-y-4">
          <h1 className="text-4xl font-bold tracking-tight">Multi-tenant SaaS starter</h1>
          <p className="text-muted-foreground text-lg">
            Next.js, TypeScript, Tailwind, shadcn/ui, Prisma, PostgreSQL, and Clerk with organizations and synced
            memberships.
          </p>
          <div className="flex flex-wrap gap-2 pt-2">
            <SignedOut>
              <SignUpButton mode="modal">
                <Button>Create account</Button>
              </SignUpButton>
            </SignedOut>
            <SignedIn>
              <Button asChild>
                <Link href="/dashboard">Open dashboard</Link>
              </Button>
            </SignedIn>
          </div>
        </div>
      </main>
    </div>
  );
}
