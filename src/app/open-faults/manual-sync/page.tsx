import { ManualSyncForm } from "./ManualSyncForm";

export default function ManualSyncPage() {
  return (
    <div className="mx-auto max-w-2xl w-full space-y-6 px-4 py-6">
      <h1 className="text-xl font-bold">עדכון תקלות פתוחות</h1>
      <ol className="list-decimal space-y-1 pr-5 text-sm text-slate-600">
        <li>
          פתחו בדפדפן (בזמן שאתם מחוברים לרשת של גלעם) את הכתובת:{" "}
          <span dir="ltr" className="font-mono text-xs">
            http://10.1.61.15:8084/todayservcalls
          </span>
        </li>
        <li>בחרו הכל (Ctrl+A) והעתיקו (Ctrl+C)</li>
        <li>הדביקו בתיבה למטה ולחצו &quot;עדכון&quot;</li>
      </ol>
      <ManualSyncForm />
    </div>
  );
}
