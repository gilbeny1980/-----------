import { prisma } from "@/lib/prisma";
import { deleteAdminUser } from "@/app/actions";
import { formatDateTime } from "@/lib/labels";
import { AddAdminUserForm } from "./AddAdminUserForm";
import { ResetPasswordForm } from "./ResetPasswordForm";

export default async function AdminUsersPage() {
  const users = await prisma.adminUser.findMany({
    orderBy: { createdAt: "asc" },
  });

  return (
    <div className="mx-auto max-w-2xl w-full px-4 py-6 space-y-6">
      <h1 className="text-xl font-bold">משתמשי מנהל</h1>
      <p className="text-sm text-slate-500">
        משתמשים שיכולים להתחבר ולנהל את כל דפי המערכת.
      </p>

      <AddAdminUserForm />

      <div className="rounded-lg border border-slate-200 bg-white shadow-sm divide-y divide-slate-100">
        {users.map((user) => (
          <div key={user.id} className="flex flex-wrap items-center justify-between gap-2 p-4">
            <div>
              <div className="font-medium">{user.username}</div>
              <div className="text-xs text-slate-400">
                נוצר: {formatDateTime(user.createdAt)}
              </div>
            </div>
            <div className="flex items-center gap-2">
              <ResetPasswordForm userId={user.id} />
              {users.length > 1 && (
                <form action={deleteAdminUser.bind(null, user.id)}>
                  <button
                    type="submit"
                    className="rounded-md border border-red-300 px-3 py-1.5 text-sm text-red-700 hover:bg-red-50"
                  >
                    מחיקה
                  </button>
                </form>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
