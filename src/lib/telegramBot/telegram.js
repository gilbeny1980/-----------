import { Telegraf, Markup } from 'telegraf';
import { createHash } from 'crypto';
import {
  addFault,
  listFaults,
  getCategories,
  getMenu,
  getMenuNode,
  isMenuFolder,
  addMenuFolder,
  addMenuLeaf,
  updateMenuNode,
  deleteMenuNode,
  setMenuAttachment,
  searchPanels,
  getPanels,
  getTransformerIds,
  getRecentActivity,
  getStats,
  loadKnowledge,
  logActivity,
  getKnowledge,
  saveKnowledge,
} from './services/knowledge.js';
import { getValue, setValue, deleteValue, hasStore } from './services/store.js';
import { saveAttachmentFile, readAttachmentFile, deleteAttachmentFile } from './services/attachments.js';
import { localDiagnose } from './services/diagnose.js';
import { smartAnswer } from './services/ai.js';
import { searchInstruments, getInstrumentCount } from './services/instruments.js';

/**
 * קבצים מצורפים (תמונות/מסמכים) נשמרים ב-Redis (ראה services/attachments.js) במקום להסתמך
 * על file_id של טלגרם – file_id תקף רק לבוט שקיבל אותו במקור, וכשיש בוט ניהול נפרד מבוט
 * הלקוחות (ראה adminBot למטה) הבוט השני לא יכול להשתמש בו כדי לשלוח את אותו קובץ הלאה.
 * וגם: ב-Vercel אין בכלל דיסק קבוע לשמור בו קבצים בין קריאות.
 */
async function downloadTelegramFile(telegram, fileId) {
  const link = await telegram.getFileLink(fileId);
  const url = typeof link === 'string' ? link : link.href;
  const res = await fetch(url);
  if (!res.ok) throw new Error(`הורדת הקובץ מטלגרם נכשלה (HTTP ${res.status})`);
  return Buffer.from(await res.arrayBuffer());
}
/** מקור לשליחה חוזרת ל-Telegraf */
async function attachmentSource(attachment) {
  const buf = await readAttachmentFile(attachment.file);
  return { source: buf, filename: attachment.name || attachment.file };
}
/** שולח קובץ/תמונה מצורפים, עם טיפול שגיאות אחיד */
async function sendAttachment(ctx, attachment, extra) {
  try {
    const source = await attachmentSource(attachment);
    if (attachment.type === 'photo') await ctx.replyWithPhoto(source, extra);
    else await ctx.replyWithDocument(source, extra);
  } catch (err) {
    console.error('[mnav attach]', attachment.type, err.message);
  }
}

/** @type {Telegraf | null} בוט הלקוחות – תמיד קיים אם TELEGRAM_BOT_TOKEN מוגדר */
let customerBot = null;
/** @type {Telegraf | null} בוט ניהול נפרד – קיים רק אם TELEGRAM_ADMIN_BOT_TOKEN מוגדר */
let adminBot = null;
let adminIds = new Set();

/** wizards: userId -> draft */
const drafts = new Map();

/** userId -> 'panels' | 'instruments' כשממתינים להודעה הבאה כמונח חיפוש */
const searchState = new Map();

/** userId -> { kind: 'panels'|'instruments', results: [...] } – תוצאות מרובות שממתינות לבחירה בכפתור */
const pendingResults = new Map();
const MAX_PICK_BUTTONS = 15;

const HOME_BUTTON_ROW = [Markup.button.callback('🏠 תפריט ראשי', 'mnav:_')];

function searchAgainKeyboard(kind) {
  return Markup.inlineKeyboard([
    [Markup.button.callback('🔁 חפש שוב', `research:${kind}`)],
    HOME_BUTTON_ROW,
  ]);
}

function searchPrompt(kind) {
  return kind === 'panels'
    ? '🔍 הקלד שם צרכן/לוח (למשל: פרוקטוזה), או מספר שנאי (למשל: שנאי 5).'
    : '🔍 הקלד TAG של מכשיר או חלק ממנו (למשל: ZSC-01401 או PS-3565).';
}

function panelPickKeyboard(results) {
  const rows = results
    .slice(0, MAX_PICK_BUTTONS)
    .map((p, i) => [Markup.button.callback(`${p.load} (שנאי ${p.transformer})`, `panelpick:${i}`)]);
  rows.push(HOME_BUTTON_ROW);
  return Markup.inlineKeyboard(rows);
}

function instrumentPickKeyboard(results) {
  const rows = results
    .slice(0, MAX_PICK_BUTTONS)
    .map((r, i) => [Markup.button.callback(`${r.tag} — ${r.area}`, `instrpick:${i}`)]);
  rows.push(HOME_BUTTON_ROW);
  return Markup.inlineKeyboard(rows);
}

function transformerPickKeyboard(ids) {
  const buttons = ids.map((id) => Markup.button.callback(`שנאי ${id}`, `xfmrpick:${id}`));
  const rows = [];
  for (let i = 0; i < buttons.length; i += 3) rows.push(buttons.slice(i, i + 3));
  rows.push(HOME_BUTTON_ROW);
  return Markup.inlineKeyboard(rows);
}

function formatPanelResults(result) {
  if (!result.results.length) {
    return `לא נמצאו תוצאות עבור "${result.key}", גם בחיפוש מקורב.\nנסה שם צרכן אחר, או "שנאי" ומספר (למשל: שנאי 5).`;
  }
  const line = (p) =>
    `⚡ *${p.load}*\nשנאי: ${p.transformer} | מפסק: ${p.breaker}${p.size ? ' (' + p.size + ')' : ''}${
      p.location ? `\n📍 ${p.location}` : ''
    }${p.uncertain ? '\n⚠️ לא ודאי במאה אחוז – מומלץ לאמת בשטח' : ''}`;

  const fuzzyNote = result.fuzzy ? '🔎 לא נמצאה התאמה מדויקת – אלה התוצאות הקרובות ביותר:\n\n' : '';

  if (result.type === 'transformer') {
    return `📋 *שנאי ${result.key} — כל הצרכנים:*\n\n${result.results.map(line).join('\n\n')}`;
  }
  return fuzzyNote + result.results.map(line).join('\n\n────────\n\n');
}

function formatInstrumentResults(query, { total, results, fuzzy }) {
  if (!results.length) {
    return `לא נמצא מכשיר עבור "${query}", גם בחיפוש מקורב.\nנסה חלק אחר מה-TAG (למשל: ZSC-01401 או PS-3565).`;
  }
  const line = (r) => {
    const extra = Object.entries(r)
      .filter(([key, val]) => !['tag', 'plant', 'area'].includes(key) && val !== undefined && val !== '')
      .map(([key, val]) => `• ${key}: ${val}`)
      .join('\n');
    return `🔧 *${r.tag}*\n\n🏭 מפעל: ${r.plant}\n📍 אזור: ${r.area}${extra ? `\n${extra}` : ''}`;
  };
  const fuzzyNote = fuzzy ? '🔎 לא נמצאה התאמה מדויקת – אלה התוצאות הקרובות ביותר:\n\n' : '';
  const header = total > results.length ? `נמצאו ${total} תוצאות, מציג ${results.length} ראשונות:\n\n` : '';
  return fuzzyNote + header + results.map(line).join('\n\n━━━━━━━━━━━━━━━\n\n');
}

function isAdmin(ctx) {
  if (adminIds.size === 0) return true; // אם לא הוגדר – כל מי שמדבר מורשה
  if (adminIds.has(String(ctx.from?.id))) return true;
  const username = ctx.from?.username?.toLowerCase();
  if (username && adminIds.has(username)) return true;
  return false;
}

function deny(ctx) {
  return ctx.reply('⛔ אין הרשאה. רק מנהלים יכולים להשתמש בחלון זה.');
}

function escapeHtml(s) {
  return String(s || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}

function truncate(s, n = 800) {
  const t = String(s || '');
  return t.length > n ? t.slice(0, n) + '…' : t;
}

export function hasTelegram() {
  return Boolean(process.env.TELEGRAM_BOT_TOKEN?.trim());
}

export function hasAdminBot() {
  return Boolean(process.env.TELEGRAM_ADMIN_BOT_TOKEN?.trim());
}

export async function notifyAdmins(html) {
  const targetBot = adminBot || customerBot;
  if (!targetBot) return;

  const targets = [...adminIds].filter((id) => /^\d+$/.test(id)); // sendMessage דורש chat id מספרי

  if (targets.length === 0) {
    console.warn('Telegram: אין ADMIN_IDS מספרי – לא ניתן לשלוח התראות (username לבדו לא מספיק לשליחה יזומה)');
    return;
  }

  for (const id of targets) {
    try {
      await targetBot.telegram.sendMessage(id, html, { parse_mode: 'HTML' });
    } catch (err) {
      console.error(`Telegram notify ${id}:`, err.message);
    }
  }
}

async function notifyChannelActivity(channel, { from, question, answer, type }) {
  const html =
    `📩 <b>שאלה מ${escapeHtml(channel)}</b>\n` +
    `👤 <code>${escapeHtml(from)}</code>\n` +
    `🏷 סוג: ${escapeHtml(type || '?')}\n\n` +
    `<b>שאלה:</b>\n${escapeHtml(truncate(question, 500))}\n\n` +
    `<b>תשובה:</b>\n${escapeHtml(truncate(answer, 900))}`;

  await notifyAdmins(html);
}

export async function notifyWhatsAppActivity(data) {
  await notifyChannelActivity('וואטסאפ', data);
}

/**
 * callback_data מוגבל ל-64 בייט בטלגרם, ומסלולים עמוקים (עם שמות ארוכים) חורגים מזה בקלות.
 * הטוקן הוא hash קצר של המסלול, והפענוח מחפש אותו בעץ התפריט עצמו – בלי שום מצב בזיכרון.
 * (ב-Vercel כל הודעה יכולה להגיע למופע שרת אחר, אז מפה בזיכרון מחזירה את כפתורי הניהול לשורש.)
 */
function pathHash(path) {
  return createHash('sha1').update(path.join('')).digest('hex').slice(0, 10);
}

function encodePath(path) {
  if (!path.length) return '_';
  return pathHash(path);
}

function findPathByHash(items, prefix, token) {
  for (const n of items || []) {
    const p = [...prefix, n.id];
    if (pathHash(p) === token) return p;
    if (isMenuFolder(n)) {
      const found = findPathByHash(n.items, p, token);
      if (found) return found;
    }
  }
  return null;
}

function decodePath(token) {
  if (token === '_') return [];
  return findPathByHash(getMenu(), [], token) || [];
}

/** תפריט צד-לקוח: כפתור לכל ילד, וכפתור חזרה אם לא בשורש */
function customerNodeKeyboard(path) {
  loadKnowledge();
  const node = getMenuNode(path);
  const items = node?.items || [];
  const rows = [];

  if (!path.length) {
    // תפריט ראשי: כפתורי חיפוש זה לצד זה בשורה עליונה, שאר הצמתים כל אחד בשורה נפרדת למטה
    const searchItems = items.filter((n) => n.search);
    const otherItems = items.filter((n) => !n.search);
    if (searchItems.length) {
      rows.push(searchItems.map((n) => Markup.button.callback(n.name, `mnav:${encodePath([n.id])}`)));
    }
    for (const n of otherItems) {
      rows.push([Markup.button.callback(n.name, `mnav:${encodePath([n.id])}`)]);
    }
    return Markup.inlineKeyboard(rows);
  }

  for (const child of items) {
    rows.push([Markup.button.callback(child.name, `mnav:${encodePath([...path, child.id])}`)]);
  }
  rows.push([Markup.button.callback('⬅️ חזרה', `mnav:${encodePath(path.slice(0, -1))}`)]);
  rows.push([Markup.button.callback('🏠 תפריט ראשי', 'mnav:_')]);
  return Markup.inlineKeyboard(rows);
}

/** תפריט צד-ניהול: כפתור לכל ילד + כפתורי ניהול (הוספה/עריכה/מחיקה) */
function adminNodeKeyboard(path) {
  const node = getMenuNode(path);
  const rows = (node?.items || []).map((child) => [
    Markup.button.callback(`${isMenuFolder(child) ? '📂 ' : ''}${child.name}`, `anav:${encodePath([...path, child.id])}`),
  ]);
  rows.push([
    Markup.button.callback('➕ תוכן', `aleaf:${encodePath(path)}`),
    Markup.button.callback('➕ תת-קטגוריה', `afolder:${encodePath(path)}`),
  ]);
  if (path.length) {
    rows.push([
      Markup.button.callback(node?.attachment ? '🖼️ החלף קובץ/תמונה' : '🖼️ הוסף קובץ/תמונה', `aattach:${encodePath(path)}`),
    ]);
    if (node?.attachment) {
      rows.push([Markup.button.callback('🗑️ הסר קובץ/תמונה', `adelattach:${encodePath(path)}`)]);
    }
    rows.push([
      Markup.button.callback('✏️ שנה שם', `arename:${encodePath(path)}`),
      Markup.button.callback('🗑️ מחק תיקייה זו', `adelask:${encodePath(path)}`),
    ]);
    rows.push([Markup.button.callback('⬅️ חזרה', `anav:${encodePath(path.slice(0, -1))}`)]);
  }
  return Markup.inlineKeyboard(rows);
}

function adminLeafKeyboard(path, hasAttachment) {
  const parent = encodePath(path.slice(0, -1));
  const rows = [
    [Markup.button.callback('✏️ שנה שם', `arename:${encodePath(path)}`)],
    [Markup.button.callback('✏️ ערוך תוכן', `aedittext:${encodePath(path)}`)],
    [Markup.button.callback(hasAttachment ? '🖼️ החלף קובץ/תמונה' : '🖼️ הוסף קובץ/תמונה', `aattach:${encodePath(path)}`)],
  ];
  if (hasAttachment) {
    rows.push([Markup.button.callback('🗑️ הסר קובץ/תמונה', `adelattach:${encodePath(path)}`)]);
  }
  rows.push([Markup.button.callback('🗑️ מחק נושא', `adelask:${encodePath(path)}`)]);
  rows.push([Markup.button.callback('⬅️ חזרה לקטגוריה', `anav:${parent}`)]);
  return Markup.inlineKeyboard(rows);
}

function categoryKeyboard() {
  const cats = getCategories();
  const rows = cats.map((c) => [
    Markup.button.callback(`${c.name} (${c.id})`, `cat:${c.id}`),
  ]);
  rows.push([Markup.button.callback('❌ ביטול', 'cancel_add')]);
  return Markup.inlineKeyboard(rows);
}

function helpText() {
  return (
    `🛠️ *בוט ניהול – תקלות חשמל גלעם*\n\n` +
    `כאן אתה עוקב אחרי שאלות מלקוחות ומוסיף תקלות לבסיס הידע.\n\n` +
    `פקודות:\n` +
    `/start – פתיחה\n` +
    `/add – הוספת תקלה חדשה (חיפוש חופשי)\n` +
    `/list – רשימת תקלות\n` +
    `/addmenu – הוספת נושא לתפריט הראשי (הכפתורים)\n` +
    `/editmenu – עריכת שם/תוכן של נושא קיים בתפריט\n` +
    `/listmenu – הצגת עץ התפריט המלא\n` +
    `/delmenu – מחיקת נושא מהתפריט\n` +
    `/last – 10 שאלות אחרונות מלקוחות\n` +
    `/stats – סטטיסטיקה\n` +
    `/reload – טעינה מחדש של בסיס הידע\n` +
    `/setwelcome – שינוי כותרת/הודעת הפתיחה הראשית\n` +
    `/cancel – ביטול פעולה פעילה\n` +
    `/myid – הצג את ה-ID שלך (להגדרת מנהל)\n\n` +
    `כל שאלה שמגיעה מלקוחות תשלח לכאן אוטומטית.`
  );
}

async function handleCustomerMessage(ctx) {
  const text = ctx.message.text?.trim();
  if (!text) return;

  const from = `telegram:${ctx.from.id}${ctx.from.username ? ' (@' + ctx.from.username + ')' : ''}`;
  console.log(`[${new Date().toISOString()}] ${from}: ${text}`);

  const pendingSearch = searchState.get(ctx.from.id);
  const isMenuExit = ['תפריט', 'menu', 'עזרה', 'help'].includes(text.trim().toLowerCase());

  if (pendingSearch && isMenuExit) {
    searchState.delete(ctx.from.id);
    // ממשיכים לבלוק התפריט הרגיל למטה
  } else if (pendingSearch === 'panels') {
    loadKnowledge();
    const normalized = text.trim();
    const looksLikeTransformer = /^שנאי\s*\d+$/i.test(normalized) || /^\d+$/.test(normalized);

    if (looksLikeTransformer) {
      const result = searchPanels(text);
      if (result.results.length) {
        const reply = formatPanelResults(result);
        const kb = searchAgainKeyboard('panels');
        await ctx.reply(reply, { parse_mode: 'Markdown', ...kb }).catch(() => ctx.reply(reply, kb));
        logActivity({ from, question: `[חיפוש לוח חשמל] ${text}`, answer: reply, type: 'panel-search' });
        notifyChannelActivity('טלגרם', { from, question: `[חיפוש לוח חשמל] ${text}`, answer: reply, type: 'panel-search' }).catch(
          (err) => console.error('Telegram notify:', err.message)
        );
      } else {
        const ids = getTransformerIds();
        await ctx.reply(`לא נמצא שנאי "${text}". בחר שנאי קיים:`, transformerPickKeyboard(ids));
      }
      searchState.set(ctx.from.id, 'panels'); // ממשיכים לחפש ברצף
      return;
    }

    const result = searchPanels(text);
    if (result.type === 'load' && result.results.length > 1) {
      pendingResults.set(ctx.from.id, { kind: 'panels', results: result.results });
      await ctx.reply(
        `נמצאו ${result.results.length} תוצאות עבור "${text}" — לא כתבת מדויק? בחר את הכוונה:`,
        panelPickKeyboard(result.results)
      );
      searchState.set(ctx.from.id, 'panels');
      return;
    }

    const reply = formatPanelResults(result);
    const kb = searchAgainKeyboard('panels');
    await ctx.reply(reply, { parse_mode: 'Markdown', ...kb }).catch(() => ctx.reply(reply, kb));
    logActivity({ from, question: `[חיפוש לוח חשמל] ${text}`, answer: reply, type: 'panel-search' });
    notifyChannelActivity('טלגרם', { from, question: `[חיפוש לוח חשמל] ${text}`, answer: reply, type: 'panel-search' }).catch(
      (err) => console.error('Telegram notify:', err.message)
    );
    searchState.set(ctx.from.id, 'panels');
    return;
  } else if (pendingSearch === 'instruments') {
    const result = searchInstruments(text);

    if (result.results.length > 1) {
      pendingResults.set(ctx.from.id, { kind: 'instruments', results: result.results });
      await ctx.reply(
        `נמצאו ${result.total} תוצאות עבור "${text}" — לא כתבת מדויק? בחר את הכוונה:`,
        instrumentPickKeyboard(result.results)
      );
      searchState.set(ctx.from.id, 'instruments');
      return;
    }

    const reply = formatInstrumentResults(text, result);
    const kb = searchAgainKeyboard('instruments');
    await ctx.reply(reply, { parse_mode: 'Markdown', ...kb }).catch(() => ctx.reply(reply, kb));
    logActivity({ from, question: `[חיפוש מכשיר] ${text}`, answer: reply, type: 'instrument-search' });
    notifyChannelActivity('טלגרם', { from, question: `[חיפוש מכשיר] ${text}`, answer: reply, type: 'instrument-search' }).catch(
      (err) => console.error('Telegram notify:', err.message)
    );
    searchState.set(ctx.from.id, 'instruments');
    return;
  }

  if (isMenuExit) {
    return ctx.reply('📋 בחר קטגוריה:', customerNodeKeyboard([]));
  }

  try {
    await ctx.sendChatAction('typing');
    const local = localDiagnose(text);
    const answer = await smartAnswer(text);
    await ctx.reply(answer, { parse_mode: 'Markdown' }).catch(() => ctx.reply(answer));

    logActivity({ from, question: text, answer, type: local.type });

    notifyChannelActivity('טלגרם', { from, question: text, answer, type: local.type }).catch(
      (err) => console.error('Telegram notify:', err.message)
    );
  } catch (err) {
    console.error('Customer handler error:', err);
    await ctx.reply('אירעה שגיאה פנימית. נסה שוב בעוד רגע, או כתוב *עזרה*.');
  }
}

/** רישום handlers של בוט הלקוחות – תפריט + אבחון חופשי. אין כאן שום פקודת ניהול. */
function registerCustomerHandlers(bot) {
  bot.start(async (ctx) => {
    // איפוס כל מצב תלוי-משתמש – /start תמיד מתחיל נקי בתפריט הראשי
    searchState.delete(ctx.from.id);
    pendingResults.delete(ctx.from.id);
    // מוודאים שלא נשארת אצל המשתמש הזה לשונית "MENU" ליד ההקלדה (ברירת מחדל רגילה של טלגרם)
    ctx.telegram
      .setChatMenuButton({ chat_id: ctx.chat.id, menu_button: { type: 'default' } })
      .catch(() => {});
    const answer = await smartAnswer('שלום');
    await ctx.reply(answer, { parse_mode: 'Markdown' }).catch(() => ctx.reply(answer));
    await ctx.reply('בחר קטגוריה מהתפריט, או פשוט תאר את התקלה בהודעה חופשית:', customerNodeKeyboard([]));
  });

  bot.command('menu', async (ctx) => {
    searchState.delete(ctx.from.id);
    pendingResults.delete(ctx.from.id);
    await ctx.reply('📋 בחר קטגוריה:', customerNodeKeyboard([]));
  });

  bot.action(/mnav:(.+)/, async (ctx) => {
    await ctx.answerCbQuery().catch(() => {});
    searchState.delete(ctx.from.id); // ניווט בתפריט תמיד יוצא ממצב חיפוש
    const path = decodePath(ctx.match[1]);
    const node = path.length ? getMenuNode(path) : { name: 'תפריט ראשי', items: getMenu() };
    if (!node) return ctx.reply('לא נמצא.');

    if (node.search === 'panels') {
      searchState.set(ctx.from.id, 'panels');
      await ctx.reply(
        '🔍 הקלד שם צרכן/לוח (למשל: פרוקטוזה), או מספר שנאי (למשל: שנאי 5).\nאפשר לחפש שוב ברצף בלי לחזור לתפריט — כתוב "תפריט" כדי לצאת.'
      );
      return;
    }
    if (node.search === 'instruments') {
      searchState.set(ctx.from.id, 'instruments');
      await ctx.reply(
        '🔍 הקלד TAG של מכשיר או חלק ממנו (למשל: ZSC-01401 או PS-3565).\nאפשר לחפש שוב ברצף בלי לחזור לתפריט — כתוב "תפריט" כדי לצאת.'
      );
      return;
    }

    if (isMenuFolder(node)) {
      const title = path.length ? `📂 *${node.name}*\nבחר נושא:` : '📋 בחר קטגוריה:';
      if (node.attachment) await sendAttachment(ctx, node.attachment);
      await ctx
        .editMessageText(title, { parse_mode: 'Markdown', ...customerNodeKeyboard(path) })
        .catch(() => ctx.reply(title, { parse_mode: 'Markdown', ...customerNodeKeyboard(path) }));
      return;
    }

    // עלה – מציגים את התוכן (+ קובץ מצורף אם יש)
    if (node.attachment?.type === 'photo') {
      const caption = node.text.length <= 1000 ? node.text : undefined;
      await sendAttachment(ctx, node.attachment, { caption, parse_mode: 'Markdown' });
      if (!caption) await ctx.reply(node.text, { parse_mode: 'Markdown' }).catch(() => ctx.reply(node.text));
    } else if (node.attachment?.type === 'document') {
      await ctx.reply(node.text, { parse_mode: 'Markdown' }).catch(() => ctx.reply(node.text));
      await sendAttachment(ctx, node.attachment);
    } else {
      await ctx.reply(node.text, { parse_mode: 'Markdown' }).catch(() => ctx.reply(node.text));
    }
    await ctx.reply('רוצה עוד נושא?', customerNodeKeyboard(path.slice(0, -1)));

    {
      const menuFrom = `telegram:${ctx.from.id}${ctx.from.username ? ' (@' + ctx.from.username + ')' : ''}`;
      logActivity({ from: menuFrom, question: `[תפריט] ${path.join(' → ')}`, answer: node.text, type: 'menu' });
      notifyChannelActivity('טלגרם', { from: menuFrom, question: `[תפריט] ${path.join(' → ')}`, answer: node.text, type: 'menu' }).catch(
        (err) => console.error('Telegram notify:', err.message)
      );
    }
  });

  bot.action(/panelpick:(\d+)/, async (ctx) => {
    await ctx.answerCbQuery().catch(() => {});
    const state = pendingResults.get(ctx.from.id);
    if (!state || state.kind !== 'panels') {
      return ctx.reply('התוצאות פגו – נסה חיפוש חדש (חשמל → 🔍 חיפוש לוח חשמל).');
    }
    const p = state.results[Number(ctx.match[1])];
    if (!p) return ctx.reply('לא נמצא.');
    const reply = formatPanelResults({ type: 'load', key: p.load, results: [p] });
    const kb = searchAgainKeyboard('panels');
    await ctx.reply(reply, { parse_mode: 'Markdown', ...kb }).catch(() => ctx.reply(reply, kb));
    searchState.set(ctx.from.id, 'panels');
    const pf = `telegram:${ctx.from.id}${ctx.from.username ? ' (@' + ctx.from.username + ')' : ''}`;
    logActivity({ from: pf, question: `[חיפוש לוח חשמל - בחירה] ${p.load}`, answer: reply, type: 'panel-search' });
    notifyChannelActivity('טלגרם', { from: pf, question: `[חיפוש לוח חשמל - בחירה] ${p.load}`, answer: reply, type: 'panel-search' }).catch(
      (err) => console.error('Telegram notify:', err.message)
    );
  });

  bot.action(/xfmrpick:(.+)/, async (ctx) => {
    await ctx.answerCbQuery().catch(() => {});
    loadKnowledge();
    const result = searchPanels(`שנאי ${ctx.match[1]}`);
    const reply = formatPanelResults(result);
    const kb = searchAgainKeyboard('panels');
    await ctx.reply(reply, { parse_mode: 'Markdown', ...kb }).catch(() => ctx.reply(reply, kb));
    searchState.set(ctx.from.id, 'panels');
    const xf = `telegram:${ctx.from.id}${ctx.from.username ? ' (@' + ctx.from.username + ')' : ''}`;
    logActivity({ from: xf, question: `[חיפוש לוח חשמל] שנאי ${ctx.match[1]}`, answer: reply, type: 'panel-search' });
    notifyChannelActivity('טלגרם', { from: xf, question: `[חיפוש לוח חשמל] שנאי ${ctx.match[1]}`, answer: reply, type: 'panel-search' }).catch(
      (err) => console.error('Telegram notify:', err.message)
    );
  });

  bot.action(/instrpick:(\d+)/, async (ctx) => {
    await ctx.answerCbQuery().catch(() => {});
    const state = pendingResults.get(ctx.from.id);
    if (!state || state.kind !== 'instruments') {
      return ctx.reply('התוצאות פגו – נסה חיפוש חדש (מכשור → 🔍 חיפוש מכשיר).');
    }
    const r = state.results[Number(ctx.match[1])];
    if (!r) return ctx.reply('לא נמצא.');
    const reply = formatInstrumentResults(r.tag, { total: 1, results: [r] });
    const kb = searchAgainKeyboard('instruments');
    await ctx.reply(reply, { parse_mode: 'Markdown', ...kb }).catch(() => ctx.reply(reply, kb));
    searchState.set(ctx.from.id, 'instruments');
    const inf = `telegram:${ctx.from.id}${ctx.from.username ? ' (@' + ctx.from.username + ')' : ''}`;
    logActivity({ from: inf, question: `[חיפוש מכשיר - בחירה] ${r.tag}`, answer: reply, type: 'instrument-search' });
    notifyChannelActivity('טלגרם', { from: inf, question: `[חיפוש מכשיר - בחירה] ${r.tag}`, answer: reply, type: 'instrument-search' }).catch(
      (err) => console.error('Telegram notify:', err.message)
    );
  });

  bot.action(/research:(panels|instruments)/, async (ctx) => {
    await ctx.answerCbQuery().catch(() => {});
    const kind = ctx.match[1];
    searchState.set(ctx.from.id, kind);
    await ctx.reply(searchPrompt(kind));
  });

  bot.on('text', async (ctx) => {
    if (ctx.message.text?.startsWith('/')) return;
    return handleCustomerMessage(ctx);
  });

  bot.catch((err) => console.error('Customer bot error:', err));
}

/** רישום handlers של בוט הניהול – כל פקודות הניהול והוספת תקלות. */
function registerAdminHandlers(bot) {
  bot.start(async (ctx) => {
    if (!isAdmin(ctx)) return deny(ctx);
    await ctx.reply(helpText(), { parse_mode: 'Markdown' });
  });

  bot.command('help', async (ctx) => {
    if (!isAdmin(ctx)) return deny(ctx);
    await ctx.reply(helpText(), { parse_mode: 'Markdown' });
  });

  bot.command('myid', async (ctx) => {
    await ctx.reply(
      `ה-Telegram ID שלך:\n\`${ctx.from.id}\`\n\nהוסף אותו ל-\`TELEGRAM_ADMIN_IDS\` בקובץ .env`,
      { parse_mode: 'Markdown' }
    );
  });

  bot.command('stats', async (ctx) => {
    if (!isAdmin(ctx)) return deny(ctx);
    loadKnowledge();
    const s = getStats();
    const cats = Object.entries(s.byCategory)
      .map(([k, v]) => `• ${k}: ${v}`)
      .join('\n');
    await ctx.reply(
      `📊 *סטטיסטיקה*\n\n` +
        `תקלות בבסיס: ${s.faultCount}\n` +
        `שאלות היום: ${s.questionsToday}\n` +
        `סה״כ בלוג: ${s.totalLogged}\n\n` +
        `לפי קטגוריה:\n${cats}`,
      { parse_mode: 'Markdown' }
    );
  });

  bot.command('list', async (ctx) => {
    if (!isAdmin(ctx)) return deny(ctx);
    loadKnowledge();
    const faults = listFaults();
    const lines = faults.map(
      (f, i) => `${i + 1}. [${f.category}] ${f.title}`
    );
    const chunk = lines.join('\n');
    if (chunk.length < 3500) {
      await ctx.reply(`📚 *תקלות (${faults.length})*\n\n${chunk}`, {
        parse_mode: 'Markdown',
      });
    } else {
      let buf = `📚 תקלות (${faults.length})\n\n`;
      for (const line of lines) {
        if ((buf + line + '\n').length > 3500) {
          await ctx.reply(buf);
          buf = '';
        }
        buf += line + '\n';
      }
      if (buf) await ctx.reply(buf);
    }
  });

  bot.command('last', async (ctx) => {
    if (!isAdmin(ctx)) return deny(ctx);
    const items = getRecentActivity(10);
    if (!items.length) {
      return ctx.reply('אין עדיין פעילות מלקוחות.');
    }
    const text = items
      .map((e, i) => {
        const t = new Date(e.at).toLocaleString('he-IL');
        return (
          `${i + 1}. ${t}\n` +
          `👤 ${e.from || '?'}\n` +
          `❓ ${truncate(e.question, 120)}\n` +
          `✅ ${truncate(e.answer, 120)}`
        );
      })
      .join('\n\n────────\n\n');
    await ctx.reply(text);
  });

  bot.command('reload', async (ctx) => {
    if (!isAdmin(ctx)) return deny(ctx);
    loadKnowledge();
    await ctx.reply(`🔄 נטען מחדש. תקלות: ${listFaults().length}`);
  });

  bot.command('setwelcome', async (ctx) => {
    if (!isAdmin(ctx)) return deny(ctx);
    loadKnowledge();
    const current = getKnowledge().welcome || '';
    drafts.set(ctx.from.id, { kind: 'set-welcome', step: 'text', data: {} });
    await ctx.reply(
      `📝 *הכותרת/הודעת הפתיחה הנוכחית:*\n\n${current}\n\n———\n\nשלח את הטקסט החדש (זה מה שלקוחות רואים ראשון כשהם שולחים /start או "שלום"):`,
      { parse_mode: 'Markdown' }
    );
  });

  bot.command('cancel', async (ctx) => {
    drafts.delete(ctx.from.id);
    await ctx.reply('בוטל.');
  });

  bot.action('cancel_add', async (ctx) => {
    drafts.delete(ctx.from.id);
    await ctx.answerCbQuery('בוטל').catch(() => {});
    await ctx.reply('הוספת תקלה בוטלה.');
  });

  bot.command('add', async (ctx) => {
    if (!isAdmin(ctx)) return deny(ctx);
    drafts.set(ctx.from.id, { kind: 'fault', step: 'title', data: {} });
    await ctx.reply(
      '➕ *הוספת תקלה חדשה*\n\nשלח את *כותרת התקלה*\n(למשל: וסת ABB שגיאת F0021)\n\n/cancel לביטול',
      { parse_mode: 'Markdown' }
    );
  });

  // ניווט אחיד בעץ התפריט (עומק בלתי מוגבל) — /listmenu, /addmenu, /editmenu, /delmenu כולם נכנסים לאותה גלישה
  async function showAdminNode(ctx, path) {
    loadKnowledge();
    const node = getMenuNode(path);
    if (!node) return ctx.reply('לא נמצא.');
    if (node.search === 'panels' || node.search === 'instruments') {
      const count = node.search === 'panels' ? getPanels().length : getInstrumentCount();
      const body = `🔍 *${node.name}*\n\nזה לא תוכן רגיל אלא כפתור חיפוש – לקוחות שלוחצים עליו מתבקשים להקליד שאילתה, והבוט מחפש במסד נתונים (${count} רשומות).`;
      await ctx
        .editMessageText(body, { parse_mode: 'Markdown', ...adminLeafKeyboard(path) })
        .catch(() => ctx.reply(body, { parse_mode: 'Markdown', ...adminLeafKeyboard(path) }));
      return;
    }
    if (isMenuFolder(node)) {
      const attachNote = node.attachment ? `\n\n📎 יש קובץ מצורף (${node.attachment.type === 'photo' ? 'תמונה' : 'מסמך'})` : '';
      const body = `📂 *${node.name}*${attachNote}\n\n${
        node.items.map((i) => `${isMenuFolder(i) ? '📂' : '📝'} ${i.name}`).join('\n') || '(ריק)'
      }`;
      await ctx
        .editMessageText(body, { parse_mode: 'Markdown', ...adminNodeKeyboard(path) })
        .catch(() => ctx.reply(body, { parse_mode: 'Markdown', ...adminNodeKeyboard(path) }));
    } else {
      const attachNote = node.attachment ? `\n\n📎 יש קובץ מצורף (${node.attachment.type === 'photo' ? 'תמונה' : 'מסמך'})` : '';
      const body = `📝 *${node.name}*\n\n${node.text}${attachNote}`;
      const kb = adminLeafKeyboard(path, Boolean(node.attachment));
      await ctx
        .editMessageText(body, { parse_mode: 'Markdown', ...kb })
        .catch(() => ctx.reply(body, { parse_mode: 'Markdown', ...kb }));
    }
  }

  bot.command(['listmenu', 'addmenu', 'editmenu', 'delmenu'], async (ctx) => {
    if (!isAdmin(ctx)) return deny(ctx);
    await showAdminNode(ctx, []);
  });

  bot.action(/anav:(.+)/, async (ctx) => {
    if (!isAdmin(ctx)) return deny(ctx);
    await ctx.answerCbQuery().catch(() => {});
    await showAdminNode(ctx, decodePath(ctx.match[1]));
  });

  bot.action(/aleaf:(.+)/, async (ctx) => {
    if (!isAdmin(ctx)) return deny(ctx);
    await ctx.answerCbQuery().catch(() => {});
    const path = decodePath(ctx.match[1]);
    drafts.set(ctx.from.id, { kind: 'menu-add-leaf', step: 'name', data: { path } });
    await ctx.reply('שלח את *שם הנושא* (מה שיופיע ככפתור):', { parse_mode: 'Markdown' });
  });

  bot.action(/afolder:(.+)/, async (ctx) => {
    if (!isAdmin(ctx)) return deny(ctx);
    await ctx.answerCbQuery().catch(() => {});
    const path = decodePath(ctx.match[1]);
    drafts.set(ctx.from.id, { kind: 'menu-add-folder', step: 'name', data: { path } });
    await ctx.reply('שלח את *שם התת-קטגוריה* (למשל: ABB):', { parse_mode: 'Markdown' });
  });

  bot.action(/arename:(.+)/, async (ctx) => {
    if (!isAdmin(ctx)) return deny(ctx);
    await ctx.answerCbQuery().catch(() => {});
    const path = decodePath(ctx.match[1]);
    drafts.set(ctx.from.id, { kind: 'menu-rename', step: 'name', data: { path } });
    await ctx.reply('שלח *שם חדש*:', { parse_mode: 'Markdown' });
  });

  bot.action(/aedittext:(.+)/, async (ctx) => {
    if (!isAdmin(ctx)) return deny(ctx);
    await ctx.answerCbQuery().catch(() => {});
    const path = decodePath(ctx.match[1]);
    drafts.set(ctx.from.id, { kind: 'menu-edittext', step: 'text', data: { path } });
    await ctx.reply('שלח את *התוכן החדש* המלא:', { parse_mode: 'Markdown' });
  });

  bot.action(/aattach:(.+)/, async (ctx) => {
    if (!isAdmin(ctx)) return deny(ctx);
    await ctx.answerCbQuery().catch(() => {});
    const path = decodePath(ctx.match[1]);
    drafts.set(ctx.from.id, { kind: 'menu-attach', step: 'file', data: { path } });
    await ctx.reply('שלח עכשיו תמונה או קובץ (מסמך) — הם יצורפו לנושא הזה.');
  });

  bot.action(/adelattach:(.+)/, async (ctx) => {
    if (!isAdmin(ctx)) return deny(ctx);
    await ctx.answerCbQuery().catch(() => {});
    const path = decodePath(ctx.match[1]);
    try {
      const old = getMenuNode(path)?.attachment;
      setMenuAttachment(path, null);
      if (old?.file) await deleteAttachmentFile(old.file);
      await ctx.reply('🗑️ הקובץ/תמונה הוסרו.');
      await showAdminNode(ctx, path);
    } catch (err) {
      await ctx.reply('שגיאה: ' + err.message);
    }
  });

  bot.on('photo', async (ctx) => {
    if (!isAdmin(ctx)) return;
    const draft = drafts.get(ctx.from.id);
    if (!draft || draft.kind !== 'menu-attach') {
      await ctx.reply(
        'קיבלתי תמונה, אבל לא ביקשת לצרף אותה לשום נושא. ' +
          'לצירוף: /listmenu ← בחר נושא ← "🖼️ הוסף קובץ/תמונה" ← ואז שלח את התמונה.'
      );
      return;
    }
    const sizes = ctx.message.photo;
    const fileId = sizes[sizes.length - 1].file_id; // הגדולה ביותר
    try {
      const buf = await downloadTelegramFile(ctx.telegram, fileId);
      const file = await saveAttachmentFile(buf);
      const node = setMenuAttachment(draft.data.path, { type: 'photo', file });
      drafts.delete(ctx.from.id);
      console.log(`[attach] ${ctx.from.id} attached photo to "${node.name}"`);
      await ctx.reply(`✅ התמונה צורפה לנושא "${node.name}"`);
    } catch (err) {
      console.error('[attach] photo error:', err.message);
      await ctx.reply('שגיאה בצירוף: ' + err.message + '\n\nנסה שוב: /listmenu ← בחר נושא ← "🖼️ הוסף קובץ/תמונה".');
    }
  });

  bot.on('document', async (ctx) => {
    if (!isAdmin(ctx)) return;
    const draft = drafts.get(ctx.from.id);
    if (!draft || draft.kind !== 'menu-attach') {
      await ctx.reply(
        'קיבלתי קובץ, אבל לא ביקשת לצרף אותו לשום נושא. ' +
          'לצירוף: /listmenu ← בחר נושא ← "🖼️ הוסף קובץ/תמונה" ← ואז שלח את הקובץ (PDF וכו׳).'
      );
      return;
    }
    const doc = ctx.message.document;
    try {
      const buf = await downloadTelegramFile(ctx.telegram, doc.file_id);
      const file = await saveAttachmentFile(buf);
      const node = setMenuAttachment(draft.data.path, {
        type: 'document',
        file,
        name: doc.file_name,
      });
      drafts.delete(ctx.from.id);
      console.log(`[attach] ${ctx.from.id} attached document "${doc.file_name}" to "${node.name}"`);
      await ctx.reply(`✅ הקובץ "${doc.file_name}" צורף לנושא "${node.name}"`);
    } catch (err) {
      console.error('[attach] document error:', err.message);
      await ctx.reply('שגיאה בצירוף: ' + err.message + '\n\nנסה שוב: /listmenu ← בחר נושא ← "🖼️ הוסף קובץ/תמונה".');
    }
  });

  bot.action(/adelask:(.+)/, async (ctx) => {
    if (!isAdmin(ctx)) return deny(ctx);
    await ctx.answerCbQuery().catch(() => {});
    const encoded = ctx.match[1];
    await ctx.reply(
      '⚠️ בטוח שרוצה למחוק? כולל כל מה שבתוכו (אם יש). זה בלתי הפיך.',
      Markup.inlineKeyboard([
        [Markup.button.callback('✅ כן, מחק', `adelyes:${encoded}`)],
        [Markup.button.callback('❌ ביטול', `anav:${encoded}`)],
      ])
    );
  });

  bot.action(/adelyes:(.+)/, async (ctx) => {
    if (!isAdmin(ctx)) return deny(ctx);
    await ctx.answerCbQuery().catch(() => {});
    const path = decodePath(ctx.match[1]);
    try {
      const removed = deleteMenuNode(path);
      await ctx.reply(`🗑️ נמחק: ${removed.name}`);
      await showAdminNode(ctx, path.slice(0, -1));
    } catch (err) {
      await ctx.reply('שגיאה במחיקה: ' + err.message);
    }
  });

  bot.action(/cat:(.+)/, async (ctx) => {
    if (!isAdmin(ctx)) return deny(ctx);
    const draft = drafts.get(ctx.from.id);
    if (!draft || draft.step !== 'category') {
      return ctx.answerCbQuery('אין תהליך פעיל').catch(() => {});
    }
    draft.data.category = ctx.match[1];
    draft.step = 'symptoms';
    await ctx.answerCbQuery().catch(() => {});
    await ctx.reply(
      'תסמינים / מילות מפתח (הפרד בפסיק או שורה חדשה):\nלמשל: F0021, overcurrent, זרם יתר'
    );
  });

  bot.on('text', async (ctx) => {
    if (ctx.message.text?.startsWith('/')) return;
    if (!isAdmin(ctx)) return;

    const draft = drafts.get(ctx.from.id);
    if (!draft) return;

    const text = ctx.message.text.trim();

    if (draft.kind === 'menu-add-leaf') {
      if (draft.step === 'name') {
        draft.data.name = text;
        draft.step = 'text';
        await ctx.reply(
          'שלח את *תוכן התשובה* המלא (אפשר כמה שורות, אפשר *הדגשה* בפורמט טלגרם):',
          { parse_mode: 'Markdown' }
        );
        return;
      }
      if (draft.step === 'text') {
        try {
          const item = addMenuLeaf(draft.data.path, draft.data.name, text);
          drafts.delete(ctx.from.id);
          await ctx.reply(`✅ נשמר לתפריט!\n\nנושא: ${item.name}\n\nהבוט ללקוחות כבר מציג את זה.`);
        } catch (err) {
          await ctx.reply('שגיאה בשמירה: ' + err.message);
        }
        return;
      }
      return;
    }

    if (draft.kind === 'menu-add-folder') {
      if (draft.step === 'name') {
        try {
          const folder = addMenuFolder(draft.data.path, text);
          drafts.delete(ctx.from.id);
          await ctx.reply(`✅ נוצרה תת-קטגוריה "${folder.name}"\n\nהשתמש ב-/listmenu כדי להוסיף לתוכה נושאים.`);
        } catch (err) {
          await ctx.reply('שגיאה ביצירה: ' + err.message);
        }
        return;
      }
      return;
    }

    if (draft.kind === 'menu-rename') {
      if (draft.step === 'name') {
        try {
          const node = updateMenuNode(draft.data.path, { name: text });
          drafts.delete(ctx.from.id);
          await ctx.reply(`✅ שונה שם ל-"${node.name}"`);
        } catch (err) {
          await ctx.reply('שגיאה בשינוי שם: ' + err.message);
        }
        return;
      }
      return;
    }

    if (draft.kind === 'menu-edittext') {
      if (draft.step === 'text') {
        try {
          const node = updateMenuNode(draft.data.path, { text });
          drafts.delete(ctx.from.id);
          await ctx.reply(`✅ עודכן תוכן "${node.name}"`);
        } catch (err) {
          await ctx.reply('שגיאה בעדכון: ' + err.message);
        }
        return;
      }
      return;
    }

    if (draft.kind === 'set-welcome') {
      if (draft.step === 'text') {
        const data = getKnowledge();
        data.welcome = text;
        saveKnowledge();
        drafts.delete(ctx.from.id);
        await ctx.reply('✅ הכותרת/הודעת הפתיחה עודכנה. זה כבר בתוקף.');
        return;
      }
      return;
    }

    if (draft.step === 'title') {
      draft.data.title = text;
      draft.step = 'category';
      await ctx.reply('בחר קטגוריה:', categoryKeyboard());
      return;
    }

    if (draft.step === 'symptoms') {
      draft.data.symptoms = text.split(/[,\n]/).map((s) => s.trim()).filter(Boolean);
      draft.step = 'causes';
      await ctx.reply(
        'סיבות אפשריות (כל סיבה בשורה נפרדת):\n1. ...\n2. ...'
      );
      return;
    }

    if (draft.step === 'causes') {
      draft.data.causes = text
        .split('\n')
        .map((s) => s.replace(/^\d+[\.)]\s*/, '').trim())
        .filter(Boolean);
      draft.step = 'steps';
      await ctx.reply(
        'צעדי בדיקה (כל צעד בשורה נפרדת):\n1. ...\n2. ...'
      );
      return;
    }

    if (draft.step === 'steps') {
      draft.data.steps = text
        .split('\n')
        .map((s) => s.replace(/^\d+[\.)]\s*/, '').trim())
        .filter(Boolean);
      draft.step = 'safety';
      await ctx.reply(
        'אזהרת בטיחות (או כתוב "אין" אם לא רלוונטי):'
      );
      return;
    }

    if (draft.step === 'safety') {
      const safety =
        text === 'אין' || text.toLowerCase() === 'none' ? null : text;
      try {
        const fault = addFault({ ...draft.data, safety });
        drafts.delete(ctx.from.id);
        await ctx.reply(
          `✅ נשמר!\n\n` +
            `ID: \`${fault.id}\`\n` +
            `כותרת: ${fault.title}\n` +
            `קטגוריה: ${fault.category}\n` +
            `תסמינים: ${fault.symptoms.join(', ')}\n\n` +
            `הבוט ללקוחות כבר יודע לענות על זה.`,
          { parse_mode: 'Markdown' }
        );
      } catch (err) {
        await ctx.reply('שגיאה בשמירה: ' + err.message);
      }
    }
  });

  bot.catch((err) => console.error('Admin bot error:', err));
}

async function launchBot(bot, label) {
  const launched = bot.launch();
  launched.catch((err) => console.error(`${label} launch error:`, err.message));
  const me = await bot.telegram.getMe();
  console.log(`📨 ${label} פעיל: @${me.username}`);
  process.once('SIGINT', () => bot.stop('SIGINT'));
  process.once('SIGTERM', () => bot.stop('SIGTERM'));
  return me;
}

let botsBuilt = false;

/**
 * יוצר את מופעי Telegraf ורושם את כל ה-handlers, בלי launch (polling) —
 * המשותף בין הרצה מקומית (polling, startTelegramAdmin) לבין webhooks ב-Vercel (api/telegram-*.js).
 */
async function buildBots() {
  if (botsBuilt) return { customerBot, adminBot };

  const customerToken = process.env.TELEGRAM_BOT_TOKEN?.trim();
  const adminToken = process.env.TELEGRAM_ADMIN_BOT_TOKEN?.trim();
  if (!customerToken) return { customerBot: null, adminBot: null };

  adminIds = new Set(
    (process.env.TELEGRAM_ADMIN_IDS || '')
      .split(',')
      .map((x) => x.trim().replace(/^@/, '').toLowerCase())
      .filter(Boolean)
  );

  customerBot = new Telegraf(customerToken);
  registerCustomerHandlers(customerBot);
  await customerBot.telegram.setMyCommands([
    { command: 'start', description: 'התחלה / תפריט ראשי' },
    { command: 'menu', description: 'פתח את התפריט' },
  ]).catch((err) => console.error('setMyCommands (לקוחות):', err.message));
  // מבטלים את כפתור/לשונית "MENU" ליד תיבת ההקלדה (חוזרים לברירת המחדל של טלגרם) —
  // הניווט כולו קורה עכשיו דרך כפתורים בתוך ההודעות עצמן.
  await customerBot.telegram.setChatMenuButton({
    menu_button: { type: 'default' },
  }).catch((err) => console.error('setChatMenuButton (לקוחות):', err.message));

  if (adminToken) {
    adminBot = new Telegraf(adminToken);
    registerAdminHandlers(adminBot);
    await adminBot.telegram.setMyCommands([
      { command: 'start', description: 'תפריט ניהול' },
      { command: 'add', description: 'הוספת תקלה (חיפוש חופשי)' },
      { command: 'addmenu', description: 'הוספת נושא לתפריט הראשי' },
      { command: 'editmenu', description: 'עריכת נושא קיים בתפריט' },
      { command: 'listmenu', description: 'הצגת עץ התפריט' },
      { command: 'delmenu', description: 'מחיקת נושא מהתפריט' },
      { command: 'list', description: 'רשימת תקלות' },
      { command: 'last', description: '10 שאלות אחרונות' },
      { command: 'stats', description: 'סטטיסטיקה' },
      { command: 'reload', description: 'טעינה מחדש' },
      { command: 'setwelcome', description: 'שינוי כותרת הפתיחה' },
      { command: 'myid', description: 'הצגת ה-ID שלך' },
    ]).catch((err) => console.error('setMyCommands (ניהול):', err.message));
  } else {
    // אין בוט ניהול נפרד – פקודות הניהול פועלות גם דרך בוט הלקוחות (מצב מאוחד, לתאימות לאחור)
    registerAdminHandlers(customerBot);
    console.log('ℹ️ אין TELEGRAM_ADMIN_BOT_TOKEN – פקודות ניהול פעילות גם בבוט הלקוחות');
  }

  if (adminIds.size === 0) {
    console.log('   ⚠️ TELEGRAM_ADMIN_IDS ריק – שלח /myid לבוט הניהול והוסף ל-.env');
  } else {
    console.log(`   מנהלים: ${[...adminIds].join(', ')}`);
  }

  botsBuilt = true;
  return { customerBot, adminBot };
}

/** הרצה מקומית/Railway – polling (bot.launch) */
export async function startTelegramAdmin() {
  const { customerBot: cb, adminBot: ab } = await buildBots();
  if (!cb) {
    console.log('ℹ️ טלגרם לא מוגדר (TELEGRAM_BOT_TOKEN) – מדלג');
    return null;
  }
  await launchBot(cb, 'בוט לקוחות');
  if (ab) await launchBot(ab, 'בוט ניהול');
  return cb;
}

/** ל-Vercel: בונה את הבוטים בלי launch (אין polling ב-serverless, הטיפול בהודעות דרך webhook) */
export async function getWebhookBots() {
  return buildBots();
}

// ─── מצב משתמש בין בקשות (Vercel) ───────────────────────────
// drafts (אשפים רב-שלביים כמו "הוסף נושא"), searchState ו-pendingResults חיים בזיכרון המופע –
// ב-Vercel הודעה הבאה יכולה להגיע למופע אחר ולאבד אותם. לכן טוענים אותם מבסיס הנתונים בתחילת
// כל בקשה ושומרים בסופה (רק אם השתנו).

function getUpdateUserId(update) {
  return (
    update?.message?.from?.id ??
    update?.edited_message?.from?.id ??
    update?.callback_query?.from?.id ??
    update?.inline_query?.from?.id ??
    null
  );
}

function userStateKey(userId) {
  return `ustate:${userId}`;
}

function snapshotUserState(userId) {
  const state = {};
  if (drafts.has(userId)) state.draft = drafts.get(userId);
  if (searchState.has(userId)) state.search = searchState.get(userId);
  if (pendingResults.has(userId)) state.pending = pendingResults.get(userId);
  return Object.keys(state).length ? JSON.stringify(state) : null;
}

/** מעבד עדכון webhook אחד כולל טעינה/שמירה של מצב המשתמש */
export async function handleWebhookUpdate(bot, update) {
  const userId = hasStore() ? getUpdateUserId(update) : null;
  let before = null;
  if (userId !== null) {
    drafts.delete(userId);
    searchState.delete(userId);
    pendingResults.delete(userId);
    const raw = await getValue(userStateKey(userId));
    if (raw) {
      const state = JSON.parse(raw);
      if (state.draft) drafts.set(userId, state.draft);
      if (state.search) searchState.set(userId, state.search);
      if (state.pending) pendingResults.set(userId, state.pending);
    }
    before = snapshotUserState(userId);
  }

  await bot.handleUpdate(update);

  if (userId !== null) {
    const after = snapshotUserState(userId);
    if (after !== before) {
      if (after === null) await deleteValue(userStateKey(userId));
      else await setValue(userStateKey(userId), after);
    }
  }
}
