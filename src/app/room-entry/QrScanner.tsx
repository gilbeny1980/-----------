"use client";

import { useActionState, useEffect, useState } from "react";
import { Html5Qrcode, Html5QrcodeScannerState } from "html5-qrcode";
import { logRoomEntry, type RoomEntryState } from "@/app/actions";

const SCANNER_ELEMENT_ID = "qr-scanner-region";
const initialState: RoomEntryState = {};

export function QrScanner() {
  const [phase, setPhase] = useState<"idle" | "scanning" | "scanned">("idle");
  const [scannedCode, setScannedCode] = useState<string | null>(null);
  const [scanError, setScanError] = useState<string | null>(null);
  const [state, formAction, isPending] = useActionState(
    logRoomEntry,
    initialState,
  );

  useEffect(() => {
    if (phase !== "scanning") return;

    // The native browser BarcodeDetector API (used when
    // useBarCodeDetectorIfSupported is true) varies a lot in quality across
    // Android vendors and can perform worse than the bundled JS decoder on
    // real-world photos (skewed angle, printed paper). Safari doesn't
    // support it at all, so iOS always uses the JS decoder - keeping both
    // platforms on the same decoder avoids this inconsistency.
    const scanner = new Html5Qrcode(SCANNER_ELEMENT_ID, {
      useBarCodeDetectorIfSupported: false,
      verbose: false,
    });
    let stopped = false;
    let cancelled = false;

    const onDecoded = (decodedText: string) => {
      if (!stopped) {
        stopped = true;
        setScannedCode(decodedText);
        setPhase("scanned");
      }
    };

    const baseVideoConstraints = {
      facingMode: "environment",
      width: { ideal: 1920 },
      height: { ideal: 1080 },
    };

    // Try the best config first (higher resolution + continuous autofocus),
    // then fall back to progressively simpler ones - some browsers (notably
    // some Android/Chrome camera stacks) reject the whole camera request if
    // an "advanced" constraint isn't recognized, instead of ignoring it.
    const attempts = [
      {
        fps: 10,
        qrbox: { width: 250, height: 250 },
        videoConstraints: {
          ...baseVideoConstraints,
          advanced: [{ focusMode: "continuous" }],
        } as unknown as MediaTrackConstraints,
      },
      {
        fps: 10,
        qrbox: { width: 250, height: 250 },
        videoConstraints: baseVideoConstraints,
      },
      {
        fps: 10,
        qrbox: { width: 250, height: 250 },
      },
    ];

    async function startWithFallback() {
      for (const config of attempts) {
        if (cancelled) return;
        try {
          await scanner.start(
            { facingMode: "environment" },
            config,
            onDecoded,
            () => {},
          );
          return;
        } catch {
          // try the next, simpler config
        }
      }
      if (!cancelled) {
        setScanError("לא ניתן לגשת למצלמה. יש לאשר הרשאת מצלמה בדפדפן.");
        setPhase("idle");
      }
    }

    startWithFallback();

    return () => {
      stopped = true;
      cancelled = true;
      try {
        if (scanner.getState() === Html5QrcodeScannerState.SCANNING) {
          scanner.stop().catch(() => {});
        }
      } catch {
        // scanner never started successfully; nothing to stop
      }
    };
  }, [phase]);

  if (state.success) {
    return (
      <div className="rounded-xl border border-emerald-700 bg-emerald-950/40 p-6 text-center">
        <p className="text-lg font-bold text-emerald-300">{state.success}</p>
        <button
          type="button"
          onClick={() => {
            setScannedCode(null);
            setPhase("idle");
            window.location.reload();
          }}
          className="mt-4 rounded-md bg-slate-800 px-4 py-2 text-sm font-medium text-white hover:bg-slate-700"
        >
          סריקה נוספת
        </button>
      </div>
    );
  }

  if (phase === "scanned" && scannedCode) {
    return (
      <form action={formAction} className="space-y-4">
        <input type="hidden" name="qrCode" value={scannedCode} />
        <p className="text-center text-sm text-slate-400">
          קוד נסרק בהצלחה. יש למלא את הפרטים לאישור הכניסה.
        </p>
        <input
          name="phone"
          dir="ltr"
          required
          autoFocus
          placeholder="מספר טלפון"
          className="input w-full text-center text-lg"
        />
        <div className="space-y-2 rounded-lg border border-slate-700 bg-slate-900/60 p-3">
          <label className="flex items-center gap-2 text-sm">
            <input type="checkbox" name="roomClean" className="h-4 w-4" />
            החדר נקי
          </label>
          <label className="flex items-center gap-2 text-sm">
            <input type="checkbox" name="acWorking" className="h-4 w-4" />
            המזגן עובד
          </label>
          <textarea
            name="notes"
            placeholder="הערות (לא חובה)"
            rows={3}
            className="input w-full resize-none"
          />
        </div>
        {state.error && (
          <p className="text-center text-sm text-red-400">{state.error}</p>
        )}
        <button
          type="submit"
          disabled={isPending}
          className="w-full rounded-md bg-emerald-600 px-4 py-3 font-bold text-white hover:bg-emerald-500 disabled:opacity-50"
        >
          {isPending ? "שומר..." : "אישור כניסה"}
        </button>
        <button
          type="button"
          onClick={() => {
            setScannedCode(null);
            setPhase("idle");
          }}
          className="w-full text-center text-sm text-slate-500 hover:underline"
        >
          סריקה מחדש
        </button>
      </form>
    );
  }

  if (phase === "scanning") {
    return (
      <div className="space-y-3">
        <div
          id={SCANNER_ELEMENT_ID}
          className="mx-auto w-full max-w-sm overflow-hidden rounded-xl"
        />
        <p className="text-center text-sm text-slate-400">
          כוונו את המצלמה לקוד ה-QR שעל דלת חדר החשמל
        </p>
        <button
          type="button"
          onClick={() => setPhase("idle")}
          className="w-full text-center text-sm text-slate-500 hover:underline"
        >
          ביטול
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <button
        type="button"
        onClick={() => {
          setScanError(null);
          setPhase("scanning");
        }}
        className="w-full rounded-md bg-emerald-600 px-4 py-3 font-bold text-white hover:bg-emerald-500"
      >
        📷 סריקת QR לכניסה
      </button>
      {scanError && <p className="text-center text-sm text-red-400">{scanError}</p>}
    </div>
  );
}
