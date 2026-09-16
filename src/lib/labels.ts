import type { ProjectStatus } from "@/generated/prisma/enums";

export const PROJECT_STATUS_LABELS: Record<ProjectStatus, string> = {
  TODO: "לביצוע",
  IN_PROGRESS: "בטיפול",
  DONE: "בוצע",
};

export const PROJECT_STATUS_ORDER: ProjectStatus[] = [
  "TODO",
  "IN_PROGRESS",
  "DONE",
];

export const PROJECT_STATUS_BADGE_CLASSES: Record<ProjectStatus, string> = {
  TODO: "bg-blue-100 text-blue-800 border-blue-200",
  IN_PROGRESS: "bg-amber-100 text-amber-800 border-amber-200",
  DONE: "bg-green-100 text-green-800 border-green-200",
};

export function formatDate(date: Date | string | null | undefined): string {
  if (!date) return "";
  return new Intl.DateTimeFormat("he-IL", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  }).format(new Date(date));
}

export function formatRelativeTime(date: Date | string): string {
  const d = new Date(date);
  const diffMs = Date.now() - d.getTime();
  const diffMin = Math.round(diffMs / 60000);

  if (diffMin < 1) return "עכשיו";
  if (diffMin < 60) return `לפני ${diffMin} דקות`;
  const diffHours = Math.round(diffMin / 60);
  if (diffHours < 24) return `לפני ${diffHours} שעות`;
  const diffDays = Math.round(diffHours / 24);
  if (diffDays === 1) return "אתמול";
  if (diffDays < 7) return `לפני ${diffDays} ימים`;
  return formatDate(d);
}

export function formatDateTime(date: Date | string | null | undefined): string {
  if (!date) return "";
  return new Intl.DateTimeFormat("he-IL", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(date));
}
