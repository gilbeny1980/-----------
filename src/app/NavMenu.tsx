"use client";

import { useState } from "react";
import Link from "next/link";
import { logoutAdmin } from "@/app/actions";

export function NavMenu({ admin }: { admin: boolean }) {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => setIsOpen((v) => !v)}
        aria-label="תפריט"
        className="flex h-9 w-9 flex-col items-center justify-center gap-1.5 rounded-md hover:bg-white/10"
      >
        <span className="h-0.5 w-5 bg-white" />
        <span className="h-0.5 w-5 bg-white" />
        <span className="h-0.5 w-5 bg-white" />
      </button>

      {isOpen && (
        <>
          <div
            className="fixed inset-0 z-40"
            onClick={() => setIsOpen(false)}
          />
          <div className="absolute left-0 z-50 mt-2 w-48 overflow-hidden rounded-lg border border-slate-700 bg-slate-900 text-sm shadow-xl">
            {admin ? (
              <>
                <Link
                  href="/projects"
                  className="block px-4 py-2 hover:bg-slate-800"
                  onClick={() => setIsOpen(false)}
                >
                  פרויקטים
                </Link>
                <Link
                  href="/electricians"
                  className="block px-4 py-2 hover:bg-slate-800"
                  onClick={() => setIsOpen(false)}
                >
                  חשמלאים
                </Link>
                <Link
                  href="/announcements"
                  className="block px-4 py-2 hover:bg-slate-800"
                  onClick={() => setIsOpen(false)}
                >
                  הודעות
                </Link>
                <Link
                  href="/transformers"
                  className="block px-4 py-2 hover:bg-slate-800"
                  onClick={() => setIsOpen(false)}
                >
                  שנאים
                </Link>
                <Link
                  href="/providers"
                  className="block px-4 py-2 hover:bg-slate-800"
                  onClick={() => setIsOpen(false)}
                >
                  נותני שירות
                </Link>
                <Link
                  href="/work-orders"
                  className="block px-4 py-2 hover:bg-slate-800"
                  onClick={() => setIsOpen(false)}
                >
                  משימות
                </Link>
                <Link
                  href="/admin-users"
                  className="block px-4 py-2 hover:bg-slate-800"
                  onClick={() => setIsOpen(false)}
                >
                  משתמשי מנהל
                </Link>
                <form action={logoutAdmin} className="border-t border-slate-700">
                  <button
                    type="submit"
                    className="block w-full px-4 py-2 text-right text-red-400 hover:bg-slate-800"
                  >
                    יציאה
                  </button>
                </form>
              </>
            ) : (
              <Link
                href="/login"
                className="block px-4 py-2 hover:bg-slate-800"
                onClick={() => setIsOpen(false)}
              >
                כניסת מנהל
              </Link>
            )}
          </div>
        </>
      )}
    </div>
  );
}
