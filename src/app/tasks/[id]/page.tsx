import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { updateTask, deleteTask } from "@/app/actions";
import {
  PRIORITY_LABELS,
  STATUS_LABELS,
  formatDateTime,
} from "@/lib/labels";
import { TaskPriority, TaskStatus } from "@/generated/prisma/enums";

export default async function TaskDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  const [task, electricians, projects] = await Promise.all([
    prisma.task.findUnique({ where: { id }, include: { electrician: true } }),
    prisma.electrician.findMany({
      where: { active: true },
      orderBy: { name: "asc" },
    }),
    prisma.project.findMany({
      where: { active: true },
      orderBy: { name: "asc" },
    }),
  ]);

  if (!task) {
    notFound();
  }

  const updateTaskWithId = updateTask.bind(null, task.id);
  const deleteTaskWithId = deleteTask.bind(null, task.id);

  return (
    <div className="mx-auto max-w-2xl w-full px-4 py-6 space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold">עריכת משימה</h1>
        <div className="text-xs text-slate-400">
          נפתחה: {formatDateTime(task.createdAt)} · עודכנה לאחרונה:{" "}
          {formatDateTime(task.updatedAt)}
        </div>
      </div>

      <form
        action={updateTaskWithId}
        className="space-y-4 rounded-lg border border-slate-200 bg-white p-6 shadow-sm"
      >
        <Field label="כותרת *">
          <input name="title" required className="input" defaultValue={task.title} />
        </Field>

        <Field label="תיאור">
          <textarea
            name="description"
            rows={4}
            className="input"
            defaultValue={task.description ?? ""}
          />
        </Field>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <Field label="מיקום">
            <input
              name="location"
              className="input"
              defaultValue={task.location ?? ""}
            />
          </Field>
          <Field label="עדיפות">
            <select name="priority" className="input" defaultValue={task.priority}>
              {(Object.keys(PRIORITY_LABELS) as TaskPriority[]).map((p) => (
                <option key={p} value={p}>
                  {PRIORITY_LABELS[p]}
                </option>
              ))}
            </select>
          </Field>
        </div>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <Field label="סטטוס">
            <select name="status" className="input" defaultValue={task.status}>
              {(Object.keys(STATUS_LABELS) as TaskStatus[]).map((s) => (
                <option key={s} value={s}>
                  {STATUS_LABELS[s]}
                </option>
              ))}
            </select>
          </Field>
          <Field label="שיוך לחשמלאי">
            <select
              name="electricianId"
              className="input"
              defaultValue={task.electricianId ?? ""}
            >
              <option value="">לא משויך</option>
              {electricians.map((e) => (
                <option key={e.id} value={e.id}>
                  {e.name}
                </option>
              ))}
            </select>
          </Field>
        </div>

        <Field label="פרויקט">
          <select
            name="projectId"
            className="input"
            defaultValue={task.projectId ?? ""}
          >
            <option value="">ללא פרויקט</option>
            {projects.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name}
              </option>
            ))}
          </select>
        </Field>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <Field label="שם הפונה">
            <input
              name="reporterName"
              className="input"
              defaultValue={task.reporterName ?? ""}
            />
          </Field>
          <Field label="טלפון הפונה">
            <input
              name="reporterPhone"
              className="input"
              dir="ltr"
              defaultValue={task.reporterPhone ?? ""}
            />
          </Field>
        </div>

        <Field label="תאריך יעד">
          <input
            type="date"
            name="dueDate"
            className="input"
            defaultValue={
              task.dueDate ? task.dueDate.toISOString().slice(0, 10) : ""
            }
          />
        </Field>

        <button
          type="submit"
          className="w-full rounded-md bg-slate-900 px-4 py-2 font-medium text-white hover:bg-slate-800"
        >
          שמירת שינויים
        </button>
      </form>

      <form action={deleteTaskWithId}>
        <button
          type="submit"
          className="w-full rounded-md border border-red-300 px-4 py-2 font-medium text-red-700 hover:bg-red-50"
        >
          מחיקת משימה
        </button>
      </form>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="mb-1 block text-sm font-medium text-slate-700">{label}</span>
      {children}
    </label>
  );
}
