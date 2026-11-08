// ══════════════════════════════════════════════════════════════
// docs/partial-log-check.mjs — فحص تاب «سجل العمليات» في Partial-Delivery.html (v1.80.0)
// 🔴 فلتر «النتيجة» (server-side: results=) + عمود «تفاصيل التحذير» (extra.warnings) + التصدير.
// متصفح فعلي + Worker وهمي (بيطبّق `results` زي buildLogFilterSQL) + ExcelJS وهمي بيسجّل الأعمدة والصفوف.
// التشغيل:  node docs/partial-log-check.mjs   (PW_CHROMIUM=… لو لزم · محتاج playwright)
// ══════════════════════════════════════════════════════════════
import { chromium } from 'playwright';
import http from 'node:http'; import fs from 'node:fs'; import path from 'node:path';
const ROOT = path.resolve(path.dirname(new URL(import.meta.url).pathname), '..');
const MIME = { '.html':'text/html; charset=utf-8', '.js':'text/javascript; charset=utf-8', '.css':'text/css; charset=utf-8', '.png':'image/png' };
const server = http.createServer((req,res)=>{ const f=path.join(ROOT,decodeURIComponent(req.url.split('?')[0]).replace(/^\/+/,'')); if(!f.startsWith(ROOT)||!fs.existsSync(f)||fs.statSync(f).isDirectory()){res.writeHead(404);res.end();return;} res.writeHead(200,{'Content-Type':MIME[path.extname(f)]||'application/octet-stream'}); fs.createReadStream(f).pipe(res); });
await new Promise(r=>server.listen(0,'127.0.0.1',r));
const BASE=`http://127.0.0.1:${server.address().port}`;
let pass=0, fail=0; const is=(c,m,d='')=>{ c?pass++:fail++; console.log(c?'  ✅':'  ❌',m,c?'':d); };
const browser = await chromium.launch({ args:['--no-sandbox'], ...(process.env.PW_CHROMIUM?{executablePath:process.env.PW_CHROMIUM}:{}) });

const W1 = 'الحذف تم، لكن إعادة فلفلمنت الباقي فشلت (timeout) — راجع الأوردر يدويًا وفلفل الباقي بنفسك';
const W2 = 'الحذف تم، لكن القطع ما اتسجّلتش في دفتر الرجوع للمخزن (no table) — بلّغ المخزن';
const mk = (i, type, result, extra = {}, extraRaw) => ({ timestamp: new Date(Date.UTC(2026, 10, 8, 10, i)).toISOString(), employee: 'Fady_Mostafa',
  type, order_name: '#' + (64000 + i), order_id: String(900 + i), notes: 'حذف SKU-' + i, extra: extraRaw !== undefined ? extraRaw : JSON.stringify({ result, ...extra }) });
const logs = [
  mk(1, 'remove_item', 'success'), mk(2, 'remove_item', 'success'),
  mk(3, 'remove_item', 'warning', { warnings: [W1] }),
  mk(4, 'remove_item', 'warning', { warnings: [W1, W2] }),
  mk(5, 'remove_failed', 'error', { warnings: [] }), mk(6, 'rejected', 'rejected'), mk(7, 'remove_item', 'already'),
  mk(8, 'remove_item', null, {}, null),                 // صف قديم: extra فاضي
];
const calls = [];
const resultOf = (e) => { try { return JSON.parse(e.extra).result; } catch { return undefined; } };
const ctx = await browser.newContext({ viewport: { width: 1500, height: 900 } }); const page = await ctx.newPage(); const errs = [];
page.on('pageerror', e => errs.push(e.message)); page.on('console', m => { if (m.type() === 'error' && !/ERR_TUNNEL|net::ERR|Failed to load resource/.test(m.text())) errs.push('c:' + m.text()); });
await page.addInitScript(() => {
  sessionStorage.setItem('dco_session', JSON.stringify({ v: 1, username: 'Ahmed_Ibraheem', displayName: 'Ahmed Ibraheem', loginAt: '2026-11-08T08:00:00.000Z' }));
  localStorage.setItem('delivery_cod_ops_worker_secret', 'test-secret');
  window.__xl = { cols: null, rows: [] };
  window.ExcelJS = { Workbook: function () { return { addWorksheet() { const ws = { set columns(c) { window.__xl.cols = c; }, addRow(r) { window.__xl.rows.push(r); } }; return ws; }, xlsx: { writeBuffer: async () => new ArrayBuffer(8) } }; } };
});
await page.route('**/*.workers.dev/**', async route => {
  const u = new URL(route.request().url()); const a = u.searchParams.get('action'); const q = Object.fromEntries(u.searchParams); calls.push({ a, q });
  let body = { ok: true, success: true, version: '99.0.0', checks: [], entries: [], employees: [], total: 0 };
  const filt = () => { let e = logs; const r = u.searchParams.get('results'); if (r) e = e.filter(x => r.split(',').includes(resultOf(x))); return e; };
  if (a === 'get_employees') body.employees = [{ username: 'Fady_Mostafa', display_name: 'Fady Mostafa' }, { username: 'Ahmed_Ibraheem', display_name: 'Ahmed Ibraheem' }];
  if (a === 'get_logs') body.entries = filt();
  if (a === 'get_logs_count') body.total = filt().length;
  if (a === 'get_logs_export') { const e = filt(); body = { ok: true, entries: e, cap: 2000, total: e.length, truncated: false }; }
  await route.fulfill({ status: 200, contentType: 'application/json', headers: { 'Access-Control-Allow-Origin': '*' }, body: JSON.stringify(body) });
});
await page.goto(BASE + '/Partial-Delivery.html');
await page.waitForSelector('#tabLog'); await page.click('#tabLog');
await page.waitForSelector('#logTableBody tr td.warn-cell', { timeout: 8000 }); await page.waitForTimeout(300);
const rowsN = () => page.$$eval('#logTableBody tr', t => t.length);
const count = () => page.$eval('#logResultsCount', e => e.textContent.trim());
const lastCall = (a) => [...calls].reverse().find(c => c.a === a);

console.log('\n── العمود الجديد ──');
const heads = await page.$$eval('#logHeadRow th .th-label', h => h.map(x => x.textContent.trim()));
is(JSON.stringify(heads) === JSON.stringify(['التاريخ','الوقت','الأوردر','النوع','النتيجة','تفاصيل التحذير','الموظف','ملاحظات']), 'ترتيب الأعمدة: النتيجة ثم تفاصيل التحذير', heads.join('|'));
const cells = await page.$$eval('#logTableBody tr', trs => trs.map(tr => [...tr.children].map(td => td.innerText.trim())));
const byOrder = Object.fromEntries(cells.map(c => [c[2], c]));
is(cells.every(c => c.length === 8), 'كل صف 8 خلايا == عدد الأعمدة');
is(byOrder['#64003'][5] === W1, 'صف «تم جزئيًا» بيعرض سبب فلفلمنت الباقي بالحرف', byOrder['#64003'][5]);
is(byOrder['#64004'][5].includes(W1) && byOrder['#64004'][5].includes(W2), 'تحذيرين = سطرين في نفس الخلية');
is(await page.$$eval('#logTableBody tr:nth-child(4) .warn-line', l => l.length) === 2, 'كل تحذير في سطر لوحده (.warn-line)');
is(byOrder['#64001'][5] === '—' && byOrder['#64005'][5] === '—' && byOrder['#64006'][5] === '—', 'نجاح · فشل بلا تحذيرات · مرفوض = «—»');
is(byOrder['#64008'][5] === '—' && byOrder['#64008'][4] === '—', 'صف قديم extra فاضي = «—» في النتيجة والتحذير ومفيش خطأ');
const overflow = await page.evaluate(() => { const w = document.querySelector('.tbl-scroll'); return [w.scrollWidth, w.clientWidth]; });
is(overflow[0] <= overflow[1] + 1, 'مفيش سكرول أفقي بعد إضافة العمود', overflow.join('/'));

console.log('\n── فلتر النتيجة ──');
is(await page.$('#logHeadRow th[data-fk="result"] .th-flt') !== null, 'قمع على رأس عمود «النتيجة»');
is(await page.$('#logHeadRow th:nth-child(6) .th-flt') === null, 'مفيش قمع على «تفاصيل التحذير»');
is(await rowsN() === 8 && await count() === '8', 'من غير فلتر: 8 صفوف والعدّاد 8');
is(!lastCall('get_logs').q.results, 'من غير اختيار: results مش مبعوتة');
await page.click('th[data-fk="result"] .th-flt');
const opts = await page.$$eval('.pop .ms-item span', s => s.map(x => x.textContent.trim()));
is(JSON.stringify(opts) === JSON.stringify(['تم','تم جزئيًا','فشل','مرفوض','خلاص متعمل']), 'قايمة القيم بالعربي من نفس RESULT_LABELS', opts.join('|'));
await page.click('.pop .ms-item:has-text("تم جزئيًا") input'); await page.waitForTimeout(350);
is(!!await page.$('.pop'), 'القايمة فضلت مفتوحة بعد الاختيار');
is(lastCall('get_logs').q.results === 'warning', 'get_logs اتبعت بـ results=warning', JSON.stringify(lastCall('get_logs').q));
is(lastCall('get_logs_count').q.results === 'warning', 'get_logs_count بنفس الفلتر');
is(await rowsN() === 2 && await count() === '2', 'الجدول 2 صف والعدّاد 2 (الصفحة والعدّاد من نفس الفلتر)');
await page.click('.pop .ms-item:has-text("فشل") input'); await page.waitForTimeout(350);
is(lastCall('get_logs').q.results === 'warning,error', 'اختيارين ورا بعض = results=warning,error', lastCall('get_logs').q.results);
is(await rowsN() === 3, '3 صفوف (تحذيرين + فشل)');
const chipRow = await page.$$eval('#logChips .ms-chips-row', r => r.map(x => x.innerText.replace(/\s+/g, ' ').trim()));
is(chipRow.length === 1 && chipRow[0].includes('النتيجة') && chipRow[0].includes('تم جزئيًا') && chipRow[0].includes('فشل'), 'chips: سطر «النتيجة» فيه الاتنين', chipRow.join(' || '));
is(await page.$eval('th[data-fk="result"]', e => e.classList.contains('flt-on')), 'القمع مفعّل (flt-on)');
await page.keyboard.press('Escape');
await page.hover('th[data-fk="result"] .th-flt'); await page.waitForTimeout(150);
is((await page.$eval('.tip', e => e.textContent).catch(() => '')).includes('تم جزئيًا'), 'tooltip بقيم الفلتر المفعّل');
await page.mouse.move(5, 5);
// تصدير بنفس الفلتر
await page.click('button:has-text("تصدير XLSX")'); await page.waitForTimeout(500);
is(lastCall('get_logs_export').q.results === 'warning,error', 'التصدير بيبعت نفس الفلتر', JSON.stringify(lastCall('get_logs_export').q));
const xl = await page.evaluate(() => window.__xl);
is(xl.cols.map(c => c.header).join('|') === 'التاريخ|الوقت|الأوردر|النوع|النتيجة|تفاصيل التحذير|الموظف|ملاحظات', 'أعمدة الإكسيل فيها «تفاصيل التحذير» بعد النتيجة', xl.cols.map(c => c.header).join('|'));
const x4 = xl.rows.find(r => r.order_name === '#64004');
is(x4 && x4.warnings === W1 + ' | ' + W2 && x4.result === 'تم جزئيًا', 'صف الإكسيل: التحذيرين مفصولين بـ « | »', x4 && x4.warnings);
is(xl.rows.find(r => r.order_name === '#64005').warnings === '', 'بلا تحذيرات = خلية فاضية في الإكسيل');
// مسح كل الفلاتر
await page.click('#logClearAll'); await page.waitForTimeout(350);
is(!lastCall('get_logs').q.results && await rowsN() === 8, '«مسح كل الفلاتر» بيشيل فلتر النتيجة (results مش مبعوتة · 8 صفوف)');
is(await page.$eval('#logChips', e => e.children.length) === 0, 'الـ chips اتمسحت');
// chip ✕
await page.click('th[data-fk="result"] .th-flt'); await page.click('.pop .ms-item:has-text("خلاص متعمل") input'); await page.waitForTimeout(350); await page.keyboard.press('Escape');
await page.click('#logChips [data-rm="result::already"]'); await page.waitForTimeout(350);
is(!lastCall('get_logs').q.results, '✕ على الـ chip بيشيل الفلتر');
// صفر نتائج
await page.click('th[data-fk="result"] .th-flt'); await page.click('.pop .ms-item:has-text("تم") input >> nth=0'); 
await page.waitForTimeout(300);
is(lastCall('get_logs').q.results === 'success', 'اختيار «تم» لوحده = results=success');
await page.keyboard.press('Escape');
const emptySpan = await page.$eval('#logTableBody td.q-empty', e => e.colSpan).catch(() => null);
is(emptySpan === null || emptySpan === 8, 'صف «مفيش نتايج» (لو ظهر) colspan = 8', String(emptySpan));
is(errs.length === 0, 'صفر أخطاء JS', errs.join(' | '));
await browser.close(); server.close();
console.log(`\n${fail ? '❌' : '✅'} النتيجة: ${pass} عدّى · ${fail} فشل`); process.exit(fail ? 1 : 0);
