import { prisma } from "@/lib/prisma";
import { deleteAnnouncement } from "@/app/actions";
import { isViewer } from "@/lib/role";
import { formatDateTime } from "@/lib/labels";
import { AddAnnouncementForm } from "./AddAnnouncementForm";

export default async function AnnouncementsPage() {
  const [announcements, viewer] = await Promise.all([
    prisma.announcement.findMany({ orderBy: { createdAt: "desc" } }),
    isViewer(),
  ]);

  return (
    <div className="mx-auto max-w-2xl w-full px-4 py-6 space-y-6">
      <h1 className="text-xl font-bold">הודעות למחלקה</h1>
      <p className="text-sm text-slate-500">
        הודעות אלו מוצגות יחד עם ימי הולדת ב&quot;עדכונים אחרונים&quot; במסך התצוגה.
      </p>

      {!viewer && <AddAnnouncementForm />}

      <div className="rounded-lg border border-slate-200 bg-white shadow-sm divide-y divide-slate-100">
        {announcements.length === 0 ? (
          <p className="p-6 text-center text-slate-500">אין הודעות עדיין</p>
        ) : (
          announcements.map((a) => (
            <div key={a.id} className="flex items-center justify-between p-4">
              <div>
                <p>{a.message}</p>
                <p className="text-xs text-slate-400">
                  {formatDateTime(a.createdAt)}
                </p>
              </div>
              {!viewer && (
                <form action={deleteAnnouncement.bind(null, a.id)}>
                  <button
                    type="submit"
                    className="rounded-md border border-red-300 px-3 py-1.5 text-sm text-red-700 hover:bg-red-50"
                  >
                    מחיקה
                  </button>
                </form>
              )}
            </div>
          ))
        )}
      </div>
    </div>
  );
}
