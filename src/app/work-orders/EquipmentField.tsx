"use client";

import { updateWorkOrderEquipment } from "@/app/actions";

export function EquipmentField({
  workOrderId,
  equipmentIssued,
}: {
  workOrderId: string;
  equipmentIssued: string | null;
}) {
  return (
    <form
      action={updateWorkOrderEquipment.bind(null, workOrderId)}
      className="flex items-center gap-2"
    >
      <input
        name="equipmentIssued"
        defaultValue={equipmentIssued ?? ""}
        className="input"
        placeholder="ציוד שנופק מהמחסן"
      />
      <button
        type="submit"
        className="rounded-md border border-slate-300 px-3 py-1.5 text-sm hover:bg-slate-50"
      >
        שמירה
      </button>
    </form>
  );
}
