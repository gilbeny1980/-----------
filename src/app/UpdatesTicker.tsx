"use client";

import { useEffect, useState } from "react";
import { formatRelativeTime } from "@/lib/labels";

type FeedItem = { id: string; message: string; createdAt: Date };

export function UpdatesTicker({ items }: { items: FeedItem[] }) {
  const [index, setIndex] = useState(0);

  useEffect(() => {
    if (items.length <= 1) return;
    const interval = setInterval(() => {
      setIndex((i) => (i + 1) % items.length);
    }, 5000);
    return () => clearInterval(interval);
  }, [items.length]);

  if (items.length === 0) {
    return <p className="text-sm text-slate-400">אין עדכונים עדיין</p>;
  }

  const item = items[index % items.length];

  return (
    <div className="flex flex-1 flex-col items-center justify-center gap-3 text-center">
      <div key={item.id} className="text-lg">
        {item.message}
      </div>
      <div className="text-xs text-slate-500">
        {formatRelativeTime(item.createdAt)}
      </div>
      {items.length > 1 && (
        <div className="flex gap-1.5">
          {items.map((it, i) => (
            <span
              key={it.id}
              className={`h-1.5 w-1.5 rounded-full ${
                i === index ? "bg-blue-400" : "bg-slate-700"
              }`}
            />
          ))}
        </div>
      )}
    </div>
  );
}
