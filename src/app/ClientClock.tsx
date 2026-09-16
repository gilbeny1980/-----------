"use client";

import { useSyncExternalStore } from "react";

function subscribe(callback: () => void) {
  const id = setInterval(callback, 1000);
  return () => clearInterval(id);
}

function getSnapshot() {
  return Date.now();
}

function getServerSnapshot() {
  return 0;
}

export function ClientClock() {
  const now = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);

  if (now === 0) return null;

  const date = new Date(now);

  return (
    <div className="text-left" dir="ltr">
      <div className="text-3xl font-bold tabular-nums">
        {date.toLocaleTimeString("he-IL", { hour: "2-digit", minute: "2-digit" })}
      </div>
      <div className="text-sm text-slate-400">
        {date.toLocaleDateString("he-IL", {
          weekday: "long",
          day: "2-digit",
          month: "2-digit",
          year: "numeric",
        })}
      </div>
    </div>
  );
}
