"use client";

import { useEffect, useState } from "react";

type BeforeInstallPromptEvent = Event & {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
};

function isStandalone(): boolean {
  if (typeof window === "undefined") return false;
  const nav = navigator as Navigator & { standalone?: boolean };
  return (
    window.matchMedia("(display-mode: standalone)").matches ||
    nav.standalone === true
  );
}

function isIos(): boolean {
  if (typeof navigator === "undefined") return false;
  return /iphone|ipad|ipod/i.test(navigator.userAgent);
}

const buttonClass =
  "rounded-md border-2 border-neutral-500 bg-neutral-600 px-6 py-3 text-base font-bold text-neutral-50 shadow-[inset_0_1px_0_rgba(255,255,255,0.2),inset_0_-2px_0_rgba(0,0,0,0.35)] transition-colors hover:bg-neutral-500 active:shadow-[inset_0_1px_2px_rgba(0,0,0,0.4)]";

export function InstallAppButton() {
  const [deferredPrompt, setDeferredPrompt] =
    useState<BeforeInstallPromptEvent | null>(null);
  const [showButton, setShowButton] = useState(false);
  const [showIosHelp, setShowIosHelp] = useState(false);

  useEffect(() => {
    if (isStandalone()) return;

    if (isIos()) {
      setShowButton(true);
      return;
    }

    const handler = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e as BeforeInstallPromptEvent);
      setShowButton(true);
    };
    window.addEventListener("beforeinstallprompt", handler);
    return () => window.removeEventListener("beforeinstallprompt", handler);
  }, []);

  if (!showButton) return null;

  const handleClick = async () => {
    if (deferredPrompt) {
      await deferredPrompt.prompt();
      await deferredPrompt.userChoice;
      setDeferredPrompt(null);
      setShowButton(false);
      return;
    }
    setShowIosHelp(true);
  };

  return (
    <>
      <button type="button" onClick={handleClick} className={buttonClass}>
        התקן אפליקציה
      </button>

      {showIosHelp && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4"
          onClick={() => setShowIosHelp(false)}
        >
          <div
            className="max-w-sm rounded-xl border border-slate-700 bg-slate-900 p-5 text-right text-white"
            onClick={(e) => e.stopPropagation()}
          >
            <h3 className="mb-3 text-lg font-bold">התקנת האפליקציה באייפון</h3>
            <ol className="list-inside list-decimal space-y-2 text-sm text-slate-200">
              <li>לחץ על כפתור השיתוף ⬆️ בסרגל הכלים של ספארי</li>
              <li>גלול ברשימה ובחר &quot;הוסף למסך הבית&quot;</li>
              <li>לחץ &quot;הוסף&quot; בפינה הימנית העליונה</li>
            </ol>
            <button
              type="button"
              onClick={() => setShowIosHelp(false)}
              className="mt-4 w-full rounded-md border-2 border-neutral-500 bg-neutral-600 px-4 py-2 text-sm font-bold text-neutral-50"
            >
              הבנתי
            </button>
          </div>
        </div>
      )}
    </>
  );
}
