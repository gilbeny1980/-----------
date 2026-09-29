"use client";

import { useActionState, useEffect, useRef, useState } from "react";
import { Html5Qrcode, Html5QrcodeScannerState } from "html5-qrcode";
import { logRoomEntry, type RoomEntryState } from "@/app/actions";

const SCANNER_ELEMENT_ID = "qr-scanner-region";
const initialState: RoomEntryState = {};

export function QrScanner() {
  const [scannedCode, setScannedCode] = useState<string | null>(null);
  const [scanError, setScanError] = useState<string | null>(null);
  const scannerRef = useRef<Html5Qrcode | null>(null);
  const [state, formAction, isPending] = useActionState(
    logRoomEntry,
    initialState,
  );

  useEffect(() => {
    if (scannedCode) return;

    const scanner = new Html5Qrcode(SCANNER_ELEMENT_ID);
    scannerRef.current = scanner;
    let stopped = false;

    scanner
      .start(
        { facingMode: "environment" },
        { fps: 10, qrbox: { width: 250, height: 250 } },
        (decodedText) => {
          if (!stopped) {
            stopped = true;
            setScannedCode(decodedText);
          }
        },
        () => {},
      )
      .catch(() => {
        setScanError("לא ניתן לגשת למצלמה. יש לאשר הרשאת מצלמה בדפדפן.");
      });

    return () => {
      stopped = true;
      try {
        if (scanner.getState() === Html5QrcodeScannerState.SCANNING) {
          scanner.stop().catch(() => {});
        }
      } catch {
        // scanner never started successfully; nothing to stop
      }
    };
  }, [scannedCode]);

  if (state.success) {
    return (
      <div className="rounded-xl border border-emerald-700 bg-emerald-950/40 p-6 text-center">
        <p className="text-lg font-bold text-emerald-300">{state.success}</p>
        <button
          type="button"
          onClick={() => {
            setScannedCode(null);
            window.location.reload();
          }}
          className="mt-4 rounded-md bg-slate-800 px-4 py-2 text-sm font-medium text-white hover:bg-slate-700"
        >
          סריקה נוספת
        </button>
      </div>
    );
  }

  if (scannedCode) {
    return (
      <form action={formAction} className="space-y-4">
        <input type="hidden" name="qrCode" value={scannedCode} />
        <p className="text-center text-sm text-slate-400">
          קוד נסרק בהצלחה. יש להזין מספר טלפון לאישור הכניסה.
        </p>
        <input
          name="phone"
          dir="ltr"
          required
          autoFocus
          placeholder="מספר טלפון"
          className="input w-full text-center text-lg"
        />
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
          onClick={() => setScannedCode(null)}
          className="w-full text-center text-sm text-slate-500 hover:underline"
        >
          סריקה מחדש
        </button>
      </form>
    );
  }

  return (
    <div className="space-y-3">
      <div id={SCANNER_ELEMENT_ID} className="mx-auto w-full max-w-sm overflow-hidden rounded-xl" />
      {scanError && <p className="text-center text-sm text-red-400">{scanError}</p>}
      <p className="text-center text-sm text-slate-400">
        כוונו את המצלמה לקוד ה-QR שעל דלת חדר החשמל
      </p>
    </div>
  );
}
