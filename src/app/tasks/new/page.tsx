import { prisma } from "@/lib/prisma";
import { createTask } from "@/app/actions";
import { PRIORITY_LABELS } from "@/lib/labels";
import { TaskPriority } from "@/generated/prisma/enums";

export default async function NewTaskPage() {
  const electricians = await prisma.electrician.findMany({
    where: { active: true },
    orderBy: { name: "asc" },
  });

  return (
    <div className="mx-auto max-w-2xl">
      <h1 className="mb-4 text-xl font-bold">משימה / קריאת תקלה חדשה</h1>
      <form
        action={createTask}
        className="space-y-4 rounded-lg border border-slate-200 bg-white p-6 shadow-sm"
      >
        <Field label="כותרת *">
          <input
            name="title"
            required
            className="input"
            placeholder="לדוגמה: תקלת חשמל במחסן ציוד"
          />
        </Field>

        <Field label="תיאור">
          <textarea
            name="description"
            rows={4}
            className="input"
            placeholder="פרטים נוספים על התקלה / המשימה"
          />
        </Field>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <Field label="מיקום">
            <input
              name="location"
              className="input"
              placeholder="לדוגמה: מבנה חדר אוכל"
            />
          </Field>
          <Field label="עדיפות">
            <select name="priority" className="input" defaultValue="NORMAL">
              {(Object.keys(PRIORITY_LABELS) as TaskPriority[]).map((p) => (
                <option key={p} value={p}>
                  {PRIORITY_LABELS[p]}
                </option>
              ))}
            </select>
          </Field>
        </div>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <Field label="שם הפונה">
            <input name="reporterName" className="input" />
          </Field>
          <Field label="טלפון הפונה">
            <input name="reporterPhone" className="input" dir="ltr" />
          </Field>
        </div>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <Field label="שיוך לחשמלאי">
            <select name="electricianId" className="input" defaultValue="">
              <option value="">לא משויך</option>
              {electricians.map((e) => (
                <option key={e.id} value={e.id}>
                  {e.name}
                </option>
              ))}
            </select>
          </Field>
          <Field label="תאריך יעד">
            <input type="date" name="dueDate" className="input" />
          </Field>
        </div>

        <button
          type="submit"
          className="w-full rounded-md bg-slate-900 px-4 py-2 font-medium text-white hover:bg-slate-800"
        >
          שמירת משימה
        </button>
      </form>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="mb-1 block text-sm font-medium text-slate-700">{label}</span>
      {children}
    </label>
  );
}
