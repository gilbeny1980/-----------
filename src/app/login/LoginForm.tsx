"use client";

import { useActionState } from "react";
import { loginAdmin, type LoginState } from "@/app/actions";

const initialState: LoginState = {};

export function LoginForm() {
  const [state, formAction, isPending] = useActionState(
    loginAdmin,
    initialState,
  );

  return (
    <form
      action={formAction}
      className="w-full max-w-sm space-y-4 rounded-xl border border-slate-800 bg-slate-900 p-6 text-white"
    >
      <h1 className="text-lg font-bold">כניסת מנהל</h1>
      <input
        name="username"
        required
        autoFocus
        placeholder="שם משתמש"
        className="w-full rounded-md border border-slate-700 bg-slate-800 px-3 py-2 text-white placeholder:text-slate-500"
      />
      <input
        type="password"
        name="password"
        required
        placeholder="סיסמה"
        className="w-full rounded-md border border-slate-700 bg-slate-800 px-3 py-2 text-white placeholder:text-slate-500"
      />
      {state.error && <p className="text-sm text-red-400">{state.error}</p>}
      <button
        type="submit"
        disabled={isPending}
        className="w-full rounded-md bg-amber-500 px-4 py-2 font-medium text-slate-900 hover:bg-amber-400 disabled:opacity-50"
      >
        {isPending ? "מתחבר..." : "כניסה"}
      </button>
    </form>
  );
}
