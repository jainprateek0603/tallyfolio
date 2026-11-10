export type RoleName = "USER" | "ADMIN";

export function isAdmin(role: RoleName): boolean {
  return role === "ADMIN";
}

export function ownsRecord(ownerId: string, actorId: string): boolean {
  return ownerId === actorId;
}

export function canMutateOtherUser(actorId: string, targetId: string): boolean {
  return actorId !== targetId;
}

export function safeCallbackPath(value: string | null | undefined): string {
  if (!value || !value.startsWith("/") || value.startsWith("//") || value.includes("\\")) {
    return "/dashboard";
  }
  return value;
}
