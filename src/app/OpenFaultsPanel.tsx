"use client";

import { useEffect, useState } from "react";

const OPEN_FAULTS_URL = "http://10.1.61.15:8084/todayservcalls";
const REFRESH_INTERVAL_MS = 30000;

type ServiceCall = {
  DOCNO?: string;
  CURDATE?: string;
  FINAL?: string;
  ROTL_FINAL?: string;
  CANCEL?: string;
  CallTypeCode?: string;
  PARTNAME?: string;
  PARTDES?: string;
};

function isElectricalCall(item: ServiceCall): boolean {
  const code = (item.CallTypeCode ?? "").trim();
  return code.includes("חשמל") && code.includes("מכשור");
}

function isOpenCall(item: ServiceCall): boolean {
  const final = (item.FINAL ?? "").trim();
  const cancel = (item.CANCEL ?? "").trim();
  return final === "" && cancel === "";
}

export function OpenFaultsPanel() {
  const [faults, setFaults] = useState<ServiceCall[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      try {
        const res = await fetch(OPEN_FAULTS_URL, { cache: "no-store" });
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const data: ServiceCall[] = await res.json();
        if (cancelled) return;
        setFaults(data.filter((item) => isElectricalCall(item) && isOpenCall(item)));
        setError(null);
      } catch {
        if (cancelled) return;
        setError(
          "לא ניתן להתחבר למערכת התקלות. ודאו שהמסך מחובר לרשת המקומית, ושבדפדפן מאופשר תוכן לא מאובטח (HTTP) עבור אתר זה.",
        );
      }
    }

    load();
    const interval = setInterval(load, REFRESH_INTERVAL_MS);
    return () => {
      cancelled = true;
      clearInterval(interval);
    };
  }, []);

  return (
    <section className="mx-4 mt-4 rounded-xl border border-slate-800 bg-slate-900 p-4">
      <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
        <h2 className="flex items-center gap-2 text-lg font-bold text-red-300">
          <span>⚠️</span> תקלות פתוחות - מחלקת חשמל
        </h2>
        {faults && (
          <span className="rounded-full border border-red-800 bg-red-950/60 px-3 py-1 text-sm font-bold text-red-300">
            {faults.length} פתוחות
          </span>
        )}
      </div>

      {error && <p className="text-sm text-red-400">{error}</p>}

      {!error && faults === null && (
        <p className="text-sm text-slate-400">טוען נתונים...</p>
      )}

      {!error && faults && faults.length === 0 && (
        <p className="text-sm text-slate-400">אין תקלות פתוחות</p>
      )}

      {!error && faults && faults.length > 0 && (
        <div className="max-h-64 space-y-2 overflow-y-auto">
          {faults.map((f) => (
            <div
              key={f.DOCNO}
              className="rounded-lg border border-slate-800 bg-slate-800/60 p-2 text-sm"
            >
              <div className="flex flex-wrap items-center justify-between gap-2">
                <span className="font-bold text-slate-200">{f.PARTNAME}</span>
                <span className="text-xs text-slate-500" dir="ltr">
                  {f.DOCNO}
                </span>
              </div>
              {f.PARTDES && (
                <div className="text-xs text-slate-400">{f.PARTDES}</div>
              )}
            </div>
          ))}
        </div>
      )}
    </section>
  );
}
