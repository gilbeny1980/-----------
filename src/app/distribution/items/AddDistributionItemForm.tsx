"use client";

import { useRef } from "react";
import { createDistributionItem } from "@/app/actions";

export function AddDistributionItemForm() {
  const formRef = useRef<HTMLFormElement>(null);

  return (
    <form
      ref={formRef}
      action={async (formData: FormData) => {
        await createDistributionItem(formData);
        formRef.current?.reset();
      }}
      className="flex flex-wrap items-end gap-3 rounded-lg border border-slate-200 bg-white p-4 shadow-sm"
    >
      <label className="flex-1 min-w-[10rem]">
        <span className="mb-1 block text-sm font-medium text-slate-700">
          שם פריט *
        </span>
        <input
          name="name"
          required
          className="input"
          placeholder="לדוגמה: נורת LED"
        />
      </label>
      <label className="w-32">
        <span className="mb-1 block text-sm font-medium text-slate-700">
          יחידה
        </span>
        <input name="unit" className="input" placeholder="יח'" />
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
