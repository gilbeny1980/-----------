import { prisma } from "@/lib/prisma";
import { getPowerParts } from "@/lib/labels";

export const dynamic = "force-dynamic";

export default async function TransformersStatusPage() {
  const transformers = await prisma.transformer.findMany({
    orderBy: { order: "asc" },
  });

  const totalPowerKw = transformers.reduce(
    (sum, t) => sum + (t.activePowerKw ?? 0),
    0,
  );
  const totalPowerParts = getPowerParts(totalPowerKw);

  return (
    <div className="flex-1 bg-slate-950 p-4 text-white">
      <section className="mx-auto max-w-5xl rounded-xl border border-slate-800 bg-slate-900 p-4">
        <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
          <h1 className="flex items-center gap-2 text-lg font-bold text-emerald-300">
            <span>⚡</span> שנאים - ביקוש הספק ומקדם הספק
          </h1>
          <span className="flex items-baseline gap-1.5 rounded-full border border-emerald-800 bg-emerald-950/60 px-3 py-1 text-sm font-bold text-emerald-300">
            <span>סה&quot;כ:</span>
            <span className="text-xs font-normal text-emerald-400">
              {totalPowerParts.unit}
            </span>
            <span>{totalPowerParts.value}</span>
          </span>
        </div>

        {transformers.length === 0 ? (
          <p className="p-6 text-center text-slate-400">אין שנאים רשומים</p>
        ) : (
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
            {transformers.map((t) => (
              <div
                key={t.id}
                className="rounded-lg border border-slate-800 bg-slate-800/60 p-3 text-center"
              >
                <div className="text-sm font-bold text-slate-300">{t.name}</div>
                <div className="mt-1 flex items-baseline justify-center gap-1">
                  <span className="text-xs font-normal text-slate-400">kW</span>
                  <span className="text-xl font-bold text-emerald-300">
                    {t.activePowerKw !== null
                      ? Math.round(t.activePowerKw * 10) / 10
                      : "—"}
                  </span>
                </div>
                <div className="text-xs text-slate-400">
                  מקדם הספק:{" "}
                  {t.powerFactor !== null
                    ? Math.round(t.powerFactor * 100) / 100
                    : "—"}
                </div>
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
