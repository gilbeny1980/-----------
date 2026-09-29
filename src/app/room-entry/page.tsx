import Link from "next/link";
import { cookies } from "next/headers";
import { prisma } from "@/lib/prisma";
import { formatDateTime } from "@/lib/labels";
import { QrScanner } from "./QrScanner";

function getWeekRange(anchor: Date): { start: Date; end: Date } {
  const start = new Date(anchor);
  start.setHours(0, 0, 0, 0);
  start.setDate(start.getDate() - start.getDay());
  const end = new Date(start);
  end.setDate(end.getDate() + 7);
  return { start, end };
}

function formatDateParam(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

function formatWeekLabel(start: Date, end: Date): string {
  const last = new Date(end);
  last.setDate(last.getDate() - 1);
  return `${formatDateParam(start)} - ${formatDateParam(last)}`;
}

export default async function RoomEntryPage({
  searchParams,
}: {
  searchParams: Promise<{ week?: string }>;
}) {
  const { week } = await searchParams;
  const anchor = week ? new Date(`${week}T00:00:00`) : new Date();
  const { start, end } = getWeekRange(anchor);

  const cookieStore = await cookies();
  const isAdmin = cookieStore.get("role")?.value === "admin";

  const entries = isAdmin
    ? await prisma.roomEntry.findMany({
        where: { enteredAt: { gte: start, lt: end } },
        orderBy: { enteredAt: "desc" },
        include: { room: true },
      })
    : [];

  const prevWeek = new Date(start);
  prevWeek.setDate(prevWeek.getDate() - 7);
  const nextWeek = new Date(start);
  nextWeek.setDate(nextWeek.getDate() + 7);

  return (
    <div className="mx-auto flex w-full max-w-2xl flex-col gap-8 px-4 py-10">
      <div className="flex flex-col items-center gap-6">
        <h1 className="text-xl font-bold">כניסה לחדר חשמל</h1>
        <div className="w-full max-w-sm">
          <QrScanner />
        </div>
      </div>

      <div className="space-y-4">
        <h2 className="text-lg font-bold">כניסות השבוע</h2>

        {isAdmin ? (
          <>
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div className="flex items-center gap-2 text-sm">
                <Link
                  href={`/room-entry?week=${formatDateParam(prevWeek)}`}
                  className="rounded-md border border-slate-300 px-3 py-1.5 hover:bg-slate-50"
                >
                  שבוע קודם
                </Link>
                <span className="text-slate-500">{formatWeekLabel(start, end)}</span>
                <Link
                  href={`/room-entry?week=${formatDateParam(nextWeek)}`}
                  className="rounded-md border border-slate-300 px-3 py-1.5 hover:bg-slate-50"
                >
                  שבוע הבא
                </Link>
              </div>
              <a
                href={`/api/room-entries/export?week=${formatDateParam(start)}`}
                className="rounded-md bg-emerald-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-emerald-500"
              >
                ייצוא לאקסל
              </a>
            </div>

            <div className="divide-y divide-slate-100 rounded-lg border border-slate-200 bg-white shadow-sm">
              {entries.length === 0 ? (
                <p className="p-6 text-center text-slate-500">
                  אין כניסות רשומות בשבוע זה
                </p>
              ) : (
                entries.map((entry) => (
                  <div
                    key={entry.id}
                    className="flex items-center justify-between gap-4 p-4"
                  >
                    <div>
                      <div className="font-medium">{entry.room.name}</div>
                      <div className="text-sm text-slate-500" dir="ltr">
                        {entry.phone}
                      </div>
                      <div className="mt-1 flex flex-wrap gap-3 text-xs">
                        <span
                          className={
                            entry.roomClean ? "text-emerald-600" : "text-red-500"
                          }
                        >
                          {entry.roomClean ? "✓ חדר נקי" : "✗ חדר לא נקי"}
                        </span>
                        <span
                          className={
                            entry.acWorking ? "text-emerald-600" : "text-red-500"
                          }
                        >
                          {entry.acWorking ? "✓ מזגן תקין" : "✗ מזגן לא תקין"}
                        </span>
                      </div>
                      {entry.notes && (
                        <div className="mt-1 text-xs text-slate-500">
                          הערות: {entry.notes}
                        </div>
                      )}
                    </div>
                    <div className="whitespace-nowrap text-xs text-slate-400">
                      {formatDateTime(entry.enteredAt)}
                    </div>
                  </div>
                ))
              )}
            </div>
          </>
        ) : (
          <p className="rounded-lg border border-slate-200 bg-white p-6 text-center text-sm text-slate-500">
            הטבלה זמינה למנהלים בלבד.{" "}
            <Link href="/login" className="text-emerald-600 hover:underline">
              התחברות
            </Link>
          </p>
        )}
      </div>
    </div>
  );
}
