import { prisma } from "@/lib/prisma";
import { deleteTransformer, updateTransformerReading } from "@/app/actions";
import { isViewer } from "@/lib/role";
import { formatDateTime } from "@/lib/labels";
import { AddTransformerForm } from "./AddTransformerForm";

export default async function TransformersPage() {
  const [transformers, viewer] = await Promise.all([
    prisma.transformer.findMany({ orderBy: { order: "asc" } }),
    isViewer(),
  ]);

  return (
    <div className="mx-auto max-w-2xl w-full px-4 py-6 space-y-6">
      <h1 className="text-xl font-bold">שנאים - ביקוש הספק ומקדם הספק</h1>
      <p className="text-sm text-slate-500">
        עדכן כאן את הקריאות מהמערכת החיצונית (eXpert PowerPlus) - הן יוצגו במסך
        התצוגה.
      </p>

      {!viewer && <AddTransformerForm />}

      <div className="rounded-lg border border-slate-200 bg-white shadow-sm divide-y divide-slate-100">
        {transformers.length === 0 ? (
          <p className="p-6 text-center text-slate-500">אין שנאים רשומים</p>
        ) : (
          transformers.map((t) => {
            const updateWithId = updateTransformerReading.bind(null, t.id);
            const deleteWithId = deleteTransformer.bind(null, t.id);
            return (
              <form
                key={t.id}
                action={updateWithId}
                className="flex flex-wrap items-end gap-3 p-4"
              >
                <div className="min-w-[4rem] font-bold">{t.name}</div>
                <label className="flex-1 min-w-[8rem]">
                  <span className="mb-1 block text-xs font-medium text-slate-500">
                    ביקוש הספק אקטיבי (KW)
                  </span>
                  <input
                    type="number"
                    step="0.01"
                    name="activePowerKw"
                    className="input"
                    defaultValue={t.activePowerKw ?? ""}
                    disabled={viewer}
                  />
                </label>
                <label className="flex-1 min-w-[8rem]">
                  <span className="mb-1 block text-xs font-medium text-slate-500">
                    מקדם הספק
                  </span>
                  <input
                    type="number"
                    step="0.01"
                    name="powerFactor"
                    className="input"
                    defaultValue={t.powerFactor ?? ""}
                    disabled={viewer}
                  />
                </label>
                <div className="text-xs text-slate-400 min-w-[8rem]">
                  עודכן: {formatDateTime(t.updatedAt)}
                </div>
                {!viewer && (
                  <div className="flex gap-2">
                    <button
                      type="submit"
                      className="rounded-md bg-slate-900 px-3 py-1.5 text-sm font-medium text-white hover:bg-slate-800"
                    >
                      עדכון
                    </button>
                    <button
                      type="submit"
                      formAction={deleteWithId}
                      className="rounded-md border border-red-300 px-3 py-1.5 text-sm text-red-700 hover:bg-red-50"
                    >
                      מחיקה
                    </button>
                  </div>
                )}
              </form>
            );
          })
        )}
      </div>
    </div>
  );
}
