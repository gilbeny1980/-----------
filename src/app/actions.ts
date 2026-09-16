"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { logActivity } from "@/lib/activity";
import { TaskPriority, TaskStatus } from "@/generated/prisma/enums";
import { STATUS_LABELS } from "@/lib/labels";

function asOrNull(value: FormDataEntryValue | null): string | null {
  const str = (value ?? "").toString().trim();
  return str.length > 0 ? str : null;
}

function isTaskStatus(value: string): value is TaskStatus {
  return (Object.values(TaskStatus) as string[]).includes(value);
}

function isTaskPriority(value: string): value is TaskPriority {
  return (Object.values(TaskPriority) as string[]).includes(value);
}

function revalidateTaskPaths(taskId?: string) {
  revalidatePath("/");
  revalidatePath("/tasks");
  if (taskId) revalidatePath(`/tasks/${taskId}`);
}

export async function createTask(formData: FormData) {
  const title = (formData.get("title") ?? "").toString().trim();
  if (!title) {
    throw new Error("כותרת המשימה היא שדה חובה");
  }

  const priorityRaw = (formData.get("priority") ?? "NORMAL").toString();
  const priority = isTaskPriority(priorityRaw) ? priorityRaw : "NORMAL";

  const dueDateRaw = asOrNull(formData.get("dueDate"));
  const electricianId = asOrNull(formData.get("electricianId"));
  const projectId = asOrNull(formData.get("projectId"));

  const task = await prisma.task.create({
    data: {
      title,
      description: asOrNull(formData.get("description")),
      location: asOrNull(formData.get("location")),
      priority,
      reporterName: asOrNull(formData.get("reporterName")),
      reporterPhone: asOrNull(formData.get("reporterPhone")),
      dueDate: dueDateRaw ? new Date(dueDateRaw) : null,
      electricianId,
      projectId,
      status: electricianId ? "IN_PROGRESS" : "NEW",
    },
  });

  await logActivity(`נפתחה משימה חדשה: "${title}"`, task.id);

  revalidateTaskPaths();
  redirect(`/tasks/${task.id}`);
}

export async function updateTask(taskId: string, formData: FormData) {
  const title = (formData.get("title") ?? "").toString().trim();
  if (!title) {
    throw new Error("כותרת המשימה היא שדה חובה");
  }

  const statusRaw = (formData.get("status") ?? "NEW").toString();
  const status = isTaskStatus(statusRaw) ? statusRaw : "NEW";

  const priorityRaw = (formData.get("priority") ?? "NORMAL").toString();
  const priority = isTaskPriority(priorityRaw) ? priorityRaw : "NORMAL";

  const dueDateRaw = asOrNull(formData.get("dueDate"));
  const electricianId = asOrNull(formData.get("electricianId"));
  const projectId = asOrNull(formData.get("projectId"));

  const existing = await prisma.task.findUniqueOrThrow({
    where: { id: taskId },
    include: { electrician: true },
  });

  await prisma.task.update({
    where: { id: taskId },
    data: {
      title,
      description: asOrNull(formData.get("description")),
      location: asOrNull(formData.get("location")),
      status,
      priority,
      reporterName: asOrNull(formData.get("reporterName")),
      reporterPhone: asOrNull(formData.get("reporterPhone")),
      dueDate: dueDateRaw ? new Date(dueDateRaw) : null,
      electricianId,
      projectId,
      completedAt:
        status === "DONE" && existing.status !== "DONE"
          ? new Date()
          : status !== "DONE"
            ? null
            : existing.completedAt,
    },
  });

  if (status !== existing.status) {
    await logActivity(
      `סטטוס המשימה "${title}" עודכן ל${STATUS_LABELS[status]}`,
      taskId,
    );
  }

  if (electricianId !== existing.electricianId) {
    if (electricianId) {
      const electrician = await prisma.electrician.findUnique({
        where: { id: electricianId },
      });
      await logActivity(
        `המשימה "${title}" שויכה ל${electrician?.name ?? "חשמלאי"}`,
        taskId,
      );
    } else {
      await logActivity(`שיוך החשמלאי למשימה "${title}" בוטל`, taskId);
    }
  }

  if (priority !== existing.priority && priority === "URGENT") {
    await logActivity(`המשימה "${title}" סומנה כדחופה`, taskId);
  }

  revalidateTaskPaths(taskId);
  redirect(`/tasks/${taskId}`);
}

export async function deleteTask(taskId: string) {
  const task = await prisma.task.findUnique({ where: { id: taskId } });
  if (task) {
    await logActivity(`המשימה "${task.title}" נמחקה`);
  }
  await prisma.task.delete({ where: { id: taskId } });
  revalidateTaskPaths();
  redirect("/tasks");
}

export async function createElectrician(formData: FormData) {
  const name = (formData.get("name") ?? "").toString().trim();
  if (!name) {
    throw new Error("שם החשמלאי הוא שדה חובה");
  }

  await prisma.electrician.create({
    data: {
      name,
      phone: asOrNull(formData.get("phone")),
    },
  });

  revalidatePath("/electricians");
  revalidatePath("/tasks");
  revalidatePath("/tasks/new");
}

export async function toggleElectricianActive(
  electricianId: string,
  active: boolean,
) {
  await prisma.electrician.update({
    where: { id: electricianId },
    data: { active },
  });
  revalidatePath("/electricians");
  revalidatePath("/tasks");
}

export async function deleteElectrician(electricianId: string) {
  await prisma.task.updateMany({
    where: { electricianId },
    data: { electricianId: null },
  });
  await prisma.electrician.delete({ where: { id: electricianId } });
  revalidatePath("/electricians");
  revalidatePath("/tasks");
}

export async function createProject(formData: FormData) {
  const name = (formData.get("name") ?? "").toString().trim();
  if (!name) {
    throw new Error("שם הפרויקט הוא שדה חובה");
  }

  await prisma.project.create({
    data: {
      name,
      description: asOrNull(formData.get("description")),
    },
  });

  await logActivity(`נפתח פרויקט חדש: "${name}"`);

  revalidatePath("/projects");
  revalidatePath("/tasks");
  revalidatePath("/tasks/new");
  revalidatePath("/");
}

export async function toggleProjectActive(projectId: string, active: boolean) {
  await prisma.project.update({
    where: { id: projectId },
    data: { active },
  });
  revalidatePath("/projects");
  revalidatePath("/tasks");
  revalidatePath("/");
}

export async function deleteProject(projectId: string) {
  await prisma.task.updateMany({
    where: { projectId },
    data: { projectId: null },
  });
  await prisma.project.delete({ where: { id: projectId } });
  revalidatePath("/projects");
  revalidatePath("/tasks");
  revalidatePath("/");
}
