"use client";

import { useRef } from "react";
import { createDistributionRecord } from "@/app/actions";

type Item = { id: string; name: string; unit: string | null };

export function AddDistributionForm({ items }: { items: Item[] }) {
  const formRef = useRef<HTMLFormElement>(null);

  return (
    <form
      ref={formRef}
      action={async (formData: FormData) => {
        await createDistributionRecord(formData);
        formRef.current?.reset();
      }}
      className="flex flex-wrap items-end gap-3 rounded-lg border border-slate-200 bg-white p-4 shadow-sm"
    >
      <label className="flex-1 min-w-[10rem]">
        <span className="mb-1 block text-sm font-medium text-slate-700">
          מי לקח *
        </span>
        <input
          name="recipient"
          required
          list="distribution-recipients"
          className="input"
          placeholder="שם החשמלאי / המחלקה"
        />
      </label>
      <label className="flex-1 min-w-[10rem]">
        <span className="mb-1 block text-sm font-medium text-slate-700">
          פריט *
        </span>
        <select name="itemId" required className="input" defaultValue="">
          <option value="" disabled>
            בחר פריט
          </option>
          {items.map((item) => (
            <option key={item.id} value={item.id}>
              {item.name}
              {item.unit ? ` (${item.unit})` : ""}
            </option>
          ))}
        </select>
      </label>
      <label className="w-28">
        <span className="mb-1 block text-sm font-medium text-slate-700">
          כמות *
        </span>
        <input
          type="number"
          name="quantity"
          required
          min="0"
          step="any"
          className="input"
        />
      </label>
      <label className="flex-1 min-w-[10rem]">
        <span className="mb-1 block text-sm font-medium text-slate-700">
          הערה
        </span>
        <input name="note" className="input" />
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
