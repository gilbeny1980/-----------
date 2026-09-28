import { cookies } from "next/headers";

export async function isAdmin(): Promise<boolean> {
  const cookieStore = await cookies();
  return cookieStore.get("role")?.value === "admin";
}

export async function assertAdmin() {
  if (!(await isAdmin())) {
    throw new Error("נדרשת הרשאת מנהל");
  }
}
