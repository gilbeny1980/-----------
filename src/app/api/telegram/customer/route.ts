import { NextResponse } from "next/server";
import { hydrateAll, persistAll } from "@/lib/telegramBot/services/knowledge.js";
import { getWebhookBots, handleWebhookUpdate } from "@/lib/telegramBot/telegram.js";

// Webhook של בוט הלקוחות (TELEGRAM_BOT_TOKEN) — טלגרם קורא לכתובת הזו ישירות בכל הודעה חדשה.
export async function POST(request: Request) {
  try {
    const update = await request.json();
    await hydrateAll();
    const { customerBot } = await getWebhookBots();
    if (!customerBot) {
      console.error("[webhook customer] TELEGRAM_BOT_TOKEN לא מוגדר");
      return NextResponse.json({ ok: true });
    }
    await handleWebhookUpdate(customerBot, update);
    await persistAll();
  } catch (err) {
    console.error("[webhook customer] error:", err);
  }
  // תמיד 200 לטלגרם — אחרת הוא חושב שהעדכון נכשל וממשיך לנסות שוב ושוב
  return NextResponse.json({ ok: true });
}

export async function GET() {
  return NextResponse.json({ ok: true });
}
