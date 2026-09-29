type FeedItem = { id: string; message: string };

export function UpdatesTicker({ items }: { items: FeedItem[] }) {
  if (items.length === 0) {
    return null;
  }

  const durationSeconds = Math.max(items.length * 3, 6);

  const renderItems = (keyPrefix: string) =>
    items.map((item) => (
      <div
        key={`${keyPrefix}-${item.id}`}
        className="flex h-12 items-center justify-center truncate px-2 mb-6 text-3xl font-bold text-blue-200"
      >
        {item.message}
      </div>
    ));

  return (
    <div className="relative h-12 w-full shrink-0 overflow-hidden sm:w-auto sm:flex-1">
      <div
        className="ticker-track-vertical"
        style={{ animationDuration: `${durationSeconds}s` }}
      >
        {renderItems("a")}
        {renderItems("b")}
      </div>
      <style>{`
        .ticker-track-vertical {
          animation-name: ticker-scroll-vertical;
          animation-timing-function: linear;
          animation-iteration-count: infinite;
        }
        @keyframes ticker-scroll-vertical {
          from { transform: translateY(0); }
          to { transform: translateY(-50%); }
        }
      `}</style>
    </div>
  );
}
