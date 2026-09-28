"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { cookies } from "next/headers";
import { prisma } from "@/lib/prisma";
import { assertAdmin } from "@/lib/role";
import { hashPassword, verifyPassword } from "@/lib/password";
import { ProjectStatus, WorkOrderStatus } from "@/generated/prisma/enums";

async function setAdminCookie() {
  const cookieStore = await cookies();
  cookieStore.set("role", "admin", {
    maxAge: 60 * 60 * 24 * 365,
    httpOnly: true,
    sameSite: "lax",
  });
}

export type LoginState = { error?: string };

export async function loginAdmin(
  _prevState: LoginState,
  formData: FormData,
): Promise<LoginState> {
  const username = (formData.get("username") ?? "").toString().trim();
  const password = (formData.get("password") ?? "").toString();

  const user = await prisma.adminUser.findUnique({ where: { username } });
  if (!user || !verifyPassword(password, user.passwordHash)) {
    return { error: "שם משתמש או סיסמה שגויים" };
  }

  await setAdminCookie();
  redirect("/projects");
}

export type CreateAdminUserState = { error?: string };

export async function createFirstAdminUser(
  _prevState: CreateAdminUserState,
  formData: FormData,
): Promise<CreateAdminUserState> {
  const existing = await prisma.adminUser.count();
  if (existing > 0) {
    return { error: "כבר קיים משתמש מנהל" };
  }

  const username = (formData.get("username") ?? "").toString().trim();
  const password = (formData.get("password") ?? "").toString();
  if (!username || !password) {
    return { error: "יש למלא שם משתמש וסיסמה" };
  }

  await prisma.adminUser.create({
    data: { username, passwordHash: hashPassword(password) },
  });
  await setAdminCookie();
  redirect("/projects");
}

export async function createAdminUser(formData: FormData) {
  await assertAdmin();

  const username = (formData.get("username") ?? "").toString().trim();
  const password = (formData.get("password") ?? "").toString();
  if (!username || !password) {
    throw new Error("יש למלא שם משתמש וסיסמה");
  }

  await prisma.adminUser.create({
    data: { username, passwordHash: hashPassword(password) },
  });
  revalidatePath("/admin-users");
}

export async function updateAdminUserPassword(
  userId: string,
  formData: FormData,
) {
  await assertAdmin();

  const password = (formData.get("password") ?? "").toString();
  if (!password) {
    throw new Error("יש למלא סיסמה חדשה");
  }

  await prisma.adminUser.update({
    where: { id: userId },
    data: { passwordHash: hashPassword(password) },
  });
  revalidatePath("/admin-users");
}

export async function deleteAdminUser(userId: string) {
  await assertAdmin();

  const count = await prisma.adminUser.count();
  if (count <= 1) {
    throw new Error("לא ניתן למחוק את המשתמש היחיד");
  }

  await prisma.adminUser.delete({ where: { id: userId } });
  revalidatePath("/admin-users");
}

export async function logoutAdmin() {
  const cookieStore = await cookies();
  cookieStore.delete("role");
  redirect("/");
}

function revalidateWorkOrderPaths() {
  revalidatePath("/work-orders");
  revalidatePath("/");
}

export async function updateWorkOrdersTitle(formData: FormData) {
  await assertAdmin();

  const title = (formData.get("workOrdersTitle") ?? "").toString().trim();
  if (!title) {
    throw new Error("כותרת היא שדה חובה");
  }

  await prisma.appSettings.upsert({
    where: { id: "singleton" },
    create: { id: "singleton", workOrdersTitle: title },
    update: { workOrdersTitle: title },
  });
  revalidateWorkOrderPaths();
}

export async function createWorkOrder(formData: FormData) {
  await assertAdmin();

  const title = (formData.get("title") ?? "").toString().trim();
  if (!title) {
    throw new Error("כותרת היא שדה חובה");
  }

  await prisma.workOrder.create({
    data: {
      title,
      description: asOrNull(formData.get("description")),
      electricianId: asOrNull(formData.get("electricianId")),
      equipmentIssued: asOrNull(formData.get("equipmentIssued")),
    },
  });
  revalidateWorkOrderPaths();
}

export async function updateWorkOrder(workOrderId: string, formData: FormData) {
  await assertAdmin();

  const title = (formData.get("title") ?? "").toString().trim();
  if (!title) {
    throw new Error("כותרת היא שדה חובה");
  }

  await prisma.workOrder.update({
    where: { id: workOrderId },
    data: {
      title,
      description: asOrNull(formData.get("description")),
      electricianId: asOrNull(formData.get("electricianId")),
    },
  });
  revalidateWorkOrderPaths();
}

export async function updateWorkOrderStatus(
  workOrderId: string,
  status: WorkOrderStatus,
) {
  await assertAdmin();

  await prisma.workOrder.update({
    where: { id: workOrderId },
    data: { status },
  });
  revalidateWorkOrderPaths();
}

export async function updateWorkOrderEquipment(
  workOrderId: string,
  formData: FormData,
) {
  await assertAdmin();

  await prisma.workOrder.update({
    where: { id: workOrderId },
    data: { equipmentIssued: asOrNull(formData.get("equipmentIssued")) },
  });
  revalidateWorkOrderPaths();
}

export async function deleteWorkOrder(workOrderId: string) {
  await assertAdmin();

  await prisma.workOrder.delete({ where: { id: workOrderId } });
  revalidateWorkOrderPaths();
}

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
  await assertAdmin();

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
  await assertAdmin();

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
  await assertAdmin();

  await prisma.electrician.update({
    where: { id: electricianId },
    data: { active },
  });
  revalidateElectricianPaths(electricianId);
}

export async function deleteElectrician(electricianId: string) {
  await assertAdmin();

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
  await assertAdmin();

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
  await assertAdmin();

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
  await assertAdmin();

  const body = (formData.get("body") ?? "").toString().trim();
  if (!body) return;

  await prisma.comment.create({ data: { body, projectId } });
  revalidateProjectPaths(projectId);
}

export async function toggleProjectActive(projectId: string, active: boolean) {
  await assertAdmin();

  await prisma.project.update({
    where: { id: projectId },
    data: { active },
  });
  revalidateProjectPaths(projectId);
}

export async function deleteProject(projectId: string) {
  await assertAdmin();

  await prisma.project.delete({ where: { id: projectId } });
  revalidatePath("/projects");
  revalidatePath("/");
  redirect("/projects");
}

export async function createAnnouncement(formData: FormData) {
  await assertAdmin();

  const message = (formData.get("message") ?? "").toString().trim();
  if (!message) return;

  await prisma.announcement.create({ data: { message } });
  revalidatePath("/announcements");
  revalidatePath("/");
}

export async function deleteAnnouncement(announcementId: string) {
  await assertAdmin();

  await prisma.announcement.delete({ where: { id: announcementId } });
  revalidatePath("/announcements");
  revalidatePath("/");
}

function revalidateTransformerPaths() {
  revalidatePath("/transformers");
  revalidatePath("/");
}

export async function createTransformer(formData: FormData) {
  await assertAdmin();

  const name = (formData.get("name") ?? "").toString().trim();
  if (!name) {
    throw new Error("שם השנאי הוא שדה חובה");
  }

  const last = await prisma.transformer.findFirst({
    orderBy: { order: "desc" },
  });

  await prisma.transformer.create({
    data: { name, order: (last?.order ?? 0) + 1 },
  });
  revalidateTransformerPaths();
}

export async function updateTransformerReading(
  transformerId: string,
  formData: FormData,
) {
  await assertAdmin();

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
  await assertAdmin();

  await prisma.transformer.delete({ where: { id: transformerId } });
  revalidateTransformerPaths();
}

function revalidateProviderPaths() {
  revalidatePath("/providers");
}

export async function createServiceCategory(formData: FormData) {
  await assertAdmin();

  const name = (formData.get("name") ?? "").toString().trim();
  if (!name) {
    throw new Error("שם התחום הוא שדה חובה");
  }

  const last = await prisma.serviceCategory.findFirst({
    orderBy: { order: "desc" },
  });

  await prisma.serviceCategory.create({
    data: { name, order: (last?.order ?? 0) + 1 },
  });
  revalidateProviderPaths();
}

export async function deleteServiceCategory(categoryId: string) {
  await assertAdmin();

  await prisma.serviceCategory.delete({ where: { id: categoryId } });
  revalidateProviderPaths();
}

export async function createServiceCompany(
  categoryId: string,
  formData: FormData,
) {
  await assertAdmin();

  const name = (formData.get("name") ?? "").toString().trim();
  if (!name) {
    throw new Error("שם הספק הוא שדה חובה");
  }

  const last = await prisma.serviceCompany.findFirst({
    where: { categoryId },
    orderBy: { order: "desc" },
  });

  await prisma.serviceCompany.create({
    data: { name, categoryId, order: (last?.order ?? 0) + 1 },
  });
  revalidateProviderPaths();
}

export async function deleteServiceCompany(companyId: string) {
  await assertAdmin();

  await prisma.serviceCompany.delete({ where: { id: companyId } });
  revalidateProviderPaths();
}

export async function createServiceContact(
  companyId: string,
  formData: FormData,
) {
  await assertAdmin();

  const name = (formData.get("name") ?? "").toString().trim();
  if (!name) {
    throw new Error("שם איש הקשר הוא שדה חובה");
  }

  await prisma.serviceContact.create({
    data: {
      name,
      role: asOrNull(formData.get("role")),
      phone: asOrNull(formData.get("phone")),
      companyId,
    },
  });
  revalidateProviderPaths();
}

export async function deleteServiceContact(contactId: string) {
  await assertAdmin();

  await prisma.serviceContact.delete({ where: { id: contactId } });
  revalidateProviderPaths();
}
