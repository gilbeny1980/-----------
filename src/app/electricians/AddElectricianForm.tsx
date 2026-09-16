"use client";

import { useRef } from "react";
import { createElectrician } from "@/app/actions";

export function AddElectricianForm() {
  const formRef = useRef<HTMLFormElement>(null);

  return (
    <form
      ref={formRef}
      action={async (formData: FormData) => {
        await createElectrician(formData);
        formRef.current?.reset();
      }}
      className="flex flex-wrap items-end gap-3 rounded-lg border border-slate-200 bg-white p-4 shadow-sm"
    >
      <label className="flex-1 min-w-[10rem]">
        <span className="mb-1 block text-sm font-medium text-slate-700">שם *</span>
        <input name="name" required className="input" />
      </label>
      <label className="flex-1 min-w-[10rem]">
        <span className="mb-1 block text-sm font-medium text-slate-700">טלפון</span>
        <input name="phone" dir="ltr" className="input" />
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
