import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { formatDateTime } from "@/lib/labels";
import { updateRoomEntry, deleteRoomEntry } from "@/app/actions";

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

export default async function ManageRoomEntriesPage({
  searchParams,
}: {
  searchParams: Promise<{ week?: string }>;
}) {
  const { week } = await searchParams;
  const anchor = week ? new Date(`${week}T00:00:00`) : new Date();
  const { start, end } = getWeekRange(anchor);

  const entries = await prisma.roomEntry.findMany({
    where: { enteredAt: { gte: start, lt: end } },
    orderBy: { enteredAt: "desc" },
    include: { room: true },
  });

  const prevWeek = new Date(start);
  prevWeek.setDate(prevWeek.getDate() - 7);
  const nextWeek = new Date(start);
  nextWeek.setDate(nextWeek.getDate() + 7);

  return (
    <div className="mx-auto max-w-2xl w-full space-y-6 px-4 py-6">
      <h1 className="text-xl font-bold">ניהול חדרי חשמל</h1>
      <p className="text-sm text-slate-500">
        עריכה ותיקון של הכניסות שנרשמו בסריקת QR - טלפון, מצב החדר והמזגן,
        והערות.
      </p>

      <div className="flex flex-wrap items-center gap-2 text-sm">
        <Link
          href={`/room-entries/manage?week=${formatDateParam(prevWeek)}`}
          className="rounded-md border border-slate-300 px-3 py-1.5 hover:bg-slate-50"
        >
          שבוע קודם
        </Link>
        <span className="text-slate-500">{formatWeekLabel(start, end)}</span>
        <Link
          href={`/room-entries/manage?week=${formatDateParam(nextWeek)}`}
          className="rounded-md border border-slate-300 px-3 py-1.5 hover:bg-slate-50"
        >
          שבוע הבא
        </Link>
      </div>

      {entries.length === 0 ? (
        <p className="rounded-lg border border-slate-200 bg-white p-6 text-center text-slate-500">
          אין כניסות רשומות בשבוע זה
        </p>
      ) : (
        <div className="space-y-4">
          {entries.map((entry) => {
            const updateWithId = updateRoomEntry.bind(null, entry.id);
            const deleteWithId = deleteRoomEntry.bind(null, entry.id);
            return (
              <form
                key={entry.id}
                action={updateWithId}
                className="space-y-3 rounded-lg border border-slate-200 bg-white p-4 shadow-sm"
              >
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div className="font-bold">{entry.room.name}</div>
                  <div className="text-xs text-slate-400">
                    {formatDateTime(entry.enteredAt)}
                  </div>
                </div>

                <label className="block">
                  <span className="mb-1 block text-xs font-medium text-slate-500">
                    טלפון
                  </span>
                  <input
                    name="phone"
                    dir="ltr"
                    defaultValue={entry.phone}
                    className="input w-full"
                  />
                </label>

                <div className="flex flex-wrap gap-4">
                  <label className="flex items-center gap-2 text-sm">
                    <input
                      type="checkbox"
                      name="roomClean"
                      defaultChecked={entry.roomClean}
                      className="h-4 w-4"
                    />
                    החדר נקי
                  </label>
                  <label className="flex items-center gap-2 text-sm">
                    <input
                      type="checkbox"
                      name="acWorking"
                      defaultChecked={entry.acWorking}
                      className="h-4 w-4"
                    />
                    המזגן עובד
                  </label>
                </div>

                <label className="block">
                  <span className="mb-1 block text-xs font-medium text-slate-500">
                    הערות
                  </span>
                  <textarea
                    name="notes"
                    rows={2}
                    defaultValue={entry.notes ?? ""}
                    className="input w-full resize-none"
                  />
                </label>

                <div className="flex gap-2">
                  <button
                    type="submit"
                    className="rounded-md bg-slate-900 px-3 py-1.5 text-sm font-medium text-white hover:bg-slate-800"
                  >
                    שמירה
                  </button>
                  <button
                    type="submit"
                    formAction={deleteWithId}
                    className="rounded-md border border-red-300 px-3 py-1.5 text-sm text-red-700 hover:bg-red-50"
                  >
                    מחיקה
                  </button>
                </div>
              </form>
            );
          })}
        </div>
      )}
    </div>
  );
}
