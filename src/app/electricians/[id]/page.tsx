import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import {
  deleteElectrician,
  toggleElectricianActive,
  updateElectrician,
} from "@/app/actions";
import { formatDateTime } from "@/lib/labels";

export default async function ElectricianDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  const electrician = await prisma.electrician.findUnique({
    where: { id },
    include: { _count: { select: { tasks: true } } },
  });

  if (!electrician) {
    notFound();
  }

  const updateElectricianWithId = updateElectrician.bind(null, electrician.id);
  const deleteElectricianWithId = deleteElectrician.bind(null, electrician.id);
  const toggleActiveWithId = toggleElectricianActive.bind(
    null,
    electrician.id,
    !electrician.active,
  );

  return (
    <div className="mx-auto max-w-2xl w-full px-4 py-6 space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold">עריכת חשמלאי</h1>
        <div className="text-xs text-slate-400">
          נרשם: {formatDateTime(electrician.createdAt)} · {electrician._count.tasks}{" "}
          משימות
        </div>
      </div>

      <form
        action={updateElectricianWithId}
        className="space-y-4 rounded-lg border border-slate-200 bg-white p-6 shadow-sm"
      >
        <label className="block">
          <span className="mb-1 block text-sm font-medium text-slate-700">
            שם *
          </span>
          <input
            name="name"
            required
            className="input"
            defaultValue={electrician.name}
          />
        </label>

        <label className="block">
          <span className="mb-1 block text-sm font-medium text-slate-700">
            טלפון
          </span>
          <input
            name="phone"
            dir="ltr"
            className="input"
            defaultValue={electrician.phone ?? ""}
          />
        </label>

        <label className="block">
          <span className="mb-1 block text-sm font-medium text-slate-700">
            תאריך לידה
          </span>
          <input
            type="date"
            name="birthDate"
            className="input"
            defaultValue={
              electrician.birthDate
                ? electrician.birthDate.toISOString().slice(0, 10)
                : ""
            }
          />
        </label>

        <button
          type="submit"
          className="w-full rounded-md bg-slate-900 px-4 py-2 font-medium text-white hover:bg-slate-800"
        >
          שמירת שינויים
        </button>
      </form>

      <form action={toggleActiveWithId}>
        <button
          type="submit"
          className="w-full rounded-md border border-slate-300 px-4 py-2 font-medium hover:bg-slate-50"
        >
          {electrician.active ? "השבתה" : "הפעלה"}
        </button>
      </form>

      <form action={deleteElectricianWithId}>
        <button
          type="submit"
          className="w-full rounded-md border border-red-300 px-4 py-2 font-medium text-red-700 hover:bg-red-50"
        >
          מחיקת חשמלאי
        </button>
      </form>
    </div>
  );
}
