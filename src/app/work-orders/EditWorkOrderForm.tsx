"use client";

import { updateWorkOrder } from "@/app/actions";

type Electrician = { id: string; name: string };

export function EditWorkOrderForm({
  workOrderId,
  title,
  electricianId,
  electricians,
}: {
  workOrderId: string;
  title: string;
  electricianId: string | null;
  electricians: Electrician[];
}) {
  return (
    <form
      action={updateWorkOrder.bind(null, workOrderId)}
      className="flex flex-wrap items-end gap-2"
    >
      <input
        name="title"
        required
        defaultValue={title}
        list="work-order-title-suggestions"
        className="input flex-1 min-w-[10rem] font-medium"
      />
      <select
        name="electricianId"
        className="input flex-1 min-w-[8rem]"
        defaultValue={electricianId ?? ""}
      >
        <option value="">ללא שיוך</option>
        {electricians.map((e) => (
          <option key={e.id} value={e.id}>
            {e.name}
          </option>
        ))}
      </select>
      <button
        type="submit"
        className="rounded-md border border-slate-300 px-3 py-1.5 text-sm hover:bg-slate-50"
      >
        שמירה
      </button>
    </form>
  );
}
