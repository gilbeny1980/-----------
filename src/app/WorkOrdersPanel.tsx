import {
  WORK_ORDER_STATUS_BADGE_CLASSES,
  WORK_ORDER_STATUS_LABELS,
} from "@/lib/labels";

type WorkOrder = {
  id: string;
  title: string;
  description: string | null;
  status: "OPEN" | "IN_PROGRESS" | "DONE";
  electrician: { name: string } | null;
  equipmentIssued: string | null;
};

export function WorkOrdersPanel({ workOrders }: { workOrders: WorkOrder[] }) {
  return (
    <div className="flex-1 space-y-3 overflow-y-auto">
      {workOrders.length === 0 ? (
        <p className="text-sm text-slate-400">אין משימות פתוחות</p>
      ) : (
        workOrders.map((wo) => (
          <div
            key={wo.id}
            className="flex items-center justify-between rounded-lg bg-slate-800/60 p-3"
          >
            <div>
              <div className="flex items-center gap-2">
                <span className="font-medium">{wo.title}</span>
                <span
                  className={`rounded-full border px-2 py-0.5 text-xs font-medium ${WORK_ORDER_STATUS_BADGE_CLASSES[wo.status]}`}
                >
                  {WORK_ORDER_STATUS_LABELS[wo.status]}
                </span>
              </div>
              {wo.description && (
                <div className="text-sm text-slate-300">{wo.description}</div>
              )}
              <div className="text-xs text-slate-400">
                {wo.electrician?.name ?? "ללא שיוך"}
                {wo.equipmentIssued && ` · ציוד: ${wo.equipmentIssued}`}
              </div>
            </div>
          </div>
        ))
      )}
    </div>
  );
}
