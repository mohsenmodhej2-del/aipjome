// Asks for Melipayamak credentials, saves them to .dev.vars and sends one test SMS.
// Run: node scripts/setup-sms.mjs
import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import { createInterface } from 'node:readline';

const file = '.dev.vars';
let content = existsSync(file) ? readFileSync(file, 'utf8') : '';

const rl = createInterface({ input: process.stdin, output: process.stdout });
const lines = rl[Symbol.asyncIterator]();
async function ask(question) {
  process.stdout.write(`
${question}
> `);
  const next = await lines.next();
  if (next.done) process.exit(1);
  return next.value.trim();
}

function setVar(name, value) {
  const line = `${name}=${value}`;
  const pattern = new RegExp(`^${name}=.*$`, 'm');
  content = pattern.test(content) ? content.replace(pattern, line) : `${content.trimEnd()}\n${line}\n`;
}

console.log('\n========== Melipayamak setup ==========');
const username = await ask('[1/5] Melipayamak USERNAME (example: 09121234567), then Enter:');
const token = await ask('[2/5] Melipayamak PASSWORD or TOKEN, then Enter:');
const bodyId = await ask('[3/5] Pattern code (bodyId). If you do not have one, just press Enter:');
const from = bodyId ? '' : await ask('[4/5] Sender line number (example: 50004001512830), then Enter:');

if (!username || !token || (!bodyId && !from)) {
  console.log('\nSome answers were empty. Nothing saved.');
  process.exit(1);
}

setVar('MELIPAYAMAK_USERNAME', username);
setVar('MELIPAYAMAK_PASSWORD', token);
setVar('MELIPAYAMAK_BODY_ID', bodyId);
setVar('MELIPAYAMAK_FROM', from);
setVar('SMS_DEV_MODE', 'false');
writeFileSync(file, content);
console.log('\nSaved.');

const phone = await ask('[5/5] Your mobile number for a TEST SMS (or just Enter to skip):');
rl.close();
if (!phone) process.exit(0);

const code = String(Math.floor(100000 + Math.random() * 900000));
const method = bodyId ? 'BaseServiceNumber' : 'SendSMS';
const params = bodyId
  ? { username, password: token, to: phone, bodyId, text: code }
  : { username, password: token, to: phone, from, text: `کد آزمایشی همه‌چی: ${code}`, isFlash: 'false' };

try {
  const response = await fetch(`https://rest.payamak-panel.com/api/SendSMS/${method}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded; charset=UTF-8' },
    body: new URLSearchParams(params),
  });
  const text = await response.text();
  console.log(`\nHTTP ${response.status} | Melipayamak response: ${text}`);
  const ok = /"RetStatus"\s*:\s*1/.test(text) && (/"Value"\s*:\s*"(\d+)"/.exec(text)?.[1] ?? '').length >= 5;
  console.log(ok ? `\nOK - SMS sent with code ${code}` : '\nFAILED - SMS not sent');
} catch (error) {
  console.log('\nNetwork error:', error.message);
}
