"use client";

import { useRef } from "react";

export function CommentForm({
  action,
}: {
  action: (formData: FormData) => Promise<void>;
}) {
  const formRef = useRef<HTMLFormElement>(null);

  return (
    <form
      ref={formRef}
      action={async (formData: FormData) => {
        await action(formData);
        formRef.current?.reset();
      }}
      className="mb-4 flex gap-2"
    >
      <input name="body" required className="input" placeholder="הוספת הערה..." />
      <button
        type="submit"
        className="shrink-0 rounded-md bg-slate-900 px-4 py-2 text-sm font-medium text-white hover:bg-slate-800"
      >
        הוספה
      </button>
    </form>
  );
}
