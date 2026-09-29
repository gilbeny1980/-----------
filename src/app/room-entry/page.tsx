import { QrScanner } from "./QrScanner";

export default function RoomEntryPage() {
  return (
    <div className="mx-auto flex w-full max-w-md flex-1 flex-col items-center justify-center gap-6 px-4 py-10">
      <h1 className="text-xl font-bold">כניסה לחדר חשמל</h1>
      <QrScanner />
    </div>
  );
}
