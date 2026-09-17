"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { assertNotViewer } from "@/lib/role";
import { ProjectStatus } from "@/generated/prisma/enums";

function asOrNull(value: FormDataEntryValue | null): string | null {
  const str = (value ?? "").toString().trim();
  return str.length > 0 ? str : null;
}

function asFloatOrNull(value: FormDataEntryValue | null): number | null {
  const str = asOrNull(value);
  if (str === null) return null;
  const num = Number(str);
  return Number.isFinite(num) ? num : null;
}

function isProjectStatus(value: string): value is ProjectStatus {
  return (Object.values(ProjectStatus) as string[]).includes(value);
}

function revalidateElectricianPaths(electricianId?: string) {
  revalidatePath("/electricians");
  revalidatePath("/");
  if (electricianId) revalidatePath(`/electricians/${electricianId}`);
}

export async function createElectrician(formData: FormData) {
  await assertNotViewer();

  const name = (formData.get("name") ?? "").toString().trim();
  if (!name) {
    throw new Error("שם החשמלאי הוא שדה חובה");
  }

  const birthDateRaw = asOrNull(formData.get("birthDate"));

  await prisma.electrician.create({
    data: {
      name,
      phone: asOrNull(formData.get("phone")),
      birthDate: birthDateRaw ? new Date(birthDateRaw) : null,
    },
  });

  revalidateElectricianPaths();
}

export async function updateElectrician(
  electricianId: string,
  formData: FormData,
) {
  await assertNotViewer();

  const name = (formData.get("name") ?? "").toString().trim();
  if (!name) {
    throw new Error("שם החשמלאי הוא שדה חובה");
  }

  const birthDateRaw = asOrNull(formData.get("birthDate"));

  await prisma.electrician.update({
    where: { id: electricianId },
    data: {
      name,
      phone: asOrNull(formData.get("phone")),
      birthDate: birthDateRaw ? new Date(birthDateRaw) : null,
    },
  });

  revalidateElectricianPaths(electricianId);
  redirect(`/electricians/${electricianId}`);
}

export async function toggleElectricianActive(
  electricianId: string,
  active: boolean,
) {
  await assertNotViewer();

  await prisma.electrician.update({
    where: { id: electricianId },
    data: { active },
  });
  revalidateElectricianPaths(electricianId);
}

export async function deleteElectrician(electricianId: string) {
  await assertNotViewer();

  await prisma.electrician.delete({ where: { id: electricianId } });
  revalidatePath("/electricians");
  revalidatePath("/");
  redirect("/electricians");
}

function revalidateProjectPaths(projectId?: string) {
  revalidatePath("/projects");
  revalidatePath("/");
  if (projectId) revalidatePath(`/projects/${projectId}`);
}

export async function createProject(formData: FormData) {
  await assertNotViewer();

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

  revalidateProjectPaths();
}

export async function updateProject(projectId: string, formData: FormData) {
  await assertNotViewer();

  const name = (formData.get("name") ?? "").toString().trim();
  if (!name) {
    throw new Error("שם הפרויקט הוא שדה חובה");
  }

  const statusRaw = (formData.get("status") ?? "TODO").toString();
  const status = isProjectStatus(statusRaw) ? statusRaw : "TODO";

  await prisma.project.update({
    where: { id: projectId },
    data: {
      name,
      description: asOrNull(formData.get("description")),
      status,
    },
  });

  revalidateProjectPaths(projectId);
  redirect(`/projects/${projectId}`);
}

export async function addProjectComment(projectId: string, formData: FormData) {
  await assertNotViewer();

  const body = (formData.get("body") ?? "").toString().trim();
  if (!body) return;

  await prisma.comment.create({ data: { body, projectId } });
  revalidateProjectPaths(projectId);
}

export async function toggleProjectActive(projectId: string, active: boolean) {
  await assertNotViewer();

  await prisma.project.update({
    where: { id: projectId },
    data: { active },
  });
  revalidateProjectPaths(projectId);
}

export async function deleteProject(projectId: string) {
  await assertNotViewer();

  await prisma.project.delete({ where: { id: projectId } });
  revalidatePath("/projects");
  revalidatePath("/");
  redirect("/projects");
}

export async function createAnnouncement(formData: FormData) {
  await assertNotViewer();

  const message = (formData.get("message") ?? "").toString().trim();
  if (!message) return;

  await prisma.announcement.create({ data: { message } });
  revalidatePath("/announcements");
  revalidatePath("/");
}

export async function deleteAnnouncement(announcementId: string) {
  await assertNotViewer();

  await prisma.announcement.delete({ where: { id: announcementId } });
  revalidatePath("/announcements");
  revalidatePath("/");
}

function revalidateTransformerPaths() {
  revalidatePath("/transformers");
  revalidatePath("/");
}

export async function createTransformer(formData: FormData) {
  await assertNotViewer();

  const name = (formData.get("name") ?? "").toString().trim();
  if (!name) {
    throw new Error("שם השנאי הוא שדה חובה");
  }

  await prisma.transformer.create({ data: { name } });
  revalidateTransformerPaths();
}

export async function updateTransformerReading(
  transformerId: string,
  formData: FormData,
) {
  await assertNotViewer();

  await prisma.transformer.update({
    where: { id: transformerId },
    data: {
      activePowerKw: asFloatOrNull(formData.get("activePowerKw")),
      powerFactor: asFloatOrNull(formData.get("powerFactor")),
    },
  });

  revalidateTransformerPaths();
}

export async function deleteTransformer(transformerId: string) {
  await assertNotViewer();

  await prisma.transformer.delete({ where: { id: transformerId } });
  revalidateTransformerPaths();
}
