type FeedItem = { id: string; message: string };

export function UpdatesTicker({ items }: { items: FeedItem[] }) {
  if (items.length === 0) {
    return null;
  }

  const text = items.map((i) => i.message).join("      •      ");

  return (
    <div className="relative min-w-0 flex-1 overflow-hidden">
      <div className="ticker-track flex w-max whitespace-nowrap text-sm font-medium text-blue-200">
        <span className="pe-12">{text}</span>
        <span className="pe-12" aria-hidden>
          {text}
        </span>
      </div>
      <style>{`
        .ticker-track {
          animation: ticker-scroll 25s linear infinite;
        }
        @keyframes ticker-scroll {
          from { transform: translateX(0); }
          to { transform: translateX(-50%); }
        }
      `}</style>
    </div>
  );
}
