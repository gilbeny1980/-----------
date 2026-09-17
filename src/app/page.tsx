import { prisma } from "@/lib/prisma";
import {
  PROJECT_STATUS_BADGE_CLASSES,
  PROJECT_STATUS_LABELS,
  formatPowerKw,
  formatRelativeTime,
} from "@/lib/labels";
import { ClientClock } from "./ClientClock";

export const dynamic = "force-dynamic";

function isBirthdayToday(birthDate: Date): boolean {
  const today = new Date();
  return (
    birthDate.getMonth() === today.getMonth() &&
    birthDate.getDate() === today.getDate()
  );
}

export default async function DisplayPage() {
  const [projects, announcements, electricians, transformers] =
    await Promise.all([
      prisma.project.findMany({
        where: { active: true },
        orderBy: { name: "asc" },
      }),
      prisma.announcement.findMany({
        orderBy: { createdAt: "desc" },
        take: 15,
      }),
      prisma.electrician.findMany({
        where: { active: true, birthDate: { not: null } },
      }),
      prisma.transformer.findMany({ orderBy: { order: "asc" } }),
    ]);

  const birthdayElectricians = electricians.filter((e) =>
    e.birthDate ? isBirthdayToday(e.birthDate) : false,
  );

  const now = new Date();
  const birthdayFeedItems = birthdayElectricians.map((e) => ({
    id: `birthday-${e.id}`,
    message: `🎂 היום יום ההולדת של ${e.name}!`,
    createdAt: now,
  }));

  const feedItems = [...birthdayFeedItems, ...announcements]
    .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime())
    .slice(0, 15);

  const totalPowerKw = transformers.reduce(
    (sum, t) => sum + (t.activePowerKw ?? 0),
    0,
  );

  return (
    <div className="flex-1 flex flex-col bg-slate-950 text-white">
      <meta httpEquiv="refresh" content="60" />

      <div className="flex flex-wrap items-center justify-between gap-4 border-b border-slate-800 px-6 py-5">
        <div>
          <h1 className="text-2xl font-bold">לוח בקרה - מחלקת חשמל, גלעם</h1>
          <p className="text-sm text-slate-400">{projects.length} פרויקטים פעילים</p>
          <div className="mt-2 flex gap-2">
            <a
              href="https://t.me/Galam_Electrical_Bot"
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-1.5 rounded-full border border-sky-700 bg-sky-950/60 px-3 py-1 text-sm font-medium text-sky-300 transition-colors hover:bg-sky-900"
            >
              <span>📱</span> מדריך תפעול בטלגרם
            </a>
          </div>
        </div>
        <ClientClock />
      </div>

      {birthdayElectricians.length > 0 && (
        <div className="mx-4 mt-4 rounded-xl border border-pink-800 bg-pink-950/40 px-4 py-3 text-center">
          <span className="text-lg font-bold text-pink-200">
            🎂 היום יום ההולדת של{" "}
            {birthdayElectricians.map((e) => e.name).join(", ")}!
          </span>
        </div>
      )}

      {transformers.length > 0 && (
        <section className="mx-4 mt-4 rounded-xl border border-slate-800 bg-slate-900 p-4">
          <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
            <h2 className="flex items-center gap-2 text-lg font-bold text-emerald-300">
              <span>⚡</span> שנאים - ביקוש הספק ומקדם הספק
            </h2>
            <span className="rounded-full bg-emerald-950/60 border border-emerald-800 px-3 py-1 text-sm font-bold text-emerald-300">
              סה&quot;כ: {formatPowerKw(totalPowerKw)}
            </span>
          </div>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
            {transformers.map((t) => (
              <div
                key={t.id}
                className="rounded-lg border border-slate-800 bg-slate-800/60 p-3 text-center"
              >
                <div className="text-sm font-bold text-slate-300">{t.name}</div>
                <div className="mt-1 flex items-baseline justify-center gap-1">
                  <span className="text-xs font-normal text-slate-400">kW</span>
                  <span className="text-xl font-bold text-emerald-300">
                    {t.activePowerKw !== null
                      ? Math.round(t.activePowerKw * 10) / 10
                      : "—"}
                  </span>
                </div>
                <div className="text-xs text-slate-400">
                  מקדם הספק:{" "}
                  {t.powerFactor !== null
                    ? Math.round(t.powerFactor * 100) / 100
                    : "—"}
                </div>
              </div>
            ))}
          </div>
        </section>
      )}

      <div className="grid flex-1 grid-cols-1 gap-4 p-4 lg:grid-cols-2">
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
                    <div className="flex items-center gap-2">
                      <span className="font-medium">{project.name}</span>
                      <span
                        className={`rounded-full border px-2 py-0.5 text-xs font-medium ${PROJECT_STATUS_BADGE_CLASSES[project.status]}`}
                      >
                        {PROJECT_STATUS_LABELS[project.status]}
                      </span>
                    </div>
                    {project.description && (
                      <div className="text-xs text-slate-400">
                        {project.description}
                      </div>
                    )}
                  </div>
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
            {feedItems.length === 0 ? (
              <p className="text-sm text-slate-400">אין עדכונים עדיין</p>
            ) : (
              feedItems.map((item) => (
                <div
                  key={item.id}
                  className="border-b border-slate-800 pb-2 text-sm last:border-0"
                >
                  <div>{item.message}</div>
                  <div className="text-xs text-slate-500">
                    {formatRelativeTime(item.createdAt)}
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
