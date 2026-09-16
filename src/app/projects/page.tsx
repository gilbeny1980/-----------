import { prisma } from "@/lib/prisma";
import { deleteProject, toggleProjectActive } from "@/app/actions";
import { AddProjectForm } from "./AddProjectForm";

export default async function ProjectsPage() {
  const projects = await prisma.project.findMany({
    orderBy: [{ active: "desc" }, { name: "asc" }],
    include: {
      _count: {
        select: {
          tasks: { where: { status: { notIn: ["DONE", "CANCELLED"] } } },
        },
      },
    },
  });

  return (
    <div className="mx-auto max-w-2xl w-full px-4 py-6 space-y-6">
      <h1 className="text-xl font-bold">פרויקטים</h1>

      <AddProjectForm />

      <div className="rounded-lg border border-slate-200 bg-white shadow-sm divide-y divide-slate-100">
        {projects.length === 0 ? (
          <p className="p-6 text-center text-slate-500">אין פרויקטים רשומים</p>
        ) : (
          projects.map((p) => (
            <div key={p.id} className="flex items-center justify-between p-4">
              <div>
                <div className="font-medium">
                  {p.name}{" "}
                  {!p.active && (
                    <span className="text-xs text-slate-400">(לא פעיל)</span>
                  )}
                </div>
                <div className="text-sm text-slate-500">
                  {p.description ?? "—"} · {p._count.tasks} משימות פתוחות
                </div>
              </div>
              <div className="flex gap-2">
                <form action={toggleProjectActive.bind(null, p.id, !p.active)}>
                  <button
                    type="submit"
                    className="rounded-md border border-slate-300 px-3 py-1.5 text-sm hover:bg-slate-50"
                  >
                    {p.active ? "השבתה" : "הפעלה"}
                  </button>
                </form>
                <form action={deleteProject.bind(null, p.id)}>
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
