import rawInstruments from "../seed/instruments.json";

function normalize(text) {
  return String(text || "")
    .toLowerCase()
    .replace(/[\s\-_./]+/g, "")
    .trim();
}

function tokenize(query) {
  return String(query || "")
    .toLowerCase()
    .split(/[^a-z0-9֐-׿]+/i)
    .filter((t) => t.length >= 2);
}

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

const MAX_RESULTS = 20;
const FUZZY_THRESHOLD = 0.5;

export function getInstrumentCount() {
  return rawInstruments.length;
}

/**
 * חיפוש מכשיר לפי TAG (עמודה A) – ארבע רמות, לא נופל ל"אין תוצאות" בקלות:
 * 1. התאמה מדויקת (אחרי נרמול מפרידים)
 * 2. תת-מחרוזת מלאה
 * 3. Fallback לפי חלקים (טוקנים) מתוך השאילתה
 * 4. Fallback אחרון: דמיון bigram (סובל גם שגיאות כתיב, לא רק חיפוש חלקי)
 */
export function searchInstruments(query) {
  const q = normalize(query);
  if (!q) return { total: 0, results: [], fuzzy: false };

  const all = rawInstruments;
  const exact = all.filter((r) => normalize(r.tag) === q);
  if (exact.length) return { total: exact.length, results: exact.slice(0, MAX_RESULTS), fuzzy: false };

  const partial = all.filter((r) => normalize(r.tag).includes(q));
  if (partial.length) return { total: partial.length, results: partial.slice(0, MAX_RESULTS), fuzzy: false };

  const tokens = tokenize(query);
  if (tokens.length) {
    const scored = all
      .map((r) => {
        const t = normalize(r.tag);
        const score = tokens.filter((tok) => t.includes(normalize(tok))).length;
        return { r, score };
      })
      .filter((x) => x.score > 0)
      .sort((a, b) => b.score - a.score);
    if (scored.length) {
      return { total: scored.length, results: scored.slice(0, MAX_RESULTS).map((x) => x.r), fuzzy: true };
    }
  }

  const scoredFuzzy = all
    .map((r) => ({ r, score: bigramScore(q, normalize(r.tag)) }))
    .filter((x) => x.score >= FUZZY_THRESHOLD)
    .sort((a, b) => b.score - a.score);

  return {
    total: scoredFuzzy.length,
    results: scoredFuzzy.slice(0, MAX_RESULTS).map((x) => x.r),
    fuzzy: true,
  };
}
