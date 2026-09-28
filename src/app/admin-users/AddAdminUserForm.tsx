"use client";

import { useRef } from "react";
import { createAdminUser } from "@/app/actions";

export function AddAdminUserForm() {
  const formRef = useRef<HTMLFormElement>(null);

  return (
    <form
      ref={formRef}
      action={async (formData: FormData) => {
        await createAdminUser(formData);
        formRef.current?.reset();
      }}
      className="flex flex-wrap items-end gap-2"
    >
      <input
        name="username"
        required
        className="input flex-1 min-w-[8rem]"
        placeholder="שם משתמש"
      />
      <input
        type="password"
        name="password"
        required
        className="input flex-1 min-w-[8rem]"
        placeholder="סיסמה"
      />
      <button
        type="submit"
        className="rounded-md border border-slate-300 px-3 py-1.5 text-sm hover:bg-slate-50"
      >
        הוספת משתמש
      </button>
    </form>
  );
}
