import OpenAI from "openai";
import { getKnowledgeContext, localDiagnose } from "./diagnose.js";

const SYSTEM_PROMPT = `אתה טכנאי חשמל ומכשור בכיר במפעל המזון גלעם בישראל.
תפקידך לענות בעברית ברורה ומקצועית על שאלות בנוגע לתקלות חשמל, וסתי תדר, מנועים, מגעים, חיישנים, ארונות חשמל ו-PLC.

כללים:
1. ענה בעברית, קצר ולעניין, בסגנון וואטסאפ.
2. תן סיבות אפשריות + צעדי בדיקה ממוספרים.
3. הדגש בטיחות (LOTO, ניתוק מתח, לא לעקוף אינטרלוקים).
4. אם חסר מידע – שאל שאלה אחת ממוקדת.
5. אל תמציא קודי תקלה ספציפיים למותג אם אינך בטוח – תן כיוון כללי.
6. התבסס קודם על בסיס הידע שסופק לך.
7. אם השאלה לא קשורה לחשמל/מכשור – הפנה בנימוס חזרה לנושא.`;

let client = null;

function getClient() {
  const key = process.env.OPENAI_API_KEY?.trim();
  if (!key) return null;
  if (!client) {
    client = new OpenAI({ apiKey: key });
  }
  return client;
}

export function hasAI() {
  return Boolean(process.env.OPENAI_API_KEY?.trim());
}

export async function smartAnswer(userMessage) {
  const local = localDiagnose(userMessage);

  if (local.type === "welcome" || local.type === "help") {
    return local.text;
  }

  const openai = getClient();
  if (!openai) {
    return local.text;
  }

  try {
    const knowledgeBlock = getKnowledgeContext();
    const localHint =
      local.type === "diagnosis"
        ? `\n\nהתאמות מקומיות שנמצאו:\n${local.text}`
        : "\n\nלא נמצאה התאמה מקומית חזקה – הסק לפי ידע מקצועי כללי ובסיס הידע.";

    const completion = await openai.chat.completions.create({
      model: process.env.OPENAI_MODEL || "gpt-4o-mini",
      temperature: 0.3,
      max_tokens: 900,
      messages: [
        {
          role: "system",
          content: `${SYSTEM_PROMPT}\n\n=== בסיס ידע גלעם ===\n${knowledgeBlock}`,
        },
        {
          role: "user",
          content: `שאלת הטכנאי:\n${userMessage}${localHint}`,
        },
      ],
    });

    const answer = completion.choices[0]?.message?.content?.trim();
    return answer || local.text;
  } catch (err) {
    console.error("OpenAI error:", err.message);
    return local.text + "\n\n_(תשובה מבסיס ידע מקומי – שירות AI לא זמין כרגע)_";
  }
}
