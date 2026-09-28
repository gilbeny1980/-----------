"use client";

import { useRef } from "react";
import { createWorkOrder } from "@/app/actions";

type Electrician = { id: string; name: string };

export function AddWorkOrderForm({
  electricians,
}: {
  electricians: Electrician[];
}) {
  const formRef = useRef<HTMLFormElement>(null);

  return (
    <form
      ref={formRef}
      action={async (formData: FormData) => {
        await createWorkOrder(formData);
        formRef.current?.reset();
      }}
      className="flex flex-wrap items-end gap-2"
    >
      <input
        name="title"
        required
        list="work-order-title-suggestions"
        className="input flex-1 min-w-[10rem]"
        placeholder="כותרת (לדוגמה: השבה, הדממה)"
      />
      <datalist id="work-order-title-suggestions">
        <option value="השבה" />
        <option value="הדממה" />
      </datalist>
      <select name="electricianId" className="input flex-1 min-w-[8rem]" defaultValue="">
        <option value="">ללא שיוך</option>
        {electricians.map((e) => (
          <option key={e.id} value={e.id}>
            {e.name}
          </option>
        ))}
      </select>
      <input
        name="equipmentIssued"
        className="input flex-1 min-w-[10rem]"
        placeholder="ציוד שנופק מהמחסן"
      />
      <button
        type="submit"
        className="rounded-md border border-slate-300 px-3 py-1.5 text-sm hover:bg-slate-50"
      >
        הוספת משימה
      </button>
    </form>
  );
}
