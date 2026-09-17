import Link from "next/link";
import { prisma } from "@/lib/prisma";
import {
  deleteDistributionItem,
  toggleDistributionItemActive,
} from "@/app/actions";
import { isViewer } from "@/lib/role";
import { AddDistributionItemForm } from "./AddDistributionItemForm";

export default async function DistributionItemsPage() {
  const [items, viewer] = await Promise.all([
    prisma.distributionItem.findMany({
      orderBy: [{ active: "desc" }, { order: "asc" }],
      include: { _count: { select: { records: true } } },
    }),
    isViewer(),
  ]);

  return (
    <div className="mx-auto max-w-2xl w-full px-4 py-6 space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h1 className="text-xl font-bold">ניהול פריטי חלוקה</h1>
        <Link
          href="/distribution"
          className="rounded-md border border-slate-300 px-3 py-1.5 text-sm hover:bg-slate-50"
        >
          חזרה לחלוקה
        </Link>
      </div>

      {!viewer && <AddDistributionItemForm />}

      <div className="rounded-lg border border-slate-200 bg-white shadow-sm divide-y divide-slate-100">
        {items.length === 0 ? (
          <p className="p-6 text-center text-slate-500">אין פריטים רשומים</p>
        ) : (
          items.map((item) => (
            <div key={item.id} className="flex items-center justify-between p-4">
              <div>
                <div className="font-medium">
                  {item.name}
                  {item.unit ? ` (${item.unit})` : ""}{" "}
                  {!item.active && (
                    <span className="text-xs text-slate-400">(לא פעיל)</span>
                  )}
                </div>
                <div className="text-sm text-slate-500">
                  {item._count.records} מסירות עד כה
                </div>
              </div>
              {!viewer && (
                <div className="flex gap-2">
                  <form
                    action={toggleDistributionItemActive.bind(
                      null,
                      item.id,
                      !item.active,
                    )}
                  >
                    <button
                      type="submit"
                      className="rounded-md border border-slate-300 px-3 py-1.5 text-sm hover:bg-slate-50"
                    >
                      {item.active ? "השבתה" : "הפעלה"}
                    </button>
                  </form>
                  <form action={deleteDistributionItem.bind(null, item.id)}>
                    <button
                      type="submit"
                      className="rounded-md border border-red-300 px-3 py-1.5 text-sm text-red-700 hover:bg-red-50"
                    >
                      מחיקה
                    </button>
                  </form>
                </div>
              )}
            </div>
          ))
        )}
      </div>
    </div>
  );
}
