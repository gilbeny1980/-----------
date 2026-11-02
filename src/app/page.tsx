import Link from "next/link";
import { prisma } from "@/lib/prisma";
import {
  PROJECT_STATUS_BADGE_CLASSES,
  PROJECT_STATUS_LABELS,
} from "@/lib/labels";
import { ClientClock } from "./ClientClock";
import { ServiceProviderPicker } from "./ServiceProviderPicker";
import { WorkerAssignmentsSection } from "./WorkerAssignmentsSection";
import { UpdatesTicker } from "./UpdatesTicker";
import { WorkOrdersPanel } from "./WorkOrdersPanel";
import { getWorkOrdersTitle } from "@/lib/settings";
import { HEADER_CARD_CLASS } from "@/lib/uiStyles";

export const dynamic = "force-dynamic";

function isBirthdayToday(birthDate: Date): boolean {
  const today = new Date();
  return (
    birthDate.getMonth() === today.getMonth() &&
    birthDate.getDate() === today.getDate()
  );
}

export default async function DisplayPage() {
  const [
    projects,
    announcements,
    electricians,
    serviceCategories,
    workOrders,
    workOrdersTitle,
  ] = await Promise.all([
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
    prisma.serviceCategory.findMany({
      orderBy: { order: "asc" },
      include: {
        companies: {
          orderBy: { order: "asc" },
          include: { contacts: { orderBy: { name: "asc" } } },
        },
      },
    }),
    prisma.workOrder.findMany({
      where: { status: { not: "DONE" } },
      orderBy: { createdAt: "desc" },
      include: { electrician: { select: { name: true } } },
    }),
    getWorkOrdersTitle(),
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

  return (
    <div className="flex-1 flex flex-col bg-slate-950 text-white">
      <meta httpEquiv="refresh" content="60" />

      <div className="relative flex flex-col gap-4 border-b border-slate-800 px-6 py-5 sm:flex-row sm:flex-wrap sm:items-center sm:pl-32">
        <div className="sm:shrink-0">
          <h1 className="text-2xl font-bold">לוח בקרה - מחלקת חשמל, גלעם</h1>
          <p className="text-sm text-slate-400">{projects.length} פרויקטים פעילים</p>
          <div className="mt-2 grid grid-cols-2 gap-3 sm:flex sm:flex-nowrap">
            <a
              href="https://t.me/Galam_Electrical_Bot"
              target="_blank"
              rel="noopener noreferrer"
              className={HEADER_CARD_CLASS}
            >
              <svg viewBox="0 0 240 240" className="h-6 w-6 shrink-0" aria-hidden="true">
                <circle cx="120" cy="120" r="120" fill="#29A9EB" />
                <path
                  fill="#fff"
                  d="M179.6 72.9 154.7 187c-1.9 8.4-6.8 10.5-13.8 6.5l-38-28-18.3 17.6c-2 2-3.7 3.7-7.6 3.7l2.7-38.5L170 65.5c4-3.6-.9-5.6-6.2-2L63.6 125l-37.6-11.8c-8.2-2.6-8.3-8.2 1.7-12.1l147-56.6c6.8-2.5 12.8 1.6 10.9 12.4Z"
                />
              </svg>
              <span className="font-bold">בוט טלגרם</span>
            </a>
            <Link href="/room-entry" className={HEADER_CARD_CLASS}>
              <span className="text-xl">🚪</span>
              <span className="font-bold">חדרי חשמל</span>
            </Link>
            <Link href="/transformers-status" className={HEADER_CARD_CLASS}>
              <span className="text-xl">⚡</span>
              <span className="font-bold">צריכת שנאים</span>
            </Link>
            <ServiceProviderPicker categories={serviceCategories} />
            <a
              href="https://project-4lc5n.vercel.app/"
              target="_blank"
              rel="noopener noreferrer"
              className={HEADER_CARD_CLASS}
            >
              <span className="text-xl">👷</span>
              <span className="font-bold">משימות עובדים</span>
            </a>
          </div>
        </div>
        <UpdatesTicker items={feedItems} />
        <div className="sm:absolute sm:left-6 sm:top-5">
          <ClientClock />
        </div>
      </div>

      <WorkerAssignmentsSection />

      {birthdayElectricians.length > 0 && (
        <div className="mx-4 mt-4 rounded-xl border border-pink-800 bg-pink-950/40 px-4 py-3 text-center">
          <span className="text-lg font-bold text-pink-200">
            🎂 היום יום ההולדת של{" "}
            {birthdayElectricians.map((e) => e.name).join(", ")}!
          </span>
        </div>
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
            <span>🛠️</span> {workOrdersTitle}
          </h2>
          <WorkOrdersPanel workOrders={workOrders} />
        </section>
      </div>
    </div>
  );
}
