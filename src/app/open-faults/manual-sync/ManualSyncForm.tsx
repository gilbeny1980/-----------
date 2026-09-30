"use client";

import { useActionState } from "react";
import {
  syncOpenFaultsManually,
  type ManualFaultsSyncState,
} from "@/app/actions";

const initialState: ManualFaultsSyncState = {};

export function ManualSyncForm() {
  const [state, formAction, isPending] = useActionState(
    syncOpenFaultsManually,
    initialState,
  );

  return (
    <form action={formAction} className="space-y-4">
      <textarea
        name="rawData"
        rows={14}
        dir="ltr"
        placeholder='הדביקו כאן את כל הטקסט מהכתובת http://10.1.61.15:8084/todayservcalls'
        className="input w-full font-mono text-xs"
        required
      />
      {state.error && <p className="text-sm text-red-600">{state.error}</p>}
      {state.success && (
        <p className="text-sm text-emerald-600">{state.success}</p>
      )}
      <button
        type="submit"
        disabled={isPending}
        className="rounded-md bg-slate-900 px-4 py-2 text-sm font-medium text-white hover:bg-slate-800 disabled:opacity-50"
      >
        {isPending ? "מעדכן..." : "עדכון"}
      </button>
    </form>
  );
}
