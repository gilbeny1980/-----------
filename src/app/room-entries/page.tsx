import { prisma } from "@/lib/prisma";
import { formatDateTime } from "@/lib/labels";

function getMonthRange(month: string): { start: Date; end: Date } {
  const [yearStr, monthStr] = month.split("-");
  const year = Number(yearStr);
  const monthIndex = Number(monthStr) - 1;
  const start = new Date(year, monthIndex, 1);
  const end = new Date(year, monthIndex + 1, 1);
  return { start, end };
}

function currentMonth(): string {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
}

export default async function RoomEntriesPage({
  searchParams,
}: {
  searchParams: Promise<{ month?: string }>;
}) {
  const { month: monthParam } = await searchParams;
  const month = monthParam || currentMonth();
  const { start, end } = getMonthRange(month);

  const entries = await prisma.roomEntry.findMany({
    where: { enteredAt: { gte: start, lt: end } },
    orderBy: { enteredAt: "desc" },
    include: { room: true },
  });

  return (
    <div className="mx-auto max-w-2xl w-full px-4 py-6 space-y-6">
      <h1 className="text-xl font-bold">כניסות לחדרי חשמל</h1>
      <p className="text-sm text-slate-500">
        יומן כניסות לפי סריקת QR בדלת כל חדר חשמל - מי נכנס, מתי ולאיזה חדר.
      </p>

      <form className="flex items-center gap-2">
        <input
          type="month"
          name="month"
          defaultValue={month}
          className="input"
        />
        <button
          type="submit"
          className="rounded-md border border-slate-300 px-3 py-1.5 text-sm hover:bg-slate-50"
        >
          סינון
        </button>
      </form>

      <div className="rounded-lg border border-slate-200 bg-white shadow-sm divide-y divide-slate-100">
        {entries.length === 0 ? (
          <p className="p-6 text-center text-slate-500">אין כניסות רשומות בחודש זה</p>
        ) : (
          entries.map((entry) => (
            <div key={entry.id} className="flex items-center justify-between p-4">
              <div>
                <div className="font-medium">{entry.room.name}</div>
                <div className="text-sm text-slate-500" dir="ltr">
                  {entry.phone}
                </div>
              </div>
              <div className="text-xs text-slate-400">
                {formatDateTime(entry.enteredAt)}
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
