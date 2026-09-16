import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { deleteElectrician, toggleElectricianActive } from "@/app/actions";
import { AddElectricianForm } from "./AddElectricianForm";

function formatBirthDate(date: Date | null): string | null {
  if (!date) return null;
  return new Intl.DateTimeFormat("he-IL", {
    day: "2-digit",
    month: "2-digit",
  }).format(date);
}

export default async function ElectriciansPage() {
  const electricians = await prisma.electrician.findMany({
    orderBy: [{ active: "desc" }, { name: "asc" }],
    include: { _count: { select: { tasks: true } } },
  });

  return (
    <div className="mx-auto max-w-2xl w-full px-4 py-6 space-y-6">
      <h1 className="text-xl font-bold">חשמלאים</h1>

      <AddElectricianForm />

      <div className="rounded-lg border border-slate-200 bg-white shadow-sm divide-y divide-slate-100">
        {electricians.length === 0 ? (
          <p className="p-6 text-center text-slate-500">אין חשמלאים רשומים</p>
        ) : (
          electricians.map((e) => (
            <div key={e.id} className="flex items-center justify-between p-4">
              <div>
                <div className="font-medium">
                  <Link href={`/electricians/${e.id}`} className="hover:text-blue-600">
                    {e.name}
                  </Link>{" "}
                  {!e.active && (
                    <span className="text-xs text-slate-400">(לא פעיל)</span>
                  )}
                </div>
                <div className="text-sm text-slate-500">
                  {e.phone ?? "—"} · {e._count.tasks} משימות
                  {formatBirthDate(e.birthDate) && (
                    <> · יום הולדת: {formatBirthDate(e.birthDate)}</>
                  )}
                </div>
              </div>
              <div className="flex gap-2">
                <Link
                  href={`/electricians/${e.id}`}
                  className="rounded-md border border-slate-300 px-3 py-1.5 text-sm hover:bg-slate-50"
                >
                  עריכה
                </Link>
                <form
                  action={toggleElectricianActive.bind(null, e.id, !e.active)}
                >
                  <button
                    type="submit"
                    className="rounded-md border border-slate-300 px-3 py-1.5 text-sm hover:bg-slate-50"
                  >
                    {e.active ? "השבתה" : "הפעלה"}
                  </button>
                </form>
                <form action={deleteElectrician.bind(null, e.id)}>
                  <button
                    type="submit"
                    className="rounded-md border border-red-300 px-3 py-1.5 text-sm text-red-700 hover:bg-red-50"
                  >
                    מחיקה
                  </button>
                </form>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
