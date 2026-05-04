import type { OrgRole } from "@prisma/client";

/** Map Clerk organization membership roles to Prisma `OrgRole`. */
export function clerkRoleToOrgRole(clerkRole: string | undefined): OrgRole {
  if (!clerkRole) return "MEMBER";
  if (clerkRole === "org:admin") return "ADMIN";
  return "MEMBER";
}
