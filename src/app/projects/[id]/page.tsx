import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { addProjectComment, deleteProject, updateProject } from "@/app/actions";
import { CommentForm } from "@/app/CommentForm";
import {
  PROJECT_STATUS_LABELS,
  PROJECT_STATUS_ORDER,
  formatDateTime,
} from "@/lib/labels";

export default async function ProjectDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  const project = await prisma.project.findUnique({
    where: { id },
    include: { comments: { orderBy: { createdAt: "desc" } } },
  });

  if (!project) {
    notFound();
  }

  const updateProjectWithId = updateProject.bind(null, project.id);
  const deleteProjectWithId = deleteProject.bind(null, project.id);
  const addCommentWithId = addProjectComment.bind(null, project.id);

  return (
    <div className="mx-auto max-w-2xl w-full px-4 py-6 space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold">עריכת פרויקט</h1>
        <div className="text-xs text-slate-400">
          נפתח: {formatDateTime(project.createdAt)}
        </div>
      </div>

      <form
        action={updateProjectWithId}
        className="space-y-4 rounded-lg border border-slate-200 bg-white p-6 shadow-sm"
      >
        <label className="block">
          <span className="mb-1 block text-sm font-medium text-slate-700">
            שם הפרויקט *
          </span>
          <input name="name" required className="input" defaultValue={project.name} />
        </label>

        <label className="block">
          <span className="mb-1 block text-sm font-medium text-slate-700">
            תיאור
          </span>
          <input
            name="description"
            className="input"
            defaultValue={project.description ?? ""}
          />
        </label>

        <label className="block">
          <span className="mb-1 block text-sm font-medium text-slate-700">
            סטטוס
          </span>
          <select name="status" className="input" defaultValue={project.status}>
            {PROJECT_STATUS_ORDER.map((s) => (
              <option key={s} value={s}>
                {PROJECT_STATUS_LABELS[s]}
              </option>
            ))}
          </select>
        </label>

        <button
          type="submit"
          className="w-full rounded-md bg-slate-900 px-4 py-2 font-medium text-white hover:bg-slate-800"
        >
          שמירת שינויים
        </button>
      </form>

      <div className="rounded-lg border border-slate-200 bg-white p-6 shadow-sm">
        <h2 className="mb-3 font-bold">הערות</h2>
        <CommentForm action={addCommentWithId} />
        {project.comments.length === 0 ? (
          <p className="text-sm text-slate-400">אין הערות עדיין</p>
        ) : (
          <ul className="space-y-2">
            {project.comments.map((comment) => (
              <li key={comment.id} className="rounded-md bg-slate-50 p-3 text-sm">
                <p>{comment.body}</p>
                <p className="mt-1 text-xs text-slate-400">
                  {formatDateTime(comment.createdAt)}
                </p>
              </li>
            ))}
          </ul>
        )}
      </div>

      <form action={deleteProjectWithId}>
        <button
          type="submit"
          className="w-full rounded-md border border-red-300 px-4 py-2 font-medium text-red-700 hover:bg-red-50"
        >
          מחיקת פרויקט
        </button>
      </form>
    </div>
  );
}
