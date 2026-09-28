import { prisma } from "@/lib/prisma";

export async function getWorkOrdersTitle(): Promise<string> {
  const settings = await prisma.appSettings.findUnique({
    where: { id: "singleton" },
  });
  return settings?.workOrdersTitle ?? "משימות";
}
