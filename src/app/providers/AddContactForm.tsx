"use client";

import { useRef } from "react";
import { createServiceContact } from "@/app/actions";

export function AddContactForm({ companyId }: { companyId: string }) {
  const formRef = useRef<HTMLFormElement>(null);
  const action = createServiceContact.bind(null, companyId);

  return (
    <form
      ref={formRef}
      action={async (formData: FormData) => {
        await action(formData);
        formRef.current?.reset();
      }}
      className="flex flex-wrap items-end gap-2"
    >
      <input name="name" required className="input flex-1 min-w-[7rem]" placeholder="שם איש קשר" />
      <input name="phone" dir="ltr" className="input flex-1 min-w-[7rem]" placeholder="טלפון" />
      <button
        type="submit"
        className="rounded-md border border-slate-300 px-3 py-1.5 text-sm hover:bg-slate-50"
      >
        הוספה
      </button>
    </form>
  );
}
