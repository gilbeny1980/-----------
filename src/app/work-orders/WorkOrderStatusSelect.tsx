"use client";

import { updateWorkOrderStatus } from "@/app/actions";
import { WORK_ORDER_STATUS_LABELS, WORK_ORDER_STATUS_ORDER } from "@/lib/labels";
import type { WorkOrderStatus } from "@/generated/prisma/enums";

export function WorkOrderStatusSelect({
  workOrderId,
  status,
}: {
  workOrderId: string;
  status: WorkOrderStatus;
}) {
  return (
    <select
      className="input"
      defaultValue={status}
      onChange={(e) => {
        updateWorkOrderStatus(workOrderId, e.target.value as WorkOrderStatus);
      }}
    >
      {WORK_ORDER_STATUS_ORDER.map((s) => (
        <option key={s} value={s}>
          {WORK_ORDER_STATUS_LABELS[s]}
        </option>
      ))}
    </select>
  );
}
