import seedKnowledge from "../seed/faults.json";
import { getValue, setValue, hasStore } from "./store.js";

const STORE_KEY = "faults";

let knowledge = null;
// התמונה של בסיס הידע כפי שנטען/נשמר לאחרונה – כותבים רק כשמשהו באמת השתנה, כדי שבקשה של
// לקוח (שרק קוראת) לא תדרוס שינוי שמנהל עשה במקביל בבקשה אחרת.
let knowledgeSnapshot = null;

/** טוען את בסיס הידע מ-Turso; בפעם הראשונה מאתחל מתוך ה-seed שבקוד. */
export async function hydrateKnowledge() {
  if (hasStore()) {
    const stored = await getValue(STORE_KEY);
    if (stored) {
      knowledge = JSON.parse(stored);
    } else {
      knowledge = JSON.parse(JSON.stringify(seedKnowledge));
      await setValue(STORE_KEY, JSON.stringify(knowledge));
    }
  } else {
    knowledge = JSON.parse(JSON.stringify(seedKnowledge));
  }
  knowledgeSnapshot = JSON.stringify(knowledge);
  return knowledge;
}

/** שומר את בסיס הידע הנוכחי בפועל (await מלא), רק אם השתנה מאז הטעינה/השמירה האחרונה. */
export async function persistKnowledge() {
  if (!knowledge) return;
  const json = JSON.stringify(knowledge);
  if (json === knowledgeSnapshot) return;
  if (hasStore()) {
    await setValue(STORE_KEY, json);
  }
  knowledgeSnapshot = json;
}

export function getKnowledge() {
  if (!knowledge) throw new Error("בסיס הידע עוד לא נטען — חסרה קריאה ל-hydrateKnowledge()");
  return knowledge;
}

/** תאימות לאחור: הקוד הקיים קורא ל-loadKnowledge()/saveKnowledge() באופן סינכרוני בהרבה מקומות */
export function loadKnowledge() {
  return getKnowledge();
}

/** שמירה "best effort" לא חוסמת, לשימוש מתוך פונקציות הכתיבה הסינכרוניות הקיימות.
 *  persistKnowledge() המפורש בסוף הבקשה הוא מה שמבטיח שהשינוי באמת נשמר. */
export function saveKnowledge() {
  persistKnowledge().catch((err) => console.error("[saveKnowledge] שמירה נכשלה:", err.message));
}

export function listFaults() {
  return getKnowledge().faults;
}

export function getCategories() {
  return getKnowledge().categories;
}

export function getMenu() {
  return getKnowledge().menu || [];
}

/** true אם לצומת יש תת-פריטים (תיקייה), false אם זה עלה עם תוכן */
export function isMenuFolder(node) {
  return Array.isArray(node?.items);
}

export function getPanels() {
  return getKnowledge().panels || [];
}

/** כל מספרי השנאים הקיימים בפועל, ממוינים */
export function getTransformerIds() {
  const set = new Set(getPanels().map((p) => p.transformer));
  return [...set].sort((a, b) => {
    const na = parseInt(a, 10);
    const nb = parseInt(b, 10);
    if (na !== nb) return na - nb;
    return a.localeCompare(b);
  });
}

function normalizeSearch(text) {
  return String(text || "")
    .toLowerCase()
    .replace(/[״"'׳]/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

/** חיפוש כל הצרכנים של שנאי לפי מספרו, למשל "שנאי 3" / "שנאי3" / "3" */
export function findPanelsByTransformer(query) {
  const q = normalizeSearch(query).replace(/^שנאי\s*/, "");
  return getPanels().filter((p) => normalizeSearch(p.transformer) === q);
}

function tokenizeSearch(query) {
  return String(query || "")
    .toLowerCase()
    .split(/[^֐-׿a-z0-9]+/i)
    .filter((t) => t.length >= 2);
}

/** דמיון bigram בין שתי מחרוזות – סובל טעויות הקלדה (אות חסרה/עודפת/מוחלפת), לא רק תת-מחרוזת מדויקת */
function bigramSet(s) {
  const set = new Set();
  for (let i = 0; i < s.length - 1; i++) set.add(s.slice(i, i + 2));
  if (!set.size && s.length) set.add(s);
  return set;
}
function bigramScore(a, b) {
  const A = bigramSet(a);
  const B = bigramSet(b);
  if (!A.size || !B.size) return 0;
  let shared = 0;
  for (const g of A) if (B.has(g)) shared++;
  return shared / Math.min(A.size, B.size);
}

const FUZZY_THRESHOLD = 0.5;

/**
 * חיפוש חופשי לפי שם צרכן/לוח (למשל "פרוקטוזה"). אם אין תת-מחרוזת מלאה,
 * נופלים ל-fallback מטושטש: קודם לפי טוקנים, ואם עדיין ריק – לפי דמיון bigram
 * (סובל גם שגיאות כתיב, לא רק חיפוש חלקי) – כדי לא לחזור עם "אין תוצאות" בקלות.
 */
export function findPanelsByLoad(query) {
  const q = normalizeSearch(query);
  if (!q) return { results: [], fuzzy: false };

  const direct = getPanels().filter((p) => {
    const load = normalizeSearch(p.load);
    const loc = normalizeSearch(p.location);
    return load.includes(q) || loc.includes(q);
  });
  if (direct.length) return { results: direct, fuzzy: false };

  const tokens = tokenizeSearch(query);
  if (tokens.length) {
    const scored = getPanels()
      .map((p) => {
        const hay = normalizeSearch(`${p.load} ${p.location || ""}`);
        const score = tokens.filter((tok) => hay.includes(normalizeSearch(tok))).length;
        return { p, score };
      })
      .filter((x) => x.score > 0)
      .sort((a, b) => b.score - a.score);
    if (scored.length) return { results: scored.map((x) => x.p), fuzzy: true };
  }

  // fallback אחרון: דמיון bigram מול שם הצרכן (סובל שגיאות כתיב)
  const scoredFuzzy = getPanels()
    .map((p) => ({ p, score: bigramScore(q, normalizeSearch(p.load)) }))
    .filter((x) => x.score >= FUZZY_THRESHOLD)
    .sort((a, b) => b.score - a.score);
  return { results: scoredFuzzy.map((x) => x.p), fuzzy: true };
}

/** חיפוש משולב: אם השאילתה נראית כמו "שנאי X" מחפש לפי שנאי, אחרת לפי שם צרכן */
export function searchPanels(query) {
  const q = normalizeSearch(query);
  if (/^שנאי\s*\d/.test(q) || /^\d+$/.test(q)) {
    const byTransformer = findPanelsByTransformer(query);
    if (byTransformer.length) {
      return { type: "transformer", key: q.replace(/^שנאי\s*/, ""), results: byTransformer, fuzzy: false };
    }
  }
  const { results, fuzzy } = findPanelsByLoad(query);
  return { type: "load", key: q, results, fuzzy };
}

function uniqueSlug(container, name) {
  const base = slugify(name);
  let id = base;
  let n = 1;
  while (container.some((x) => x.id === id)) {
    id = `${base}-${n++}`;
  }
  return id;
}

/** מוצא צומת בעץ לפי מסלול (מערך של ids מהשורש) */
function findNode(path) {
  const menu = getMenu();
  let container = menu;
  let node = null;
  for (let i = 0; i < path.length; i++) {
    const idx = container.findIndex((n) => n.id === path[i]);
    if (idx === -1) return null;
    node = container[idx];
    if (i < path.length - 1) {
      if (!isMenuFolder(node)) return null;
      container = node.items;
    }
  }
  return node;
}

/** מחזיר את הצומת במסלול, או שורש וירטואלי אם המסלול ריק */
export function getMenuNode(path) {
  if (!path.length) return { id: null, name: "תפריט ראשי", items: getMenu() };
  return findNode(path);
}

export function addMenuFolder(parentPath, name) {
  const data = getKnowledge();
  if (!data.menu) data.menu = [];
  const container = parentPath.length ? findNode(parentPath)?.items : data.menu;
  if (!container) throw new Error("קטגוריית-אב לא נמצאה");
  const id = uniqueSlug(container, name);
  const folder = { id, name, items: [] };
  container.push(folder);
  saveKnowledge();
  return folder;
}

export function addMenuLeaf(parentPath, name, text) {
  const data = getKnowledge();
  const parent = parentPath.length ? findNode(parentPath) : { items: data.menu || (data.menu = []) };
  if (!parent || !isMenuFolder(parent)) throw new Error("קטגוריית-אב לא נמצאה");
  const id = uniqueSlug(parent.items, name);
  const leaf = { id, name, text };
  parent.items.push(leaf);
  saveKnowledge();
  return leaf;
}

export function updateMenuNode(path, { name, text } = {}) {
  const node = findNode(path);
  if (!node) throw new Error("נושא לא נמצא");
  if (name) node.name = name;
  if (text) node.text = text;
  saveKnowledge();
  return node;
}

/** מצרף/מסיר קובץ (תמונה או מסמך) לצומת בתפריט. attachment = { file, type: 'photo'|'document', name? } או null להסרה */
export function setMenuAttachment(path, attachment) {
  const node = findNode(path);
  if (!node) throw new Error("נושא לא נמצא");
  if (attachment) node.attachment = attachment;
  else delete node.attachment;
  saveKnowledge();
  return node;
}

export function deleteMenuNode(path) {
  if (!path.length) throw new Error("אי אפשר למחוק את התפריט הראשי");
  const data = getKnowledge();
  const parentPath = path.slice(0, -1);
  const container = parentPath.length ? findNode(parentPath)?.items : data.menu;
  if (!container) throw new Error("קטגוריית-אב לא נמצאה");
  const id = path[path.length - 1];
  const idx = container.findIndex((n) => n.id === id);
  if (idx === -1) throw new Error("נושא לא נמצא");
  const [removed] = container.splice(idx, 1);
  saveKnowledge();
  return removed;
}

function slugify(text) {
  return (
    String(text)
      .toLowerCase()
      .replace(/[^֐-׿a-z0-9]+/gi, "-")
      .replace(/^-+|-+$/g, "")
      .slice(0, 40) || `fault-${Date.now()}`
  );
}

export function addFault({ title, category, symptoms, causes, steps, safety = null }) {
  const data = getKnowledge();
  const idBase = slugify(title);
  let id = idBase;
  let n = 1;
  while (data.faults.some((f) => f.id === id)) {
    id = `${idBase}-${n++}`;
  }

  const fault = {
    id,
    category: category || "instrumentation",
    title,
    symptoms: Array.isArray(symptoms) ? symptoms : splitLines(symptoms),
    causes: Array.isArray(causes) ? causes : splitLines(causes),
    steps: Array.isArray(steps) ? steps : splitLines(steps),
    safety: safety || null,
  };

  data.faults.push(fault);
  saveKnowledge();
  return fault;
}

function splitLines(text) {
  return String(text || "")
    .split(/\n|•|;|\|/g)
    .map((s) => s.replace(/^\d+[.)]\s*/, "").trim())
    .filter(Boolean);
}

// ─── activity log ───────────────────────────────────────────
// נשמר ב-Turso יחד עם בסיס הידע (אותו hydrate/persist).

const ACTIVITY_STORE_KEY = "activity";
const MAX_LOG = 200;

let activityLog = null;
let activitySnapshot = null;

async function hydrateActivity() {
  if (hasStore()) {
    const stored = await getValue(ACTIVITY_STORE_KEY);
    activityLog = stored ? JSON.parse(stored) : [];
  } else {
    activityLog = [];
  }
  activitySnapshot = JSON.stringify(activityLog);
}

async function persistActivity() {
  if (!activityLog) return;
  const json = JSON.stringify(activityLog);
  if (json === activitySnapshot) return;
  if (hasStore()) {
    await setValue(ACTIVITY_STORE_KEY, json);
  }
  activitySnapshot = json;
}

export function logActivity(entry) {
  if (!activityLog) activityLog = [];
  activityLog.unshift({ at: new Date().toISOString(), ...entry });
  activityLog = activityLog.slice(0, MAX_LOG);
  persistActivity().catch((err) => console.error("[logActivity] שמירה נכשלה:", err.message));
}

export function getRecentActivity(limit = 10) {
  return (activityLog || []).slice(0, limit);
}

export function getStats() {
  const data = getKnowledge();
  const log = activityLog || [];
  const byCat = {};
  for (const f of data.faults) {
    byCat[f.category] = (byCat[f.category] || 0) + 1;
  }
  return {
    faultCount: data.faults.length,
    byCategory: byCat,
    questionsToday: log.filter((e) => e.at?.startsWith(new Date().toISOString().slice(0, 10))).length,
    totalLogged: log.length,
  };
}

/** טוען גם את בסיס הידע וגם את יומן הפעילות. לקרוא פעם אחת בתחילת כל בקשה/הפעלה. */
export async function hydrateAll() {
  if (process.env.VERCEL && !hasStore()) {
    throw new Error(
      "בסיס הנתונים לא מוגדר — צריך TURSO_DATABASE_URL ו-TURSO_AUTH_TOKEN ב-Environment Variables, ואז Redeploy",
    );
  }
  await Promise.all([hydrateKnowledge(), hydrateActivity()]);
}

/** שומר את שניהם במפורש (await מלא). לקרוא בסוף כל בקשה, אחרי שה-handler סיים. */
export async function persistAll() {
  await Promise.all([persistKnowledge(), persistActivity()]);
}
