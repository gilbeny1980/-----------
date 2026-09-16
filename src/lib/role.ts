import { cookies } from "next/headers";

export async function isViewer(): Promise<boolean> {
  const cookieStore = await cookies();
  return cookieStore.get("role")?.value === "viewer";
}

export async function assertNotViewer() {
  if (await isViewer()) {
    throw new Error("צפייה בלבד - אין אפשרות לערוך");
  }
}
