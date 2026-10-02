// Bale bot for the "اصغرآقا" shopping advisor.
// Polls Bale for messages and answers them through the site's /api/bot/advisor endpoint.
// Run (while the site is running): node scripts/bale-bot.mjs
import { existsSync, readFileSync } from 'node:fs';
import { basename, join } from 'node:path';

const vars = Object.fromEntries(
  readFileSync('.dev.vars', 'utf8')
    .split(/\r?\n/)
    .filter((line) => line.includes('=') && !line.startsWith('#'))
    .map((line) => [line.slice(0, line.indexOf('=')).trim(), line.slice(line.indexOf('=') + 1).trim()]),
);
const TOKEN = process.env.BALE_BOT_TOKEN || vars.BALE_BOT_TOKEN;
const SECRET = process.env.BOT_API_SECRET || vars.BOT_API_SECRET;
const SITE = process.env.SITE_URL || vars.SITE_URL || 'http://localhost:3000';
const OPENAI_KEY = process.env.OPENAI_API_KEY || vars.OPENAI_API_KEY;
const IMAGE_MODEL = process.env.OPENAI_IMAGE_MODEL || vars.OPENAI_IMAGE_MODEL || 'gpt-image-2';
if (!TOKEN || !SECRET) {
  console.error('BALE_BOT_TOKEN and BOT_API_SECRET must be set in .dev.vars');
  process.exit(1);
}

const BALE = `https://tapi.bale.ai/bot${TOKEN}`;
const money = new Intl.NumberFormat('fa-IR');
const histories = new Map(); // chatId -> [{ role, content }]
const WELCOME = 'سلام! من اصغرآقا هستم، مشاور خرید فروشگاه همه‌چی 🛍️\nبگو دنبال چی هستی، برای چه مناسبتی و حدوداً چقدر بودجه داری، تا بهترین محصول را پیشنهاد بدهم.\n\n📸 اگر عکس تمام‌قدت را بفرستی، تیپ پیشنهادی را روی خودت هم نشانت می‌دهم. (عکس فقط برای ساخت تصویر به سرویس هوش مصنوعی فرستاده می‌شود و ذخیره نمی‌شود.)\n\nبرای شروع گفتگوی تازه: /start';

async function bale(method, params) {
  const response = await fetch(`${BALE}/${method}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(params),
  });
  const data = await response.json();
  if (!data.ok) throw new Error(`${method}: ${data.description ?? response.status}`);
  return data.result;
}

async function advise(chatId, history) {
  const response = await fetch(`${SITE}/api/bot/advisor`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'x-bot-secret': SECRET },
    body: JSON.stringify({ chatId, messages: history }),
  });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(data.error ?? 'پاسخ مشاور دریافت نشد.');
  return data;
}

// One message per product: photo + title/price, with glass (inline) buttons for buying and viewing.
async function sendProductCard(chatId, product) {
  const caption = `🛍️ ${product.title}\n💰 ${money.format(product.price)} تومان`;
  const reply_markup = {
    inline_keyboard: [[
      { text: '🛒 خرید', url: `${SITE}/?add=${encodeURIComponent(product.id)}` },
      { text: '👁️ مشاهده محصول', url: `${SITE}/products/${encodeURIComponent(product.id)}` },
    ]],
  };
  const imagePath = product.imageUrl?.startsWith('/') ? join('public', product.imageUrl) : null;
  if (imagePath && existsSync(imagePath)) {
    try {
      const form = new FormData();
      form.append('chat_id', String(chatId));
      form.append('caption', caption);
      form.append('reply_markup', JSON.stringify(reply_markup));
      form.append('photo', new Blob([readFileSync(imagePath)]), basename(imagePath));
      const response = await fetch(`${BALE}/sendPhoto`, { method: 'POST', body: form });
      const data = await response.json();
      if (data.ok) return;
      console.error('sendPhoto failed:', data.description);
    } catch (error) {
      console.error('sendPhoto failed:', error.message);
    }
  }
  await bale('sendMessage', { chat_id: chatId, text: caption, reply_markup });
}

// Virtual try-on: the customer's photo is edited to wear the recommended clothing items.
const WEARABLE_CATEGORIES = ['پوشاک'];
const photos = new Map(); // chatId -> Buffer (kept in memory only, never written to disk)
const lastPicks = new Map(); // chatId -> products from the last recommendation

async function downloadBalePhoto(message) {
  const largest = message.photo.at(-1);
  const file = await bale('getFile', { file_id: largest.file_id });
  const response = await fetch(`https://tapi.bale.ai/file/bot${TOKEN}/${file.file_path}`);
  if (!response.ok) throw new Error('دانلود عکس ناموفق بود.');
  return Buffer.from(await response.arrayBuffer());
}

async function generateTryOn(personPhoto, wearables) {
  if (!OPENAI_KEY) throw new Error('کلید OpenAI تنظیم نشده است.');
  const form = new FormData();
  form.append('model', IMAGE_MODEL);
  form.append('size', '1024x1536');
  form.append('quality', 'medium');
  form.append('prompt', [
    'Virtual try-on for an online clothing store.',
    'The first image is the customer. Keep their face, identity, hair, skin tone, body shape and pose exactly the same.',
    `Dress them in this outfit: ${wearables.map((p) => p.title).join('، ')}.`,
    'The other images are product reference photos from the store; match their colors and style.',
    'Photorealistic full-body fashion photo, clean neutral studio background, natural lighting, modest and tasteful.',
  ].join(' '));
  form.append('image[]', new Blob([personPhoto], { type: 'image/jpeg' }), 'customer.jpg');
  const references = [...new Set(wearables.map((p) => p.imageUrl).filter((url) => url?.startsWith('/')))].slice(0, 4);
  for (const url of references) {
    const path = join('public', url);
    if (existsSync(path)) form.append('image[]', new Blob([readFileSync(path)], { type: mimeOf(path) }), basename(path));
  }
  const response = await fetch('https://api.openai.com/v1/images/edits', {
    method: 'POST',
    headers: { Authorization: `Bearer ${OPENAI_KEY}` },
    body: form,
  });
  const data = await response.json().catch(() => ({}));
  if (!response.ok || !data.data?.[0]?.b64_json) {
    console.error('image error:', response.status, data.error?.code, data.error?.message);
    throw new Error(data.error?.code === 'moderation_blocked' ? 'این عکس برای ساخت تصویر قابل استفاده نیست؛ یک عکس تمام‌قد ساده بفرست.' : 'ساخت تصویر ناموفق بود.');
  }
  return Buffer.from(data.data[0].b64_json, 'base64');
}

function mimeOf(path) {
  return path.endsWith('.png') ? 'image/png' : path.endsWith('.webp') ? 'image/webp' : 'image/jpeg';
}

async function sendPicks(chatId, products) {
  const wearables = products.filter((p) => WEARABLE_CATEGORIES.includes(p.category));
  const photo = photos.get(chatId);
  if (wearables.length && photo) {
    await bale('sendMessage', { chat_id: chatId, text: '⏳ دارم تیپت رو با این لباس‌ها می‌سازم؛ حدود یک دقیقه صبر کن...' });
    try {
      const image = await generateTryOn(photo, wearables);
      const form = new FormData();
      form.append('chat_id', String(chatId));
      form.append('caption', '✨ تیپ پیشنهادی اصغرآقا برای تو\nمحصولاتش رو پایین ببین 👇');
      form.append('photo', new Blob([image], { type: 'image/png' }), 'outfit.png');
      const sent = await (await fetch(`${BALE}/sendPhoto`, { method: 'POST', body: form })).json();
      if (!sent.ok) console.error('sendPhoto (outfit) failed:', sent.description);
    } catch (error) {
      await bale('sendMessage', { chat_id: chatId, text: `⚠️ ${error.message}` });
    }
  }
  for (const product of products) await sendProductCard(chatId, product);
  if (wearables.length && !photo) {
    await bale('sendMessage', { chat_id: chatId, text: '📸 می‌خوای ببینی این‌ها بهت میاد؟ یک عکس تمام‌قد از خودت بفرست تا تیپت رو با همین لباس‌ها بسازم.' });
  }
}

async function handle(message) {
  const chatId = message.chat.id;
  if (message.photo?.length) {
    try {
      photos.set(chatId, await downloadBalePhoto(message));
    } catch (error) {
      return bale('sendMessage', { chat_id: chatId, text: `⚠️ ${error.message}` });
    }
    const picks = lastPicks.get(chatId);
    if (picks?.some((p) => WEARABLE_CATEGORIES.includes(p.category))) return sendPicks(chatId, picks);
    return bale('sendMessage', { chat_id: chatId, text: '📸 عکست رسید! حالا بگو برای چه مناسبتی و با چه بودجه‌ای لباس می‌خوای تا تیپت رو بسازم.' });
  }
  const text = (message.text ?? '').trim();
  if (!text) return bale('sendMessage', { chat_id: chatId, text: 'لطفاً سؤالت را به صورت متن بنویس یا عکس تمام‌قدت را بفرست.' });
  if (text.startsWith('/start')) {
    histories.delete(chatId);
    photos.delete(chatId);
    lastPicks.delete(chatId);
    return bale('sendMessage', { chat_id: chatId, text: WELCOME });
  }

  const history = [...(histories.get(chatId) ?? []), { role: 'user', content: text.slice(0, 3000) }].slice(-12);
  try {
    const answer = await advise(chatId, history);
    histories.set(chatId, [...history, { role: 'assistant', content: answer.reply }].slice(-12));
    await bale('sendMessage', { chat_id: chatId, text: answer.reply, reply_to_message_id: message.message_id });
    if (answer.products?.length) {
      lastPicks.set(chatId, answer.products);
      await sendPicks(chatId, answer.products);
    }
  } catch (error) {
    console.error('advisor error:', error.message);
    await bale('sendMessage', { chat_id: chatId, text: `متأسفم، الان نمی‌توانم جواب بدهم. ${error.message}` });
  }
}

const me = await bale('getMe', {});
console.log(`Bale bot @${me.username} is running. Site: ${SITE}. Press Ctrl+C to stop.`);

let offset = 0;
for (;;) {
  try {
    const updates = await bale('getUpdates', { offset, timeout: 30 });
    for (const update of updates) {
      offset = update.update_id + 1;
      if (update.message) {
        console.log(`message from ${update.message.chat.id}`);
        handle(update.message).catch((error) => console.error('send error:', error.message));
      }
    }
  } catch (error) {
    console.error('polling error:', error.message);
    await new Promise((resolve) => setTimeout(resolve, 5000));
  }
}
