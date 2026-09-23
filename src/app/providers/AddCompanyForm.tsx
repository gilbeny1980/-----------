"use client";

import { useRef } from "react";
import { createServiceCompany } from "@/app/actions";

export function AddCompanyForm({ categoryId }: { categoryId: string }) {
  const formRef = useRef<HTMLFormElement>(null);
  const action = createServiceCompany.bind(null, categoryId);

  return (
    <form
      ref={formRef}
      action={async (formData: FormData) => {
        await action(formData);
        formRef.current?.reset();
      }}
      className="flex flex-wrap items-end gap-2"
    >
      <label className="flex-1 min-w-[8rem]">
        <input name="name" required className="input" placeholder="שם ספק שירות חדש" />
      </label>
      <button
        type="submit"
        className="rounded-md border border-slate-300 px-3 py-1.5 text-sm hover:bg-slate-50"
      >
        הוספת ספק
      </button>
    </form>
  );
}
