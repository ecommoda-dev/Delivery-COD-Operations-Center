// docs/cod-log-check.mjs — جدول سجل «تحصيل الأوردرات COD» (متصفح فعلي + Worker وهمي)
import http from 'node:http'; import fs from 'node:fs'; import path from 'node:path'; import { fileURLToPath } from 'node:url';
import { chromium } from 'playwright';
const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const MIME = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.css': 'text/css; charset=utf-8' };
const server = http.createServer((req, res) => {
  const f = path.join(ROOT, decodeURIComponent(req.url.split('?')[0]).replace(/^\/+/, ''));
  if (!f.startsWith(ROOT) || !fs.existsSync(f) || fs.statSync(f).isDirectory()) { res.writeHead(404); return res.end('nf'); }
  res.writeHead(200, { 'Content-Type': MIME[path.extname(f)] || 'application/octet-stream' }); res.end(fs.readFileSync(f));
});
await new Promise(r => server.listen(0, '127.0.0.1', r));
const BASE = `http://127.0.0.1:${server.address().port}`;
let pass = 0, fail = 0;
const is = (c, m, d = '') => { c ? pass++ : fail++; console.log(c ? '  ✅' : '  ❌', m, !c && d ? `\n       ${d}` : ''); };

const mk = (id, batch, ts, amt, name, courier) => ({ id, type: 'payment', timestamp: ts, employee: 'ahmed', order_name: name, order_id: String(id), value_after: String(amt), notes: '',
  extra: JSON.stringify({ batchId: batch, courier, employeeDisplayName: 'Ahmed', result: 'success', paymentMethods: { cash: String(amt) }, courierCollect: String(amt) }) });
const ROWS = [mk(1,'A','2026-11-02T08:00:00Z',100,'#1','Ali'), mk(2,'A','2026-11-02T08:00:01Z',200,'#2','Ali'),
              mk(3,'B','2026-11-02T09:00:00Z',50,'#3','Sami'), mk(4,'C','2026-11-02T10:00:00Z',900,'#4','Ali')];
const browser = await chromium.launch({ args: ['--no-sandbox'], ...(process.env.PW_CHROMIUM ? { executablePath: process.env.PW_CHROMIUM } : {}) });
const ctx = await browser.newContext({ viewport: { width: 1280, height: 800 } }); const page = await ctx.newPage(); const errs = [];
page.on('pageerror', e => errs.push(e.message));
await page.addInitScript(() => { sessionStorage.setItem('dco_session', JSON.stringify({ v: 1, username: 'A', displayName: 'A', loginAt: '2026-11-02T08:00:00Z' })); localStorage.setItem('delivery_cod_ops_worker_secret', 'S'); });
const calls = [];
await page.route('**/*.workers.dev/**', async route => {
  const req = route.request(); const u = new URL(req.url()); const a = u.searchParams.get('action') || '';
  calls.push({ a, q: Object.fromEntries(u.searchParams) });
  let out = { ok: true, success: true, version: '99.0.0', checks: [], employees: [], values: [], entries: [], total: 0 };
  if (a === 'get_logs') out.entries = ROWS;
  if (a === 'get_logs_count') out.total = 137;
  await route.fulfill({ status: 200, contentType: 'application/json', headers: { 'Access-Control-Allow-Origin': '*' }, body: JSON.stringify(out) });
});
await page.goto(`${BASE}/COD-Payment-Center.html`); await page.waitForSelector('#entryInput');
await page.click('#tabLog'); await page.waitForSelector('.log-otbl');
console.log('\n══ «النتائج» ══');
is(await page.textContent('#logSessCount') === '3', 'عدد الجلسات المعروضة = ٣ (٤ صفوف في ٣ جلسات)');
is(await page.textContent('#logFilteredCount') === '137', 'عدد العمليات المطابقة من get_logs_count = ١٣٧');
is((await page.textContent('.log-stat-chip.filtered')).includes('من'), 'الصيغة بتقول «من N عملية مطابقة»');
console.log('\n══ الترتيب ══');
is(await page.locator('#logSortNote:not([hidden])').count() === 0, 'مفيش تنبيه ترتيب قبل أي ضغطة');
await page.click('.sortable-th >> text=تحصيل');
is(await page.locator('#logSortNote:not([hidden])').count() === 1, 'بعد الترتيب بيظهر «على الصفحة الحالية بس»');
const first = await page.locator('.log-batch-row').first().innerText();
const last = await page.locator('.log-batch-row').last().innerText();
is(first.includes('Sami') && last.includes('900'), 'الترتيب التصاعدي على الجلسات: الأقل تحصيلاً (٥٠) أولاً والأعلى (٩٠٠) آخرًا', first.slice(0, 60) + ' || ' + last.slice(0, 60));
await page.click('.sortable-th >> text=تحصيل'); await page.click('.sortable-th >> text=تحصيل');
is(await page.locator('#logSortNote:not([hidden])').count() === 0, 'بعد الضغطة التالتة (بلا ترتيب) التنبيه بيختفي');
console.log('\n══ الجدول ══');
const st = await page.evaluate(() => { const b = document.getElementById('logBody'), th = document.querySelector('.log-otbl thead th'), td = document.querySelector('.log-otbl tbody td');
  const cs = getComputedStyle(b), t = getComputedStyle(th), d = getComputedStyle(td);
  return { ov: cs.overflowY, mh: parseFloat(cs.maxHeight), vh: innerHeight, pos: t.position, thF: t.fontSize, thW: t.fontWeight, tdF: d.fontSize, tdW: d.fontWeight, tt: t.textTransform }; });
is(st.ov === 'auto' && Math.abs(st.mh - st.vh * 0.68) < 2, 'سكرول داخلي max-height = ٦٨vh', JSON.stringify(st));
is(st.pos === 'sticky', 'العناوين sticky');
is(st.thF === '12px' && st.thW === '700' && st.tt === 'none', 'th = 12px / 700 وبلا uppercase', JSON.stringify(st));
is(st.tdF === '12.5px' && st.tdW === '600', 'td = 12.5px / 600', JSON.stringify(st));
console.log('\n══ مصدر الفلاتر ══');
const exp = calls.filter(c => c.a === 'get_logs' || c.a === 'get_logs_count');
is(exp.length >= 2, 'get_logs و get_logs_count اتنادوا');
is(errs.length === 0, 'صفر خطأ كونسول', errs.join(' | '));
await browser.close(); server.close();
console.log(`\n${fail ? '❌' : '✅'} النتيجة: ${pass} عدّى · ${fail} فشل`); process.exit(fail ? 1 : 0);
