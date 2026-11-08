import { getKnowledge, loadKnowledge } from "./knowledge.js";

function normalize(text) {
  return String(text || "")
    .toLowerCase()
    .replace(/[״"']/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

function scoreFault(query, fault) {
  const q = normalize(query);
  let score = 0;

  for (const symptom of fault.symptoms) {
    const s = normalize(symptom);
    if (q.includes(s) || s.includes(q)) score += 8;
    else {
      const parts = s.split(/\s+/).filter((p) => p.length > 2);
      for (const p of parts) {
        if (q.includes(p)) score += 3;
      }
    }
  }

  const title = normalize(fault.title);
  for (const word of title.split(/\s+/).filter((w) => w.length > 2)) {
    if (q.includes(word)) score += 2;
  }

  return score;
}

export function findBestFaults(query, limit = 3) {
  loadKnowledge();
  const knowledge = getKnowledge();
  const scored = knowledge.faults
    .map((fault) => ({ fault, score: scoreFault(query, fault) }))
    .filter((x) => x.score > 0)
    .sort((a, b) => b.score - a.score);

  return scored.slice(0, limit);
}

export function formatFault(fault) {
  const lines = [
    `🔧 *${fault.title}*`,
    "",
    "*סיבות אפשריות:*",
    ...fault.causes.map((c, i) => `${i + 1}. ${c}`),
    "",
    "*צעדי בדיקה:*",
    ...fault.steps.map((s, i) => `${i + 1}. ${s}`),
  ];

  if (fault.safety) {
    lines.push("", `⚠️ *בטיחות:* ${fault.safety}`);
  }

  return lines.join("\n");
}

export function localDiagnose(query) {
  loadKnowledge();
  const knowledge = getKnowledge();
  const q = normalize(query);

  if (!q || q === "עזרה" || q === "help" || q === "תפריט") {
    return { type: "help", text: knowledge.help };
  }

  if (q === "שלום" || q === "היי" || q === "hi" || q === "hello" || q === "התחל" || q === "start") {
    return { type: "welcome", text: knowledge.welcome };
  }

  const matches = findBestFaults(query, 2);

  if (matches.length === 0) {
    return {
      type: "unknown",
      text:
        "לא מצאתי התאמה מדויקת בבסיס הידע.\n\n" +
        "נסה לנסח מחדש עם פרטים, למשל:\n" +
        "• סוג הציוד (וסת תדר / מנוע / מגען / חיישן)\n" +
        "• קוד תקלה או תסמין (OC, OV, חם, לא נסגר…)\n\n" +
        "כתוב *עזרה* לתפריט הנושאים.",
      matches: [],
    };
  }

  const parts = matches.map(({ fault }) => formatFault(fault));
  let text = parts.join("\n\n────────────\n\n");

  if (matches.length > 1) {
    text += "\n\n💡 אם זה לא מדויק – הוסף קוד תקלה או תסמין נוסף.";
  }

  return {
    type: "diagnosis",
    text,
    matches: matches.map((m) => m.fault),
  };
}

export function getKnowledgeContext() {
  loadKnowledge();
  return getKnowledge()
    .faults.map((f) => {
      return [
        `### ${f.title}`,
        `תסמינים: ${f.symptoms.join(", ")}`,
        `סיבות: ${f.causes.join("; ")}`,
        `בדיקות: ${f.steps.join("; ")}`,
        f.safety ? `בטיחות: ${f.safety}` : "",
      ]
        .filter(Boolean)
        .join("\n");
    })
    .join("\n\n");
}

export { getKnowledge as knowledge };
