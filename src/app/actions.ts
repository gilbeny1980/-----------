"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { TaskPriority, TaskStatus } from "@/generated/prisma/enums";

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

export async function createTask(formData: FormData) {
  const title = (formData.get("title") ?? "").toString().trim();
  if (!title) {
    throw new Error("כותרת המשימה היא שדה חובה");
  }

  const priorityRaw = (formData.get("priority") ?? "NORMAL").toString();
  const priority = isTaskPriority(priorityRaw) ? priorityRaw : "NORMAL";

  const dueDateRaw = asOrNull(formData.get("dueDate"));
  const electricianId = asOrNull(formData.get("electricianId"));

  const task = await prisma.task.create({
    data: {
      title,
      description: asOrNull(formData.get("description")),
      location: asOrNull(formData.get("location")),
      priority,
      reporterName: asOrNull(formData.get("reporterName")),
      reporterPhone: asOrNull(formData.get("reporterPhone")),
      dueDate: dueDateRaw ? new Date(dueDateRaw) : null,
      electricianId: electricianId,
      status: electricianId ? "IN_PROGRESS" : "NEW",
    },
  });

  revalidatePath("/");
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

  const existing = await prisma.task.findUniqueOrThrow({
    where: { id: taskId },
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
      completedAt:
        status === "DONE" && existing.status !== "DONE"
          ? new Date()
          : status !== "DONE"
            ? null
            : existing.completedAt,
    },
  });

  revalidatePath("/");
  revalidatePath(`/tasks/${taskId}`);
  redirect(`/tasks/${taskId}`);
}

export async function deleteTask(taskId: string) {
  await prisma.task.delete({ where: { id: taskId } });
  revalidatePath("/");
  redirect("/");
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
  revalidatePath("/");
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
  revalidatePath("/");
}

export async function deleteElectrician(electricianId: string) {
  await prisma.task.updateMany({
    where: { electricianId },
    data: { electricianId: null },
  });
  await prisma.electrician.delete({ where: { id: electricianId } });
  revalidatePath("/electricians");
  revalidatePath("/");
}
