// Runs on a computer inside the kibbutz's local network (which can reach
// 10.1.61.15). Fetches service calls from the internal system and forwards
// them to the public site, which filters and stores the open electrical
// faults and displays them on the main screen.
//
// Requires Node.js 18+ (built-in fetch). Run with:
//   node --env-file=.env open-faults-bridge.js
// where .env (next to this file, not committed to git) contains:
//   OPEN_FAULTS_SYNC_SECRET=<the secret value>

const SOURCE_URL = "http://10.1.61.15:8084/servcalls";
const TARGET_URL = "https://gilam-electric.vercel.app/api/open-faults/sync";
const INTERVAL_MS = 600_000;

const secret = process.env.OPEN_FAULTS_SYNC_SECRET;
if (!secret) {
  console.error("חסר OPEN_FAULTS_SYNC_SECRET - יש להגדיר אותו בקובץ .env");
  process.exit(1);
}

// /servcalls can return the full call history, not just today's - far more
// than our hosting's ~4.5MB request body limit. Filter down to electrical
// calls here, before sending, so the payload stays small.
function isElectricalCall(item) {
  const code = (item.CallTypeCode ?? "").trim();
  return code === "3-חשמל/מכשור";
}

async function syncOnce() {
  const time = new Date().toLocaleTimeString("he-IL");
  try {
    const sourceRes = await fetch(SOURCE_URL);
    if (!sourceRes.ok) {
      throw new Error(`מערכת התקלות החזירה שגיאה: ${sourceRes.status}`);
    }
    const data = await sourceRes.json();
    const electricalCalls = Array.isArray(data) ? data.filter(isElectricalCall) : data;

    const targetRes = await fetch(TARGET_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${secret}`,
      },
      body: JSON.stringify(electricalCalls),
    });
    if (!targetRes.ok) {
      throw new Error(`שליחה לאתר נכשלה: ${targetRes.status}`);
    }
    const result = await targetRes.json();
    console.log(`[${time}] עודכן בהצלחה - ${result.count} תקלות פתוחות`);
  } catch (err) {
    console.error(`[${time}] שגיאה בסנכרון:`, err.message);
  }
}

syncOnce();
setInterval(syncOnce, INTERVAL_MS);
console.log("סקריפט הסנכרון פועל... (לחצו Ctrl+C לעצירה)");
