import { prisma } from "@/lib/prisma";
import { PRIORITY_BADGE_CLASSES, PRIORITY_LABELS, formatRelativeTime } from "@/lib/labels";
import { ClientClock } from "./ClientClock";

export const dynamic = "force-dynamic";

export default async function DisplayPage() {
  const [urgentTasks, projects, logs, openCount, inProgressCount] =
    await Promise.all([
      prisma.task.findMany({
        where: {
          priority: { in: ["URGENT", "HIGH"] },
          status: { notIn: ["DONE", "CANCELLED"] },
        },
        include: { electrician: true, project: true },
        orderBy: [{ priority: "desc" }, { createdAt: "asc" }],
        take: 10,
      }),
      prisma.project.findMany({
        where: { active: true },
        include: {
          _count: {
            select: {
              tasks: { where: { status: { notIn: ["DONE", "CANCELLED"] } } },
            },
          },
        },
        orderBy: { name: "asc" },
      }),
      prisma.activityLog.findMany({
        orderBy: { createdAt: "desc" },
        take: 15,
      }),
      prisma.task.count({ where: { status: { notIn: ["DONE", "CANCELLED"] } } }),
      prisma.task.count({ where: { status: "IN_PROGRESS" } }),
    ]);

  return (
    <div className="flex-1 flex flex-col bg-slate-950 text-white">
      <meta httpEquiv="refresh" content="60" />

      <div className="flex flex-wrap items-center justify-between gap-4 border-b border-slate-800 px-6 py-5">
        <div>
          <h1 className="text-2xl font-bold">לוח בקרה - מחלקת חשמל, גלעם</h1>
          <p className="text-sm text-slate-400">
            {openCount} משימות פתוחות · {inProgressCount} בטיפול כרגע
          </p>
        </div>
        <ClientClock />
      </div>

      <div className="grid flex-1 grid-cols-1 gap-4 p-4 lg:grid-cols-3">
        <section className="flex flex-col rounded-xl border border-red-900 bg-red-950/30 p-4">
          <h2 className="mb-3 flex items-center gap-2 text-lg font-bold text-red-300">
            <span>🚨</span> תקלות דחופות לטיפול
          </h2>
          <div className="flex-1 space-y-3 overflow-y-auto">
            {urgentTasks.length === 0 ? (
              <p className="text-sm text-slate-400">
                אין תקלות דחופות פתוחות כרגע 🎉
              </p>
            ) : (
              urgentTasks.map((task) => (
                <div
                  key={task.id}
                  className="rounded-lg border border-red-900/50 bg-slate-900/70 p-3"
                >
                  <div className="flex items-center justify-between gap-2">
                    <span className="font-semibold">{task.title}</span>
                    <span
                      className={`shrink-0 rounded-full border px-2 py-0.5 text-xs font-medium ${PRIORITY_BADGE_CLASSES[task.priority]}`}
                    >
                      {PRIORITY_LABELS[task.priority]}
                    </span>
                  </div>
                  <div className="mt-1 text-xs text-slate-400">
                    {task.location ?? "—"} · {task.electrician?.name ?? "לא משויך"}
                    {task.project ? ` · ${task.project.name}` : ""}
                  </div>
                </div>
              ))
            )}
          </div>
        </section>

        <section className="flex flex-col rounded-xl border border-slate-800 bg-slate-900 p-4">
          <h2 className="mb-3 flex items-center gap-2 text-lg font-bold text-amber-300">
            <span>📁</span> פרויקטים
          </h2>
          <div className="flex-1 space-y-3 overflow-y-auto">
            {projects.length === 0 ? (
              <p className="text-sm text-slate-400">אין פרויקטים פעילים</p>
            ) : (
              projects.map((project) => (
                <div
                  key={project.id}
                  className="flex items-center justify-between rounded-lg bg-slate-800/60 p-3"
                >
                  <div>
                    <div className="font-medium">{project.name}</div>
                    {project.description && (
                      <div className="text-xs text-slate-400">
                        {project.description}
                      </div>
                    )}
                  </div>
                  <span className="shrink-0 rounded-full bg-slate-700 px-2.5 py-1 text-xs font-medium">
                    {project._count.tasks} משימות פתוחות
                  </span>
                </div>
              ))
            )}
          </div>
        </section>

        <section className="flex flex-col rounded-xl border border-slate-800 bg-slate-900 p-4">
          <h2 className="mb-3 flex items-center gap-2 text-lg font-bold text-blue-300">
            <span>🕒</span> עדכונים אחרונים
          </h2>
          <div className="flex-1 space-y-2 overflow-y-auto">
            {logs.length === 0 ? (
              <p className="text-sm text-slate-400">אין עדכונים עדיין</p>
            ) : (
              logs.map((log) => (
                <div
                  key={log.id}
                  className="border-b border-slate-800 pb-2 text-sm last:border-0"
                >
                  <div>{log.message}</div>
                  <div className="text-xs text-slate-500">
                    {formatRelativeTime(log.createdAt)}
                  </div>
                </div>
              ))
            )}
          </div>
        </section>
      </div>
    </div>
  );
}
