// אחסון key-value עבור בוט הטלגרם, בתוך אותו Turso של שאר האתר (TURSO_DATABASE_URL / TURSO_AUTH_TOKEN).
// טבלה נפרדת (TelegramBotKv) כדי לא להתנגש עם הטבלאות שמנוהלות ע"י Prisma.

function config() {
  const raw = (process.env.TURSO_DATABASE_URL || "").trim();
  const token = (process.env.TURSO_AUTH_TOKEN || "").trim();
  const url = raw.replace(/^libsql:\/\//, "https://").replace(/\/$/, "");
  return { url, token };
}

export function hasStore() {
  const { url, token } = config();
  return Boolean(url && token);
}

const CREATE_TABLE =
  'CREATE TABLE IF NOT EXISTS "TelegramBotKv" (key TEXT PRIMARY KEY, value TEXT NOT NULL)';

const text = (value) => ({ type: "text", value: String(value) });

async function run(sql, args = []) {
  const { url, token } = config();
  if (!url || !token) {
    throw new Error("Turso לא מוגדר — צריך TURSO_DATABASE_URL ו-TURSO_AUTH_TOKEN");
  }
  const res = await fetch(`${url}/v2/pipeline`, {
    method: "POST",
    headers: { authorization: `Bearer ${token}`, "content-type": "application/json" },
    body: JSON.stringify({
      requests: [
        { type: "execute", stmt: { sql: CREATE_TABLE } },
        { type: "execute", stmt: { sql, args } },
        { type: "close" },
      ],
    }),
  });
  if (!res.ok) {
    throw new Error(`Turso HTTP ${res.status}: ${(await res.text()).slice(0, 200)}`);
  }
  const data = await res.json();
  for (const r of data.results || []) {
    if (r.type === "error") throw new Error(`Turso: ${r.error?.message || "שגיאה"}`);
  }
  return data.results[1].response.result;
}

export async function getValue(key) {
  const result = await run('SELECT value FROM "TelegramBotKv" WHERE key = ?', [text(key)]);
  const cell = result.rows?.[0]?.[0];
  return cell && cell.type !== "null" ? cell.value : null;
}

export async function setValue(key, value) {
  await run(
    'INSERT INTO "TelegramBotKv" (key, value) VALUES (?, ?) ON CONFLICT(key) DO UPDATE SET value = excluded.value',
    [text(key), text(value)],
  );
}

export async function deleteValue(key) {
  await run('DELETE FROM "TelegramBotKv" WHERE key = ?', [text(key)]);
}
