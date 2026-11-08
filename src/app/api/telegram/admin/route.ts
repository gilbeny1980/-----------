import { NextResponse } from "next/server";
import { hydrateAll, persistAll } from "@/lib/telegramBot/services/knowledge.js";
import { getWebhookBots, handleWebhookUpdate } from "@/lib/telegramBot/telegram.js";

// Webhook של בוט הניהול הנפרד (TELEGRAM_ADMIN_BOT_TOKEN). אם אין TELEGRAM_ADMIN_BOT_TOKEN מוגדר,
// פקודות הניהול פועלות דרך בוט הלקוחות עצמו (api/telegram/customer) ונתיב הזה לא בשימוש.
export async function POST(request: Request) {
  try {
    const update = await request.json();
    await hydrateAll();
    const { customerBot, adminBot } = await getWebhookBots();
    const bot = adminBot || customerBot;
    if (!bot) {
      console.error("[webhook admin] אין בוט מוגדר (TELEGRAM_BOT_TOKEN/TELEGRAM_ADMIN_BOT_TOKEN)");
      return NextResponse.json({ ok: true });
    }
    await handleWebhookUpdate(bot, update);
    await persistAll();
  } catch (err) {
    console.error("[webhook admin] error:", err);
  }
  return NextResponse.json({ ok: true });
}

export async function GET() {
  return NextResponse.json({ ok: true });
}
