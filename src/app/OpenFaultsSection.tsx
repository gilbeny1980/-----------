import { prisma } from "@/lib/prisma";
import { formatRelativeTime } from "@/lib/labels";
import { isSnapshotStale, type ServiceCall } from "@/lib/openFaults";

export async function OpenFaultsSection() {
  const snapshot = await prisma.openFaultsSnapshot.findUnique({
    where: { id: "singleton" },
  });
  const isStale = snapshot ? isSnapshotStale(snapshot.updatedAt) : false;

  return (
    <section className="mx-4 mt-4 rounded-xl border border-slate-800 bg-slate-900 p-4">
      <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
        <h2 className="flex items-center gap-2 text-lg font-bold text-red-300">
          <span>⚠️</span> תקלות פתוחות - מחלקת חשמל
        </h2>
        {snapshot && (
          <div className="flex items-center gap-2">
            {isStale && (
              <span className="rounded-full border border-amber-700 bg-amber-950/60 px-2 py-0.5 text-xs text-amber-300">
                נתונים לא מעודכנים
              </span>
            )}
            <span className="rounded-full border border-red-800 bg-red-950/60 px-3 py-1 text-sm font-bold text-red-300">
              {snapshot.count} פתוחות
            </span>
          </div>
        )}
      </div>

      {!snapshot ? (
        <p className="text-sm text-slate-400">טרם התקבל עדכון ממערכת התקלות.</p>
      ) : (
        <>
          {(() => {
            const faults: ServiceCall[] = JSON.parse(snapshot.faults);
            if (faults.length === 0) {
              return <p className="text-sm text-slate-400">אין תקלות פתוחות</p>;
            }
            return (
              <div className="max-h-64 space-y-2 overflow-y-auto">
                {faults.map((f) => (
                  <div
                    key={f.DOCNO}
                    className="rounded-lg border border-slate-800 bg-slate-800/60 p-2 text-sm"
                  >
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <span className="font-bold text-slate-200">{f.PARTNAME}</span>
                      <span className="text-xs text-slate-500" dir="ltr">
                        {f.DOCNO}
                      </span>
                    </div>
                    {f.PARTDES && (
                      <div className="text-xs text-slate-400">{f.PARTDES}</div>
                    )}
                  </div>
                ))}
              </div>
            );
          })()}
          <p className="mt-2 text-xs text-slate-500">
            עודכן {formatRelativeTime(snapshot.updatedAt)}
          </p>
        </>
      )}
    </section>
  );
}
