"use client";

import { useRef } from "react";
import { updateAdminUserPassword } from "@/app/actions";

export function ResetPasswordForm({ userId }: { userId: string }) {
  const formRef = useRef<HTMLFormElement>(null);
  const action = updateAdminUserPassword.bind(null, userId);

  return (
    <form
      ref={formRef}
      action={async (formData: FormData) => {
        await action(formData);
        formRef.current?.reset();
      }}
      className="flex items-center gap-2"
    >
      <input
        type="password"
        name="password"
        required
        className="input"
        placeholder="סיסמה חדשה"
      />
      <button
        type="submit"
        className="rounded-md border border-slate-300 px-3 py-1.5 text-sm hover:bg-slate-50"
      >
        עדכון סיסמה
      </button>
    </form>
  );
}
