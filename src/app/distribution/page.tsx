import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { deleteDistributionRecord } from "@/app/actions";
import { isViewer } from "@/lib/role";
import { formatDateTime } from "@/lib/labels";
import { AddDistributionForm } from "./AddDistributionForm";

function formatQty(qty: number): string {
  return Number.isInteger(qty) ? String(qty) : qty.toFixed(2);
}

export default async function DistributionPage() {
  const [items, records, viewer] = await Promise.all([
    prisma.distributionItem.findMany({ orderBy: { order: "asc" } }),
    prisma.distributionRecord.findMany({
      include: { item: true },
      orderBy: { createdAt: "desc" },
    }),
    isViewer(),
  ]);

  const activeItems = items.filter((item) => item.active);

  const byRecipient = new Map<string, Map<string, number>>();
  const totalByItem = new Map<string, number>();
  let grandTotal = 0;

  for (const record of records) {
    const recipientTotals = byRecipient.get(record.recipient) ?? new Map();
    recipientTotals.set(
      record.itemId,
      (recipientTotals.get(record.itemId) ?? 0) + record.quantity,
    );
    byRecipient.set(record.recipient, recipientTotals);
    totalByItem.set(
      record.itemId,
      (totalByItem.get(record.itemId) ?? 0) + record.quantity,
    );
    grandTotal += record.quantity;
  }

  const columns = items.filter((item) => totalByItem.has(item.id));
  const recipients = [...byRecipient.keys()].sort((a, b) =>
    a.localeCompare(b, "he"),
  );
  const recipientRowTotals = new Map<string, number>(
    recipients.map((recipient) => [
      recipient,
      [...(byRecipient.get(recipient)?.values() ?? [])].reduce(
        (sum, v) => sum + v,
        0,
      ),
    ]),
  );

  const recentRecords = records.slice(0, 30);

  return (
    <div className="mx-auto max-w-5xl w-full px-4 py-6 space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h1 className="text-xl font-bold">חלוקת ציוד - מעקב והזנה</h1>
        {!viewer && (
          <Link
            href="/distribution/items"
            className="rounded-md border border-slate-300 px-3 py-1.5 text-sm hover:bg-slate-50"
          >
            ניהול פריטים
          </Link>
        )}
      </div>

      <div className="flex flex-wrap gap-3 text-sm">
        <span className="rounded-full border border-slate-200 bg-white px-3 py-1.5 shadow-sm">
          סה&quot;כ יחידות שחולקו: <b>{formatQty(grandTotal)}</b>
        </span>
        <span className="rounded-full border border-slate-200 bg-white px-3 py-1.5 shadow-sm">
          מקבלים: <b>{recipients.length}</b>
        </span>
        <span className="rounded-full border border-slate-200 bg-white px-3 py-1.5 shadow-sm">
          פריטים פעילים: <b>{activeItems.length}</b>
        </span>
      </div>

      <section className="space-y-2">
        <h2 className="font-bold text-slate-800">
          היסטוריה - מה לקחו ומי לקח
        </h2>
        {recipients.length === 0 ? (
          <p className="rounded-lg border border-slate-200 bg-white p-6 text-center text-slate-500 shadow-sm">
            עדיין לא נרשמו מסירות
          </p>
        ) : (
          <div className="overflow-x-auto rounded-lg border border-slate-200 bg-white shadow-sm">
            <table className="w-full min-w-max text-sm">
              <thead>
                <tr className="border-b border-slate-200 bg-slate-50">
                  <th className="p-2 text-right font-medium text-slate-600">
                    מקבל
                  </th>
                  {columns.map((item) => (
                    <th
                      key={item.id}
                      className="p-2 text-center font-medium text-slate-600"
                    >
                      {item.name}
                      {item.unit ? ` (${item.unit})` : ""}
                    </th>
                  ))}
                  <th className="p-2 text-center font-bold text-slate-700">
                    סה&quot;כ
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {recipients.map((recipient) => (
                  <tr key={recipient}>
                    <td className="p-2 font-medium">{recipient}</td>
                    {columns.map((item) => {
                      const qty = byRecipient.get(recipient)?.get(item.id) ?? 0;
                      return (
                        <td
                          key={item.id}
                          className="p-2 text-center text-slate-600"
                        >
                          {qty > 0 ? formatQty(qty) : "—"}
                        </td>
                      );
                    })}
                    <td className="p-2 text-center font-bold">
                      {formatQty(recipientRowTotals.get(recipient) ?? 0)}
                    </td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr className="border-t border-slate-200 bg-slate-50 font-bold">
                  <td className="p-2">סה&quot;כ</td>
                  {columns.map((item) => (
                    <td key={item.id} className="p-2 text-center">
                      {formatQty(totalByItem.get(item.id) ?? 0)}
                    </td>
                  ))}
                  <td className="p-2 text-center">{formatQty(grandTotal)}</td>
                </tr>
              </tfoot>
            </table>
          </div>
        )}
      </section>

      {!viewer && (
        <section className="space-y-2">
          <h2 className="font-bold text-slate-800">הזנת חלוקה חדשה</h2>
          {activeItems.length === 0 ? (
            <p className="rounded-lg border border-slate-200 bg-white p-4 text-sm text-slate-500 shadow-sm">
              יש להוסיף פריטים תחילה בעמוד{" "}
              <Link href="/distribution/items" className="underline">
                ניהול פריטים
              </Link>
              .
            </p>
          ) : (
            <>
              <AddDistributionForm items={activeItems} />
              <datalist id="distribution-recipients">
                {recipients.map((recipient) => (
                  <option key={recipient} value={recipient} />
                ))}
              </datalist>
            </>
          )}
        </section>
      )}

      <section className="space-y-2">
        <h2 className="font-bold text-slate-800">יומן מסירות אחרון</h2>
        <div className="rounded-lg border border-slate-200 bg-white shadow-sm divide-y divide-slate-100">
          {recentRecords.length === 0 ? (
            <p className="p-6 text-center text-slate-500">אין רשומות עדיין</p>
          ) : (
            recentRecords.map((record) => (
              <div
                key={record.id}
                className="flex flex-wrap items-center justify-between gap-2 p-3"
              >
                <div>
                  <div className="font-medium">
                    {record.recipient} לקח/ה {formatQty(record.quantity)}{" "}
                    {record.item.name}
                    {record.item.unit ? ` (${record.item.unit})` : ""}
                  </div>
                  <div className="text-xs text-slate-400">
                    {formatDateTime(record.createdAt)}
                    {record.note ? ` · ${record.note}` : ""}
                  </div>
                </div>
                {!viewer && (
                  <form action={deleteDistributionRecord.bind(null, record.id)}>
                    <button
                      type="submit"
                      className="rounded-md border border-red-300 px-3 py-1.5 text-sm text-red-700 hover:bg-red-50"
                    >
                      מחיקה
                    </button>
                  </form>
                )}
              </div>
            ))
          )}
        </div>
      </section>
    </div>
  );
}
