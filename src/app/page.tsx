import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { TaskPriority, TaskStatus } from "@/generated/prisma/enums";
import {
  PRIORITY_BADGE_CLASSES,
  PRIORITY_LABELS,
  STATUS_BADGE_CLASSES,
  STATUS_LABELS,
  STATUS_ORDER,
  formatDate,
} from "@/lib/labels";

export const dynamic = "force-dynamic";

type SearchParams = {
  status?: string;
  priority?: string;
  electricianId?: string;
};

function isStatus(value: string | undefined): value is TaskStatus {
  return !!value && (Object.values(TaskStatus) as string[]).includes(value);
}

function isPriority(value: string | undefined): value is TaskPriority {
  return !!value && (Object.values(TaskPriority) as string[]).includes(value);
}

export default async function DashboardPage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>;
}) {
  const params = await searchParams;

  const where: Record<string, unknown> = {};
  if (isStatus(params.status)) where.status = params.status;
  if (isPriority(params.priority)) where.priority = params.priority;
  if (params.electricianId === "none") {
    where.electricianId = null;
  } else if (params.electricianId) {
    where.electricianId = params.electricianId;
  }

  const [tasks, electricians, counts] = await Promise.all([
    prisma.task.findMany({
      where,
      include: { electrician: true },
      orderBy: [{ createdAt: "desc" }],
    }),
    prisma.electrician.findMany({
      where: { active: true },
      orderBy: { name: "asc" },
    }),
    prisma.task.groupBy({
      by: ["status"],
      _count: { _all: true },
    }),
  ]);

  const countByStatus: Record<string, number> = {};
  for (const row of counts) {
    countByStatus[row.status] = row._count._all;
  }
  const openUrgent = await prisma.task.count({
    where: { priority: "URGENT", status: { notIn: ["DONE", "CANCELLED"] } },
  });

  function buildHref(overrides: Partial<SearchParams>) {
    const next = { ...params, ...overrides };
    const qs = new URLSearchParams();
    if (next.status) qs.set("status", next.status);
    if (next.priority) qs.set("priority", next.priority);
    if (next.electricianId) qs.set("electricianId", next.electricianId);
    const s = qs.toString();
    return s ? `/?${s}` : "/";
  }

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-5">
        {STATUS_ORDER.map((status) => (
          <Link
            key={status}
            href={buildHref({ status: params.status === status ? undefined : status })}
            className={`rounded-lg border p-3 text-center transition-shadow hover:shadow ${
              params.status === status
                ? "ring-2 ring-slate-900"
                : ""
            } ${STATUS_BADGE_CLASSES[status]}`}
          >
            <div className="text-2xl font-bold">{countByStatus[status] ?? 0}</div>
            <div className="text-xs font-medium">{STATUS_LABELS[status]}</div>
          </Link>
        ))}
        <div className="rounded-lg border border-red-300 bg-red-50 p-3 text-center">
          <div className="text-2xl font-bold text-red-700">{openUrgent}</div>
          <div className="text-xs font-medium text-red-700">דחוף ופתוח</div>
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-2 rounded-lg bg-white p-3 shadow-sm border border-slate-200">
        <span className="text-sm font-medium text-slate-500">סינון:</span>
        <FilterSelect
          label="סטטוס"
          paramName="status"
          current={params.status}
          options={STATUS_ORDER.map((s) => ({ value: s, label: STATUS_LABELS[s] }))}
          buildHref={buildHref}
        />
        <FilterSelect
          label="עדיפות"
          paramName="priority"
          current={params.priority}
          options={(["URGENT", "HIGH", "NORMAL", "LOW"] as TaskPriority[]).map(
            (p) => ({ value: p, label: PRIORITY_LABELS[p] }),
          )}
          buildHref={buildHref}
        />
        <FilterSelect
          label="חשמלאי"
          paramName="electricianId"
          current={params.electricianId}
          options={[
            { value: "none", label: "לא משויך" },
            ...electricians.map((e) => ({ value: e.id, label: e.name })),
          ]}
          buildHref={buildHref}
        />
        {(params.status || params.priority || params.electricianId) && (
          <Link href="/" className="text-sm text-slate-500 underline">
            נקה סינון
          </Link>
        )}
      </div>

      <div className="rounded-lg border border-slate-200 bg-white shadow-sm overflow-hidden">
        {tasks.length === 0 ? (
          <p className="p-6 text-center text-slate-500">
            אין משימות להצגה. אפשר{" "}
            <Link href="/tasks/new" className="text-blue-600 underline">
              ליצור משימה חדשה
            </Link>
            .
          </p>
        ) : (
          <table className="w-full text-sm">
            <thead className="bg-slate-100 text-slate-600 text-right">
              <tr>
                <th className="p-3 font-medium">כותרת</th>
                <th className="p-3 font-medium">מיקום</th>
                <th className="p-3 font-medium">עדיפות</th>
                <th className="p-3 font-medium">סטטוס</th>
                <th className="p-3 font-medium">חשמלאי</th>
                <th className="p-3 font-medium">נפתחה</th>
              </tr>
            </thead>
            <tbody>
              {tasks.map((task) => (
                <tr
                  key={task.id}
                  className="border-t border-slate-100 hover:bg-slate-50"
                >
                  <td className="p-3">
                    <Link
                      href={`/tasks/${task.id}`}
                      className="font-medium text-slate-900 hover:text-blue-600"
                    >
                      {task.title}
                    </Link>
                  </td>
                  <td className="p-3 text-slate-600">{task.location ?? "—"}</td>
                  <td className="p-3">
                    <span
                      className={`rounded-full border px-2 py-0.5 text-xs font-medium ${PRIORITY_BADGE_CLASSES[task.priority]}`}
                    >
                      {PRIORITY_LABELS[task.priority]}
                    </span>
                  </td>
                  <td className="p-3">
                    <span
                      className={`rounded-full border px-2 py-0.5 text-xs font-medium ${STATUS_BADGE_CLASSES[task.status]}`}
                    >
                      {STATUS_LABELS[task.status]}
                    </span>
                  </td>
                  <td className="p-3 text-slate-600">
                    {task.electrician?.name ?? "לא משויך"}
                  </td>
                  <td className="p-3 text-slate-500">{formatDate(task.createdAt)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}

function FilterSelect({
  label,
  paramName,
  current,
  options,
  buildHref,
}: {
  label: string;
  paramName: keyof SearchParams;
  current: string | undefined;
  options: { value: string; label: string }[];
  buildHref: (overrides: Partial<SearchParams>) => string;
}) {
  return (
    <details className="relative">
      <summary className="cursor-pointer list-none rounded-md border border-slate-300 px-3 py-1.5 text-sm hover:bg-slate-50">
        {label}
        {current ? `: ${options.find((o) => o.value === current)?.label ?? current}` : ""}
      </summary>
      <div className="absolute z-10 mt-1 min-w-[10rem] rounded-md border border-slate-200 bg-white p-1 shadow-lg">
        <Link
          href={buildHref({ [paramName]: undefined })}
          className="block rounded px-3 py-1.5 text-sm hover:bg-slate-100"
        >
          הכל
        </Link>
        {options.map((opt) => (
          <Link
            key={opt.value}
            href={buildHref({ [paramName]: opt.value })}
            className={`block rounded px-3 py-1.5 text-sm hover:bg-slate-100 ${
              current === opt.value ? "font-semibold text-blue-600" : ""
            }`}
          >
            {opt.label}
          </Link>
        ))}
      </div>
    </details>
  );
}
