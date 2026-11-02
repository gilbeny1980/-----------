import { formatRelativeTime } from "@/lib/labels";
import { fetchCurrentAssignments } from "@/lib/galamTv";

export async function WorkerAssignmentsSection() {
  const summary = await fetchCurrentAssignments();

  return (
    <section className="mx-4 mt-4 rounded-xl border border-slate-800 bg-slate-900 p-4">
      <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
        <h2 className="flex items-center gap-2 text-lg font-bold text-amber-300">
          <span>👷</span> שיבוצים נוכחים - מחלקת חשמל
        </h2>
        {summary && (
          <span className="rounded-full border border-amber-800 bg-amber-950/60 px-3 py-1 text-sm font-bold text-amber-300">
            {summary.remaining} נותרו
          </span>
        )}
      </div>

      {!summary ? (
        <p className="text-sm text-slate-400">טרם התקבל עדכון ממערכת השיבוצים.</p>
      ) : summary.rows.length === 0 ? (
        <p className="text-sm text-slate-400">אין שיבוצים במעקב</p>
      ) : (
        <>
          <div className="max-h-64 overflow-y-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-right text-xs text-slate-500">
                  <th className="pb-2">עובד משובץ</th>
                  <th className="pb-2">נותרו</th>
                  <th className="pb-2">הושלמו</th>
                </tr>
              </thead>
              <tbody>
                {summary.rows.map((w) => (
                  <tr
                    key={w.id}
                    className="border-t border-slate-800 text-slate-200"
                  >
                    <td className="py-2 font-medium">{w.name}</td>
                    <td className="py-2 font-bold text-amber-300">
                      {w.remaining}
                    </td>
                    <td className="py-2 text-emerald-400">{w.done}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <p className="mt-2 text-xs text-slate-500">
            עודכן {formatRelativeTime(new Date(summary.lastSampleAt))}
          </p>
        </>
      )}
    </section>
  );
}
