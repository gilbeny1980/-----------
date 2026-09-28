type FeedItem = { id: string; message: string };

export function UpdatesTicker({ items }: { items: FeedItem[] }) {
  if (items.length === 0) {
    return null;
  }

  const renderItems = (keyPrefix: string) =>
    items.map((item, i) => (
      <span key={`${keyPrefix}-${item.id}`} className="flex items-center">
        {i > 0 && <span className="mx-6 text-blue-500">•</span>}
        {item.message}
      </span>
    ));

  return (
    <div className="relative min-w-0 flex-1 overflow-hidden">
      <div className="ticker-track flex w-max items-center whitespace-nowrap text-sm font-medium text-blue-200">
        <span className="flex items-center pe-12">{renderItems("a")}</span>
        <span className="flex items-center pe-12" aria-hidden>
          {renderItems("b")}
        </span>
      </div>
      <style>{`
        .ticker-track {
          animation: ticker-scroll 25s linear infinite;
        }
        @keyframes ticker-scroll {
          from { transform: translateX(-50%); }
          to { transform: translateX(0); }
        }
      `}</style>
    </div>
  );
}
