import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';

const root = process.cwd();
const baseUrl = process.env.AUDIT_BASE_URL ?? 'http://localhost:3000';
const reportPath = resolve(root, process.env.AUDIT_REPORT_PATH ?? 'quality/delivery-audit-report.json');
const spec = JSON.parse(await readFile(resolve(root, 'quality/delivery-spec.json'), 'utf8'));

function readCookies(response) {
  const raw = response.headers.getSetCookie?.() ?? [];
  return raw.map((value) => value.split(';')[0]).join('; ');
}

async function probe(requirement, cookie = '') {
  if (requirement.kind === 'manual' || requirement.kind === 'decision') return { status: 'MANUAL', evidence: requirement.evidence };
  const headers = { ...(requirement.body ? { 'content-type': 'application/json', origin: baseUrl } : {}), ...(cookie ? { cookie } : {}) };
  try {
    const response = await fetch(`${baseUrl}${requirement.path}`, { method: requirement.method, headers, body: requirement.body ? JSON.stringify(requirement.body) : undefined });
    const text = await response.text();
    let payload = null;
    try { payload = JSON.parse(text); } catch { /* non-JSON response */ }
    const statusMatches = response.status === requirement.expect;
    const catalogMatches = requirement.assert !== 'catalog' || (Array.isArray(payload?.products) && payload.products.length > 0 && Array.isArray(payload?.categories) && payload.categories.length > 0);
    return { status: statusMatches && catalogMatches ? 'PASS' : 'FAIL', evidence: `HTTP ${response.status} ${requirement.path}`, received: response.status };
  } catch (error) { return { status: 'FAIL', evidence: error instanceof Error ? error.message : 'network error' }; }
}

let adminCookie = '';
if (process.env.AUDIT_ADMIN_EMAIL && process.env.AUDIT_ADMIN_PASSWORD) {
  const response = await fetch(`${baseUrl}/api/auth/login`, { method: 'POST', headers: { 'content-type': 'application/json', origin: baseUrl }, body: JSON.stringify({ email: process.env.AUDIT_ADMIN_EMAIL, password: process.env.AUDIT_ADMIN_PASSWORD }) });
  adminCookie = readCookies(response);
}

const results = [];
for (const requirement of spec.requirements) {
  if (requirement.kind === 'auth-http' && !adminCookie) results.push({ ...requirement, status: 'MANUAL', evidence: 'متغیرهای ورود ادمین برای آزمون خودکار تنظیم نشده‌اند.' });
  else results.push({ ...requirement, ...(await probe(requirement, requirement.kind === 'auth-http' ? adminCookie : '')) });
}
const failedCritical = results.filter((result) => result.severity === 'critical' && result.status === 'FAIL').length;
const unresolvedRequired = results.filter((result) => result.severity === 'required' && result.status !== 'PASS').length;
const unresolvedCritical = results.filter((result) => result.severity === 'critical' && result.status !== 'PASS').length;
const report = { generatedAt: new Date().toISOString(), baseUrl, rule: spec.releaseRule, verdict: failedCritical ? 'REJECTED' : unresolvedRequired || unresolvedCritical ? 'INCOMPLETE' : 'READY_FOR_HUMAN_SIGNOFF', summary: { pass: results.filter((result) => result.status === 'PASS').length, fail: results.filter((result) => result.status === 'FAIL').length, manual: results.filter((result) => result.status === 'MANUAL').length, failedCritical, unresolvedRequired, unresolvedCritical }, results };
await mkdir(dirname(reportPath), { recursive: true });
await writeFile(reportPath, `${JSON.stringify(report, null, 2)}\n`);
console.log(JSON.stringify(report, null, 2));
process.exitCode = report.verdict === 'READY_FOR_HUMAN_SIGNOFF' ? 0 : 1;
