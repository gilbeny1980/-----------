"use client";

import { useState } from "react";
import { updateWorkOrdersTitle } from "@/app/actions";

export function WorkOrdersTitleForm({ title }: { title: string }) {
  const [isEditing, setIsEditing] = useState(false);

  if (!isEditing) {
    return (
      <div className="flex items-center gap-2">
        <h1 className="text-xl font-bold">{title}</h1>
        <button
          type="button"
          onClick={() => setIsEditing(true)}
          className="text-xs text-blue-600 hover:underline"
        >
          שינוי כותרת
        </button>
      </div>
    );
  }

  return (
    <form
      action={async (formData: FormData) => {
        await updateWorkOrdersTitle(formData);
        setIsEditing(false);
      }}
      className="flex flex-wrap items-center gap-2"
    >
      <input
        name="workOrdersTitle"
        required
        defaultValue={title}
        autoFocus
        className="input text-xl font-bold"
      />
      <button
        type="submit"
        className="rounded-md border border-slate-300 px-3 py-1.5 text-sm hover:bg-slate-50"
      >
        שמירה
      </button>
      <button
        type="button"
        onClick={() => setIsEditing(false)}
        className="text-sm text-slate-500 hover:underline"
      >
        ביטול
      </button>
    </form>
  );
}
