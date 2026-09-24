"use client";

import { useState } from "react";

type Contact = { id: string; name: string; role: string | null; phone: string | null };
type Company = { id: string; name: string; contacts: Contact[] };
type Category = { id: string; name: string; companies: Company[] };

export function ServiceProviderPicker({ categories }: { categories: Category[] }) {
  const [isOpen, setIsOpen] = useState(false);
  const [categoryId, setCategoryId] = useState<string | null>(null);
  const [companyId, setCompanyId] = useState<string | null>(null);

  function close() {
    setIsOpen(false);
    setCategoryId(null);
    setCompanyId(null);
  }

  const category = categories.find((c) => c.id === categoryId) ?? null;
  const company = category?.companies.find((c) => c.id === companyId) ?? null;

  return (
    <>
      <button
        type="button"
        onClick={() => setIsOpen(true)}
        className="flex items-center gap-1.5 rounded-full border border-violet-700 bg-violet-950/60 px-3 py-1 text-sm font-medium text-violet-300 transition-colors hover:bg-violet-900"
      >
        <span>🛠️</span> נותני שירות
      </button>

      {isOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4"
          onClick={close}
        >
          <div
            className="w-full max-w-md rounded-xl border border-slate-700 bg-slate-900 p-5 text-white"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="mb-4 flex items-center justify-between">
              <h3 className="text-lg font-bold text-violet-300">נותני שירות</h3>
              <button
                type="button"
                onClick={close}
                className="text-slate-400 hover:text-white"
              >
                ✕
              </button>
            </div>

            {!category && (
              <div className="space-y-2">
                <p className="text-sm text-slate-400">בחר תחום:</p>
                {categories.length === 0 ? (
                  <p className="text-sm text-slate-500">אין תחומים רשומים</p>
                ) : (
                  categories.map((c) => (
                    <button
                      key={c.id}
                      type="button"
                      onClick={() => setCategoryId(c.id)}
                      className="block w-full rounded-lg bg-slate-800 px-4 py-2 text-right hover:bg-slate-700"
                    >
                      {c.name}
                    </button>
                  ))
                )}
              </div>
            )}

            {category && !company && (
              <div className="space-y-2">
                <button
                  type="button"
                  onClick={() => setCategoryId(null)}
                  className="mb-2 text-sm text-violet-300 hover:underline"
                >
                  ← חזרה לתחומים
                </button>
                <p className="text-sm text-slate-400">{category.name} — בחר ספק:</p>
                {category.companies.length === 0 ? (
                  <p className="text-sm text-slate-500">אין ספקים בתחום זה</p>
                ) : (
                  category.companies.map((co) => (
                    <button
                      key={co.id}
                      type="button"
                      onClick={() => setCompanyId(co.id)}
                      className="block w-full rounded-lg bg-slate-800 px-4 py-2 text-right hover:bg-slate-700"
                    >
                      {co.name}
                    </button>
                  ))
                )}
              </div>
            )}

            {category && company && (
              <div className="space-y-2">
                <button
                  type="button"
                  onClick={() => setCompanyId(null)}
                  className="mb-2 text-sm text-violet-300 hover:underline"
                >
                  ← חזרה לספקים
                </button>
                <p className="text-sm text-slate-400">{company.name} — אנשי קשר:</p>
                {company.contacts.length === 0 ? (
                  <p className="text-sm text-slate-500">אין אנשי קשר רשומים</p>
                ) : (
                  company.contacts.map((contact) => (
                    <div
                      key={contact.id}
                      className="rounded-lg bg-slate-800 px-4 py-2"
                    >
                      <div className="font-medium">
                        {contact.name}
                        {contact.role ? (
                          <span className="text-slate-400"> ({contact.role})</span>
                        ) : null}
                      </div>
                      {contact.phone ? (
                        <a
                          href={`tel:${contact.phone}`}
                          dir="ltr"
                          className="mt-1 inline-flex items-center gap-1 text-sm text-emerald-300 hover:underline"
                        >
                          📞 {contact.phone}
                        </a>
                      ) : (
                        <div className="text-sm text-slate-500">אין מספר טלפון</div>
                      )}
                    </div>
                  ))
                )}
              </div>
            )}
          </div>
        </div>
      )}
    </>
  );
}
