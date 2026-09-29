import { NextResponse, type NextRequest } from "next/server";
import { cookies } from "next/headers";
import * as XLSX from "xlsx";
import { prisma } from "@/lib/prisma";
import { formatDateTime } from "@/lib/labels";

function getWeekRange(anchor: Date): { start: Date; end: Date } {
  const start = new Date(anchor);
  start.setHours(0, 0, 0, 0);
  start.setDate(start.getDate() - start.getDay());
  const end = new Date(start);
  end.setDate(end.getDate() + 7);
  return { start, end };
}

export async function GET(request: NextRequest) {
  const cookieStore = await cookies();
  const isAdmin = cookieStore.get("role")?.value === "admin";
  if (!isAdmin) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
  }

  const weekParam = request.nextUrl.searchParams.get("week");
  const anchor = weekParam ? new Date(`${weekParam}T00:00:00`) : new Date();
  const { start, end } = getWeekRange(anchor);

  const entries = await prisma.roomEntry.findMany({
    where: { enteredAt: { gte: start, lt: end } },
    orderBy: { enteredAt: "desc" },
    include: { room: true },
  });

  const rows = entries.map((entry) => ({
    "חדר חשמל": entry.room.name,
    "טלפון": entry.phone,
    "תאריך ושעה": formatDateTime(entry.enteredAt),
    "חדר נקי": entry.roomClean ? "כן" : "לא",
    "מזגן תקין": entry.acWorking ? "כן" : "לא",
    "הערות": entry.notes ?? "",
  }));

  const worksheet = XLSX.utils.json_to_sheet(rows);
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, "כניסות");
  const buffer = XLSX.write(workbook, { type: "buffer", bookType: "xlsx" }) as Buffer;

  return new NextResponse(new Uint8Array(buffer), {
    headers: {
      "Content-Type":
        "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "Content-Disposition": `attachment; filename="room-entries-${weekParam ?? "current"}.xlsx"`,
    },
  });
}
