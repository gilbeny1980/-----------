import { prisma } from "@/lib/prisma";
import { LoginForm } from "./LoginForm";
import { SetupAdminForm } from "./SetupAdminForm";

export default async function LoginPage() {
  const adminCount = await prisma.adminUser.count();

  return (
    <div className="flex flex-1 items-center justify-center bg-slate-950 p-4">
      {adminCount === 0 ? <SetupAdminForm /> : <LoginForm />}
    </div>
  );
}
