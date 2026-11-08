import { randomUUID } from "crypto";
import { getValue, setValue, deleteValue } from "./store.js";

// קבצים מצורפים (תמונות/מסמכים) נשמרים ב-Turso כ-base64 – בלי דיסק קבוע בסביבת serverless.
const PREFIX = "attach:";
const MAX_BYTES = 4_000_000;

export async function saveAttachmentFile(buffer) {
  if (buffer.length > MAX_BYTES) {
    throw new Error(
      `הקובץ גדול מדי (${Math.round(buffer.length / 1024)}KB). המקסימום הוא ${Math.round(MAX_BYTES / 1024)}KB.`,
    );
  }
  const id = randomUUID();
  await setValue(PREFIX + id, buffer.toString("base64"));
  return id;
}

export async function readAttachmentFile(id) {
  const b64 = await getValue(PREFIX + id);
  if (!b64) throw new Error("הקובץ המצורף לא נמצא (ייתכן שנמחק)");
  return Buffer.from(b64, "base64");
}

export async function deleteAttachmentFile(id) {
  if (!id) return;
  await deleteValue(PREFIX + id).catch(() => {});
}
