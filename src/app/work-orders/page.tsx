import { prisma } from "@/lib/prisma";
import { deleteWorkOrder } from "@/app/actions";
import { formatDateTime } from "@/lib/labels";
import { AddWorkOrderForm } from "./AddWorkOrderForm";
import { WorkOrderStatusSelect } from "./WorkOrderStatusSelect";
import { EquipmentField } from "./EquipmentField";
import { EditWorkOrderForm } from "./EditWorkOrderForm";

export default async function WorkOrdersPage() {
  const [workOrders, electricians] = await Promise.all([
    prisma.workOrder.findMany({
      orderBy: { createdAt: "desc" },
      include: { electrician: true },
    }),
    prisma.electrician.findMany({
      where: { active: true },
      orderBy: { name: "asc" },
    }),
  ]);

  return (
    <div className="mx-auto max-w-2xl w-full px-4 py-6 space-y-6">
      <h1 className="text-xl font-bold">משימות</h1>
      <p className="text-sm text-slate-500">
        משימות עבודה (לדוגמה השבה, הדממה) המשויכות לעובד וסטטוס. משימות פתוחות
        מוצגות במסך התצוגה.
      </p>

      <AddWorkOrderForm electricians={electricians} />

      <div className="rounded-lg border border-slate-200 bg-white shadow-sm divide-y divide-slate-100">
        {workOrders.length === 0 ? (
          <p className="p-6 text-center text-slate-500">אין משימות רשומות</p>
        ) : (
          workOrders.map((wo) => (
            <div key={wo.id} className="space-y-2 p-4">
              <EditWorkOrderForm
                workOrderId={wo.id}
                title={wo.title}
                description={wo.description}
                electricianId={wo.electricianId}
                electricians={electricians}
              />
              <div className="text-xs text-slate-400">
                נוצר: {formatDateTime(wo.createdAt)}
              </div>
              <div className="flex flex-wrap items-center gap-2">
                <EquipmentField
                  workOrderId={wo.id}
                  equipmentIssued={wo.equipmentIssued}
                />
                <WorkOrderStatusSelect workOrderId={wo.id} status={wo.status} />
                <form action={deleteWorkOrder.bind(null, wo.id)}>
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
