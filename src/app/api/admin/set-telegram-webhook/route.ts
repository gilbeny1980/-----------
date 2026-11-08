import { NextResponse } from "next/server";
import { assertAdmin } from "@/lib/role";

// Admin-triggered one-time setup: registers this deployment's webhook URLs with
// Telegram's Bot API, using this app's own TELEGRAM_BOT_TOKEN /
// TELEGRAM_ADMIN_BOT_TOKEN env vars. Never reads/exposes the token itself.
async function setWebhook(token: string | undefined, path: string, label: string) {
  const trimmed = token?.trim();
  if (!trimmed) {
    return { label, ok: true, skipped: true, message: "אין token מוגדר, מדולג" };
  }
  const url = `https://gilam-electric.vercel.app${path}`;
  const res = await fetch(`https://api.telegram.org/bot${trimmed}/setWebhook`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ url }),
  });
  const data = await res.json();
  return { label, ok: Boolean(data.ok), url, description: data.description };
}

export async function GET() {
  try {
    await assertAdmin();
  } catch {
    return NextResponse.json({ error: "unauthorized" }, { status: 403 });
  }

  const customer = await setWebhook(process.env.TELEGRAM_BOT_TOKEN, "/api/telegram/customer", "בוט לקוחות");
  const admin = await setWebhook(
    process.env.TELEGRAM_ADMIN_BOT_TOKEN,
    "/api/telegram/admin",
    "בוט ניהול",
  );

  return NextResponse.json({ customer, admin });
}
