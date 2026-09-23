"use client";

import { useRef } from "react";
import { createServiceCategory } from "@/app/actions";

export function AddCategoryForm() {
  const formRef = useRef<HTMLFormElement>(null);

  return (
    <form
      ref={formRef}
      action={async (formData: FormData) => {
        await createServiceCategory(formData);
        formRef.current?.reset();
      }}
      className="flex flex-wrap items-end gap-3 rounded-lg border border-slate-200 bg-white p-4 shadow-sm"
    >
      <label className="flex-1 min-w-[10rem]">
        <span className="mb-1 block text-sm font-medium text-slate-700">
          תחום חדש
        </span>
        <input name="name" required className="input" placeholder="לדוגמה: אינסטלציה" />
      </label>
      <button
        type="submit"
        className="rounded-md bg-slate-900 px-4 py-2 font-medium text-white hover:bg-slate-800"
      >
        הוספה
      </button>
    </form>
  );
}
