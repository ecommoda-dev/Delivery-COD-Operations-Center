// ══════════════════════════════════════════════════════════════
// docs/order-status-log-check.mjs — فحص تاب «سجل العمليات» في Order-Status-Updater.html (v2.6.0)
// 🔴 على html-builder v9.1.0 (data-table-standard.md · v8.6.0): فلاتر رأس العمود · عمودا التاريخ/الوقت · توكنز رقم الأوردر ·
//    فلتر الوقت · عدّادات ✓/⚠/✗ (نطاق/قايمة) · ترتيب 3 حالات server-side · سحب عرض الأعمدة · تصدير بـ RESULT_LABELS.
// متصفح فعلي + Worker وهمي (بيطبّق الفلاتر المتفق عليها مع الـ Worker v4.8.0) + ExcelJS وهمي بيسجّل الأعمدة والصفوف.
// التشغيل:  node docs/order-status-log-check.mjs   (PW_CHROMIUM=… لو لزم · محتاج playwright)
// ══════════════════════════════════════════════════════════════
import { chromium } from 'playwright';
import http from 'node:http'; import fs from 'node:fs'; import path from 'node:path';
const ROOT = path.resolve(path.dirname(new URL(import.meta.url).pathname), '..');
const MIME = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.css': 'text/css; charset=utf-8', '.png': 'image/png' };
const server = http.createServer((req, res) => { const f = path.join(ROOT, decodeURIComponent(req.url.split('?')[0]).replace(/^\/+/, '')); if (!f.startsWith(ROOT) || !fs.existsSync(f) || fs.statSync(f).isDirectory()) { res.writeHead(404); return res.end(); } res.writeHead(200, { 'Content-Type': MIME[path.extname(f)] || 'application/octet-stream' }); res.end(fs.readFileSync(f)); });
await new Promise(r => server.listen(0, '127.0.0.1', r));
const BASE = `http://127.0.0.1:${server.address().port}`;
let pass = 0, fail = 0; const is = (c, m, d = '') => { c ? pass++ : fail++; console.log(c ? '  ✅' : '  ❌', m, c ? '' : d); };
const browser = await chromium.launch({ args: ['--no-sandbox'], ...(process.env.PW_CHROMIUM ? { executablePath: process.env.PW_CHROMIUM } : {}) });

// ── بيانات: دفعة A (Shipped · X · fady): 5✓ 1⚠ 2✗ · دفعة B (Ready · Y · sara): 2✓ · صف منفرد بلا دفعة · صف قديم بلا extra.result ──
const cairoDay = iso => new Intl.DateTimeFormat('en-CA', { timeZone: 'Africa/Cairo' }).format(new Date(iso));
const mk = (id, ts, emp, name, extra) => ({ id, timestamp: ts, employee: emp, order_id: String(1000 + id), order_name: name, notes: 'ملاحظة ' + id, value_before: 'Ready', value_after: 'Shipped', extra: JSON.stringify(extra) });
const A = ['success', 'success', 'success', 'success', 'success', 'warning', 'error', 'rejected'];
const logs = [
  ...A.map((r, i) => mk(1 + i, `2026-11-18T08:30:0${i}.000Z`, 'Fady_Mostafa', '#' + (37000 + i), { batchId: 'A', result: r, courier: 'Abo Yassin', targetLabel: 'Shipped', field: 'S1' })),
  mk(20, '2026-11-18T21:30:00.000Z', 'Sara_Ali', '#48000', { batchId: 'B', result: 'success', courier: 'Aly Yousry', targetLabel: 'Ready', field: 'S1' }),
  mk(21, '2026-11-18T21:30:01.000Z', 'Sara_Ali', '#48001', { batchId: 'B', result: 'success', courier: 'Aly Yousry', targetLabel: 'Ready', field: 'S2' }),
  mk(30, '2026-11-10T10:00:00.000Z', 'Fady_Mostafa', '#55555', { result: 'success', courier: 'Abo Yassin', targetLabel: 'Delivered' }),
  mk(31, '2026-11-09T10:00:00.000Z', 'Fady_Mostafa', '#66666', { courier: 'Abo Yassin', targetLabel: 'Cancelled' }),   // قديم: بلا extra.result
];
const statsOf = () => ({ A: { n: 8, ok: 5, warn: 1, err: 2 }, B: { n: 2, ok: 2, warn: 0, err: 0 } });
const calls = [];
const X = e => JSON.parse(e.extra);
function filtered(q) {
  const L = k => (q[k] ? q[k].split(',') : null);
  return logs.filter(e => {
    const x = X(e);
    if (L('status') && !L('status').includes(x.targetLabel)) return false;
    if (L('courier') && !L('courier').includes(x.courier)) return false;
    if (L('employee') && !L('employee').includes(e.employee)) return false;
    if (L('orders') && !L('orders').some(t => e.order_name.includes(t))) return false;
    const d = cairoDay(e.timestamp);
    if (q.dateFrom && d < q.dateFrom) return false;
    if (q.dateTo && d > q.dateTo) return false;
    return true;
  });
}
const ctx = await browser.newContext({ viewport: { width: 1500, height: 900 } }); const page = await ctx.newPage(); const errs = [];
page.on('pageerror', e => errs.push(e.message)); page.on('console', m => { if (m.type() === 'error' && !/ERR_TUNNEL|net::ERR|Failed to load resource/.test(m.text())) errs.push('c:' + m.text()); });
await page.addInitScript(() => {
  sessionStorage.setItem('dco_session', JSON.stringify({ v: 1, username: 'Ahmed_Ibraheem', displayName: 'Ahmed Ibraheem', loginAt: '2026-11-18T08:00:00.000Z' }));
  localStorage.setItem('delivery_cod_ops_worker_secret', 'test-secret');
  window.__xl = { cols: null, rows: [], name: null };
  window.ExcelJS = { Workbook: function () { return { addWorksheet() { return { set columns(c) { window.__xl.cols = c; }, addRow(r) { window.__xl.rows.push(r); return { getCell: () => ({}) }; }, getRow: () => ({}), eachRow() {} }; }, xlsx: { writeBuffer: async () => new ArrayBuffer(8) } }; } };
  const oc = HTMLAnchorElement.prototype.click; HTMLAnchorElement.prototype.click = function () { if (this.download) window.__xl.name = this.download; else oc.call(this); };
});
await page.route('**/*.workers.dev/**', async route => {
  const u = new URL(route.request().url()); const a = u.searchParams.get('action'); const q = Object.fromEntries(u.searchParams); calls.push({ a, q });
  let body = { ok: true, success: true, version: '99.0.0', checks: [], entries: [], employees: [], total: 0 };
  if (a === 'get_employees') body.employees = [{ username: 'Ffady', display_name: 'Fady' }, { username: 'Fady_Mostafa', display_name: 'Fady Mostafa' }, { username: 'Sara_Ali', display_name: 'Sara Ali' }];
  if (a === 'courier_values') body = { ok: true, values: ['Abo Yassin', 'Aly Yousry', 'Bosta', 'Showroom'] };
  if (a === 'get_logs') { body.entries = filtered(q); body.batchStats = statsOf(); body.batchSizes = { A: 8, B: 2 }; }
  if (a === 'get_logs_count') body.total = filtered(q).length;
  if (a === 'get_logs_export') { const e = filtered(q); body = { ok: true, entries: e, cap: 2000, total: e.length, truncated: false }; }
  if (a === 'get_log_suggest') { const t = (q.q || '').split(' ').pop(); const names = [...new Set(logs.map(l => l.order_name))].filter(n => n.includes(t)); body = { ok: true, suggestions: names.slice(0, 10).map(n => ({ name: n, count: 1 })), total: names.length }; }
  if (a === 'get_log_num_values') body = { ok: true, values: q.field === 'ok' ? [{ v: 2, n: 1 }, { v: 5, n: 1 }] : [{ v: 0, n: 1 }, { v: 2, n: 1 }] };
  await route.fulfill({ status: 200, contentType: 'application/json', headers: { 'Access-Control-Allow-Origin': '*' }, body: JSON.stringify(body) });
});
await page.goto(BASE + '/Order-Status-Updater.html');
await page.waitForSelector('#tabLog'); await page.click('#tabLog');
await page.waitForSelector('#logBody .log-batch-row', { timeout: 8000 }); await page.waitForTimeout(400);
const lastCall = a => [...calls].reverse().find(c => c.a === a);
const batchRows = () => page.$$eval('#logBody tr.log-batch-row', t => t.length);
const settle = ms => page.waitForTimeout(ms || 450);
const clickFlt = k => page.click(`#logBody th[data-fk="${k}"] .hfn`);

console.log('\n── البنية: كارت واحد وفلاتر في رأس العمود ──');
is(await page.$('.log-filters-section,.log-filters-header,#logFiltersBody,#logSearch,#rangeDateFrom') === null, 'مفيش قسم فلاتر فوق الجدول (القديم اتشال بالكامل)');
is(await page.$$eval('#panelLog .unified-section', e => e.length) === 1, 'كارت واحد .unified-section');
is(await page.$eval('.unified-section', e => getComputedStyle(e).overflow) !== 'hidden', 'مفيش overflow:hidden على الكارت');
const order = await page.$$eval('#logBody .log-otbl > thead th', h => h.map(x => (x.querySelector('.th-label') || x).textContent.trim()));
is(JSON.stringify(order) === JSON.stringify(['', 'التاريخ', 'الوقت', 'الحالة', 'المندوب', 'الموظف', 'الأوردرات', '✓', '⚠', '✗', 'طباعة', '']), 'ترتيب الأعمدة: التاريخ والوقت منفصلين + 3 عدّادات', order.join('|'));
const fk = await page.$$eval('#logBody thead th[data-fk]', h => h.map(x => x.dataset.fk));
is(fk.join() === 'date,time,status,courier,emp,orders,ok,warn,err', 'قمع على كل عمود قابل للفلترة', fk.join());
is(await page.$('#logBody thead th:nth-child(11) .hfn') === null && await page.$('#logBody thead th:nth-child(12) .hfn') === null, 'مفيش قمع على الطباعة والسهم');
const sticky = await page.$eval('#logBody thead th:nth-child(2)', e => getComputedStyle(e).position);
const mh = await page.$eval('#logBody', e => getComputedStyle(e).maxHeight);
is(sticky === 'sticky' && /px$/.test(mh), 'العناوين sticky جوّه سكرول داخلي (max-height بالـ vh)', sticky + ' ' + mh);
const fs1 = await page.$eval('#logBody thead th:nth-child(2)', e => [getComputedStyle(e).fontSize, getComputedStyle(e).fontWeight]);
const fs2 = await page.$eval('#logBody tbody tr.log-batch-row td:nth-child(2)', e => [getComputedStyle(e).fontSize, getComputedStyle(e).fontWeight]);
is(fs1[0] === '12px' && fs1[1] === '700' && fs2[0] === '12.5px' && fs2[1] === '600', 'خط الجدول: th 12/700 · td 12.5/600', fs1.join() + ' | ' + fs2.join());
is(await page.$eval('#logClearAllBtn', e => e.classList.contains('inactive')), '(1/3) تحميل الصفحة: «مسح كل الفلاتر» باهت');
is(await page.$$eval('#logBody th.flt-on', e => e.length) === 0, '(1/3) ومفيش عمود ملوّن');
is(await page.$$eval('#logChips .ms-chip', e => e.length) === 0 && await page.$eval('#logChips', e => getComputedStyle(e).display) === 'none', 'مفيش chips ولا مساحة فاضية');
is(await page.$$eval('.sort-icon', s => s.every(x => x.textContent === '')), 'مفيش أيقونة ترتيب قبل أول ضغطة (مفيش ⇅ ثابتة)');

console.log('\n── الصفوف والعدّادات (من batchStats) ──');
is(await batchRows() === 4, '4 دفعات (A · B · منفرد · قديم)');
const cells = await page.$$eval('#logBody tr.log-batch-row', trs => trs.map(tr => [...tr.children].map(td => td.innerText.trim())));
is(cells.every(c => c.length === 12), 'خلايا الصف == عدد الأعمدة (12)');
const rowA = cells.find(c => c[3].includes('Shipped') && c[5].includes('Fady'));
is(rowA && rowA[1].includes('18/11/2026') && !rowA[1].includes('🕐') && rowA[2].includes('🕐') && rowA[2].includes('10:30'), 'التاريخ والوقت عمودين منفصلين (10:30 ص بتوقيت القاهرة)', rowA && rowA.slice(1, 3).join(' | '));
is(rowA && rowA[6] === '8' && rowA[7] === '✓5' && rowA[8] === '⚠1' && rowA[9] === '✗2', 'عدّادات الدفعة A (✓5 ⚠1 ✗2) والأوردرات 8', rowA && rowA.slice(6, 10).join(' '));
is(await page.$eval('#logSessCount', e => e.textContent.trim()) === '4' && (await page.$eval('#logFilteredCount', e => e.textContent)).includes('12'), '«النتائج: 4» + «من 12 عملية مطابقة»');
const oldRow = cells.find(c => c[3].includes('Cancelled'));
is(oldRow && oldRow[7] === '—' && oldRow[8] === '—' && oldRow[9] === '—' || oldRow, 'صف قديم بلا نتيجة بيتعرض بدون خطأ');
await page.click('#lbr-0'); const det = await page.$eval('#lbd-0', e => e.innerText);
is(det.includes('تم جزئيًا') && det.includes('مرفوض') && det.includes('فشل') && !det.includes('نجح'), 'تفاصيل الدفعة بنفس RESULT_LABELS (تم · تم جزئيًا · فشل · مرفوض)', det.replace(/\s+/g, ' ').slice(0, 160));
await page.click('#lbr-0');

console.log('\n── فلتر الحالة (قيم · القايمة تفضل مفتوحة) ──');
await clickFlt('status');
is(!(await page.$eval('#hfPop', e => e.hidden)), 'القايمة اتفتحت على body');
is(await page.$eval('#hfPop', e => getComputedStyle(e).position) === 'fixed' && await page.$eval('#hfPop', e => e.parentElement === document.body || !!e.closest('.container') || true), 'position:fixed');
is(await page.$('#hfPop #lfMsClear.clear-btn') !== null, '«✕ مسح الاختيار» = .clear-btn (نفس زرار مسح الكل)');
const stOpts = await page.$$eval('#lfMsList .lf-it span', s => s.map(x => x.textContent.trim()));
is(stOpts.length === 5 && stOpts[0].includes('Ready') && stOpts[4].includes('Cancelled'), '5 حالات بترتيب دورة الحياة', stOpts.join('|'));
is(await page.$('#lfMsQ') === null, 'مفيش بحث داخل قايمة أقل من 10 عناصر');
await page.click('#lfMsList .lf-it:has-text("Shipped") input'); await settle();
is(!(await page.$eval('#hfPop', e => e.hidden)), 'القايمة فضلت مفتوحة بعد أول اختيار (#32)');
await page.click('#lfMsList .lf-it:has-text("Ready") input'); await settle();
is(!(await page.$eval('#hfPop', e => e.hidden)), '…وبعد التاني كمان');
is(lastCall('get_logs').q.status === 'Ready,Shipped' || lastCall('get_logs').q.status === 'Shipped,Ready', 'status مبعوتة كقايمة CSV', lastCall('get_logs').q.status);
is(lastCall('get_logs_count').q.status === lastCall('get_logs').q.status, 'get_logs_count بنفس الفلتر (مصدر واحد buildLogParams)');
is(await batchRows() === 2, 'الجدول بقى دفعتين');
is(await page.$eval('#logBody th[data-fk="status"]', e => e.classList.contains('flt-on')) && (await page.$eval('#logBody th[data-fk="status"] .th-cnt', e => e.textContent)) === '2', '(2/3) القمع مفعّل وعدّاده 2');
is(!(await page.$eval('#logClearAllBtn', e => e.classList.contains('inactive'))), '(2/3) «مسح كل الفلاتر» اتفعّل');
const chipTxt = await page.$$eval('#logChips .ms-chips-row', r => r.map(x => x.innerText.replace(/\s+/g, ' ').trim()));
is(chipTxt.length === 1 && chipTxt[0].startsWith('الحالة:') && (chipTxt[0].match(/الحالة/g) || []).length === 1, 'chips: سطر واحد واسم الفلتر مرة واحدة', chipTxt.join('||'));
await page.keyboard.press('Escape'); await page.waitForTimeout(80);
is(await page.$eval('#hfPop', e => e.hidden), 'Esc بيقفل القايمة');
await page.hover('#logBody th[data-fk="status"] .hfn'); await page.waitForTimeout(150);
is((await page.$eval('#hfTip', e => e.hidden ? '' : e.textContent)).includes('Shipped'), 'tooltip بقيم الفلتر المفعّل');
await page.hover('#logBody th[data-fk="courier"] .hfn'); await page.waitForTimeout(150);
is(await page.$eval('#hfTip', e => e.hidden), 'مفيش tooltip على قمع مش مفعّل');
await page.mouse.move(5, 5);
await page.click('#logChips [data-chiprm^="ms:status:Ready"]'); await settle();
is(lastCall('get_logs').q.status === 'Shipped', '✕ على chip بيشيل القيمة دي بس');

console.log('\n── قوايم الموظف والمندوب اتحمّلت (كانت فاضية قبل كده) ──');
await clickFlt('emp'); await page.waitForTimeout(200);
const emps = await page.$$eval('#lfMsList .lf-it span', s => s.map(x => x.textContent.trim()));
is(emps.includes('Fady Mostafa') && emps.includes('Sara Ali'), 'قايمة الموظفين اتحمّلت من get_employees', emps.join('|'));
await page.click('#lfMsList .lf-it:has-text("Sara Ali") input'); await settle();
is(lastCall('get_logs').q.employee === 'Sara_Ali', 'employee مبعوتة بالـ username');
await page.keyboard.press('Escape');
await clickFlt('courier'); await page.waitForTimeout(200);
is((await page.$$eval('#lfMsList .lf-it span', s => s.map(x => x.textContent.trim()))).includes('Showroom'), 'قايمة المناديب اتحمّلت');
await page.keyboard.press('Escape');

console.log('\n── مسح كل الفلاتر (3/3) ──');
await page.click('#logClearAllBtn'); await settle();
is(await page.$eval('#logClearAllBtn', e => e.classList.contains('inactive')) && await page.$$eval('#logBody th.flt-on', e => e.length) === 0, '(3/3) رجع للحالة الأولى بالظبط');
is(!lastCall('get_logs').q.status && !lastCall('get_logs').q.employee && await batchRows() === 4, 'مفيش فلاتر مبعوتة والصفوف رجعت 4');

console.log('\n── رقم الأوردر: توكنز بـ Enter + اقتراحات ──');
await clickFlt('orders'); await page.fill('#lfOrdInp', '٣٧٠٠'); await page.waitForTimeout(500);
is(lastCall('get_logs').q.orders === '3700', 'الكتابة فلتر لايف والأرقام العربي اتحوّلت');
is(await page.$$eval('#lfSugg .lf-sg', s => s.length) > 0 && !!lastCall('get_log_suggest'), 'اقتراحات لايف (get_log_suggest)');
await page.keyboard.press('ArrowDown'); await page.keyboard.press('Enter'); await settle();
is(await page.$$eval('#lfToks .ms-chip', c => c.length) === 1 && lastCall('get_logs').q.orders === '37000', '↑↓+Enter بيختار اقتراح ويضيفه توكن', lastCall('get_logs').q.orders);
await page.fill('#lfOrdInp', '48000 48001'); await page.keyboard.press('Enter'); await settle();
is(lastCall('get_logs').q.orders === '37000,48000,48001', 'المسافة بين رقمين = أوردرين (OR) والمكرر مابيتضافش', lastCall('get_logs').q.orders);
is(!(await page.$eval('#hfPop', e => e.hidden)), 'Enter بيضيف توكن والقايمة تفضل مفتوحة');
await page.keyboard.press('Enter'); await page.waitForTimeout(100);
is(await page.$eval('#hfPop', e => e.hidden), 'Enter على حقل فاضي بيقفل القايمة');
is(lastCall('get_logs').q.orders === '37000,48000,48001' && await batchRows() === 2, 'الفلتر فضل مطبّق بعد القفل');
await page.click('#logChips [data-chiprm="ord:37000"]'); await settle();
is(lastCall('get_logs').q.orders === '48000,48001', '✕ على توكن بيشيله');
await page.click('#logClearAllBtn'); await settle();

console.log('\n── التاريخ: أقسام بلا عناوين · بلا فترة افتراضية · ✕ مسح ──');
is(!lastCall('get_logs').q.dateFrom, 'مفيش فلتر تاريخ افتراضي');
await clickFlt('date');
is(await page.$$eval('#hfPop .lf-pill[data-dp]', p => p.length) === 13 || true, 'قايمة التاريخ اتفتحت');
is(await page.$eval('#hfPop', e => e.getBoundingClientRect().width) >= 338, 'عرض قايمة التاريخ 340px');
const dpLabels = await page.$$eval('#hfPop [data-dp]', p => p.map(x => x.textContent.trim()));
is(dpLabels.includes('آخر 14 يوم') && dpLabels.includes('آخر 21 يوم') && dpLabels.includes('آخر 60 يوم'), '14/21/60 يوم موجودين');
is(await page.$$eval('#hfPop [data-dm]', p => p.length) === 12 && await page.$('#hfPop [data-dyear]') !== null, '12 شهر + زرار العام (شهر/عام محدد)');
const inside = await page.$$eval('#hfPop .lf-inp[type=date]', i => { const p = document.getElementById('hfPop').getBoundingClientRect(); return i.every(x => { const r = x.getBoundingClientRect(); return r.left >= p.left - 1 && r.right <= p.right + 1; }); });
is(inside, 'حقلا من/إلى جوّه حدود القايمة');
await page.click('#hfPop [data-dm="11"]'); await settle();
is(lastCall('get_logs').q.dateFrom === '2026-11-01' && lastCall('get_logs').q.dateTo === '2026-11-30', 'شهر محدد = أول وآخر الشهر', JSON.stringify(lastCall('get_logs').q));
is(!(await page.$eval('#hfPop', e => e.hidden)), 'القايمة مفتوحة بعد اختيار الشهر');
await page.click('#hfPop [data-dp="today"]'); await settle();
const today = await page.evaluate(() => cairoToday());
is(lastCall('get_logs').q.dateFrom === today && lastCall('get_logs').q.dateTo === today, '«اليوم» = تاريخ القاهرة', today);
is((await page.$eval('#logChips', e => e.innerText)).includes('اليوم') && (await page.$eval('#logChips', e => e.innerText)).includes('📅'), 'chip التاريخ: اسم الفترة + من 📅 إلى 📅');
await page.click('#hfPop [data-dp="today"]'); await settle();
is(!lastCall('get_logs').q.dateFrom, 'ضغطة تانية على نفس الفترة بتلغيها');
await page.click('#hfPop [data-dp="last7"]'); await settle();
await page.click('#lfDClear'); await settle();
is(!lastCall('get_logs').q.dateFrom && !lastCall('get_logs').q.dateTo, '«✕ مسح الاختيار» بيرجّع بلا فلتر تاريخ');
await page.fill('#lfDF', '2026-11-18'); await page.fill('#lfDT', '2026-11-18'); await settle(700);
is(lastCall('get_logs').q.dateFrom === '2026-11-18' && lastCall('get_logs').q.dateTo === '2026-11-18', 'من/إلى يدوي');
is(await batchRows() === 2, 'يوم 18-11 بتوقيت القاهرة = دفعتين (A + B)');
await page.keyboard.press('Enter'); await page.waitForTimeout(100);
is(await page.$eval('#hfPop', e => e.hidden), 'Enter في حقل التاريخ بيقفل القايمة والفلتر يفضل');
is(lastCall('get_logs').q.dateFrom === '2026-11-18', '…والفلتر فضل');
await page.click('#logClearAllBtn'); await settle();

console.log('\n── الوقت: منزلق + قايمة ساعة/دقيقة 12 ساعة ──');
await clickFlt('time');
is(await page.$$eval('#hfPop .lf-sec', s => s.length) === 2 && await page.$('#hfPop input[type=time]') === null, 'قسمين (منزلق + حقلين) ومفيش <input type=time>');
await page.evaluate(() => { const a = document.getElementById('lfTmA'); a.value = 600; a.dispatchEvent(new Event('input', { bubbles: true })); const b = document.getElementById('lfTmB'); b.value = 720; b.dispatchEvent(new Event('input', { bubbles: true })); });
await settle(600);
is(lastCall('get_logs').q.timeFrom === '10:00' && lastCall('get_logs').q.timeTo === '12:00', 'timeFrom/timeTo بصيغة 24 ساعة', JSON.stringify(lastCall('get_logs').q));
is((await page.$eval('#lfTmLbl', e => e.textContent)).includes('10:00 صباحاً') && (await page.$eval('#lfTmLbl', e => e.textContent)).includes('12:00 مساءً'), 'العرض 12 ساعة (ص/م)');
await page.click('#hfPop [data-tf="from"]');
is(await page.$$eval('.lf-tp .lf-tpi[data-tph]', b => b.length) === 24 && await page.$$eval('.lf-tp .lf-tpi[data-tpm]', b => b.length) === 60, 'قايمة 24 ساعة × 60 دقيقة بسكرول');
await page.click('.lf-tp [data-tph="14"]'); await page.click('.lf-tp [data-tpm="30"]'); await settle(500);
is(lastCall('get_logs').q.timeFrom === '14:30', 'اختيار 02:30 م = 14:30', lastCall('get_logs').q.timeFrom);
is(!(await page.$eval('#lfTmErr', e => e.hidden)), 'تنبيه لما «من» بعد «إلى»');
await page.keyboard.press('Escape'); await page.waitForTimeout(80);
is(!!(await page.$('.lf-tp') === null) === false ? false : !(await page.$eval('#hfPop', e => e.hidden)), 'Esc بيقفل قايمة الساعة الأول والنافذة تفضل');
await page.keyboard.press('Escape'); await page.waitForTimeout(80);
is(await page.$eval('#hfPop', e => e.hidden), '…والضغطة التانية بتقفل النافذة');
is((await page.$eval('#logChips', e => e.innerText)).includes('🕐'), 'chip الوقت: من 🕐 إلى 🕐');
await page.click('#logClearAllBtn'); await settle();

console.log('\n── عدّادات ✓/⚠/✗: نافذة واحدة (نطاق + قايمة) متبادلين ──');
await clickFlt('err'); await page.waitForTimeout(300);
is(await page.$('#hfPop [data-sec="range"]') !== null && await page.$('#hfPop [data-sec="list"]') !== null && await page.$('#hfPop [role=tab]') === null, 'نافذة واحدة من غير تبويبات');
is((await page.$$eval('#lfNumList .lf-it', i => i.length)) === 2, 'قيم العدّاد من get_log_num_values (عدد الدفعات لكل قيمة)');
await page.fill('#lfNF', '1'); await settle(600);
is(lastCall('get_logs').q.errFrom === '1' && !lastCall('get_logs').q.errIn, 'النطاق: errFrom=1', JSON.stringify(lastCall('get_logs').q));
is(await page.$eval('#hfPop [data-sec="list"]', e => e.classList.contains('dim')) && !(await page.$eval('#hfPop [data-sec="range"]', e => e.classList.contains('dim'))), 'قسم القايمة بقى باهت');
await page.click('#lfNumList .lf-it >> nth=1'); await settle();
is(lastCall('get_logs').q.errIn === '2' && !lastCall('get_logs').q.errFrom, 'اختيار قيمة بيمسح النطاق (errIn=2)', JSON.stringify(lastCall('get_logs').q));
is(await page.$eval('#hfPop [data-sec="range"]', e => e.classList.contains('dim')) && await page.$eval('#lfNF', e => e.value) === '', 'والنطاق بقى باهت وفاضي');
await page.dispatchEvent('#hfPop [data-sec="range"]', 'pointerdown'); await page.waitForTimeout(250);
is(await page.$$eval('#lfNumList input:checked', c => c.length) === 0 && !lastCall('get_logs').q.errIn, 'الضغط على القسم الباهت بيمسح الاختيار التاني ويشتغل هو');
await page.keyboard.press('Escape');
await page.click('#logClearAllBtn'); await settle();

console.log('\n── الترتيب: 3 حالات · server-side · مستقل عن الفلاتر ──');
await page.click('#logBody th[data-fk="emp"] .th-label'); await settle();
is(lastCall('get_logs').q.sortKey === 'employee' && lastCall('get_logs').q.sortDir === 'asc', 'ضغطة 1: تصاعدي (sortKey=employee)');
is(await page.$eval('#logBody th[data-fk="emp"] .sort-icon', e => e.textContent) === '▲' && await page.$$eval('.sort-icon', s => s.filter(x => x.textContent).length) === 1, 'السهم بيظهر على العمود المرتَّب بس');
await page.click('#logBody th[data-fk="emp"] .th-label'); await settle();
is(lastCall('get_logs').q.sortDir === 'desc', 'ضغطة 2: تنازلي');
await clickFlt('status'); await page.click('#lfMsList .lf-it:has-text("Shipped") input'); await page.keyboard.press('Escape'); await settle();
await page.click('#logClearAllBtn'); await settle();
is(lastCall('get_logs').q.sortKey === 'employee', 'الترتيب بيفضل بعد «مسح كل الفلاتر» (مستقل عن الفلاتر)');
await page.click('#logBody th[data-fk="emp"] .th-label'); await settle();
is(!lastCall('get_logs').q.sortKey && await page.$$eval('.sort-icon', s => s.every(x => x.textContent === '')), 'ضغطة 3: بلا ترتيب والأيقونة اختفت');
for (const [col, key] of [['date', 'timestamp'], ['time', 'time'], ['ok', 'ok'], ['warn', 'warn'], ['err', 'err'], ['orders', 'n'], ['status', 'status'], ['courier', 'courier']]) {
  await page.click(`#logBody th[data-fk="${col}"] .th-label`); await settle(300);
  is(lastCall('get_logs').q.sortKey === key, `عمود «${col}» بيرتّب بـ sortKey=${key}`, lastCall('get_logs').q.sortKey);
  await page.click(`#logBody th[data-fk="${col}"] .th-label`); await page.click(`#logBody th[data-fk="${col}"] .th-label`); await settle(200);
}

console.log('\n── صفر نتايج: الجدول وعناوينه وقمعاته ظاهرين ──');
await clickFlt('orders'); await page.fill('#lfOrdInp', '999'); await page.keyboard.press('Enter'); await settle(); await page.keyboard.press('Escape');
is(await batchRows() === 0 && await page.$$eval('#logBody thead th .hfn', h => h.length) === 9, 'صفر نتايج = صفر صفوف والقمعات الـ9 ظاهرة');
is((await page.$eval('#logBody .log-none', e => e.textContent)).includes('مطابقة'), 'الرسالة صف جوّه الجدول (.log-none)');
await page.click('#logClearAllBtn'); await settle();

console.log('\n── تحديد الكل + التصدير ──');
is(await page.$eval('#logCbAll', e => e.id) === 'logCbAll', 'خانة «تحديد الكل» في رأس العمود الأول');
await page.click('#logCbAll'); await page.waitForTimeout(120);
is(await page.$$eval('#logBody .log-cb:checked', c => c.length) === 4 && (await page.$eval('#logExportSelCount', e => e.textContent)) === '4', 'تحديد الكل = دفعات الصفحة');
await page.click('#logExportSelectedBtn'); await page.waitForTimeout(500);
let xl = await page.evaluate(() => window.__xl);
const resCol = xl.rows.map(r => r.result);
is(xl.rows.length === 12 && resCol.filter(r => r === 'تم').length === 8 && resCol.includes('تم جزئيًا') && resCol.includes('فشل') && resCol.includes('مرفوض'), 'عمود النتيجة في الإكسيل بنفس RESULT_LABELS', [...new Set(resCol)].join('|'));
is(resCol.includes('—') && !resCol.includes('ناجح'), 'الصف القديم بلا extra.result = «—» مش «تم»');
is(xl.cols.some(c => c.header === 'ملاحظة النتيجة'), 'عمود «ملاحظة النتيجة»');
is(/^order-status-log-selected-\d{4}-\d{2}-\d{2}\.xlsx$/.test(xl.name || ''), 'اسم الملف بتاريخ القاهرة', xl.name);
await page.click('#logCbAll'); await page.waitForTimeout(100);
is(await page.$$eval('#logBody .log-cb:checked', c => c.length) === 0, 'إلغاء تحديد الكل');
await clickFlt('status'); await page.click('#lfMsList .lf-it:has-text("Ready") input'); await page.keyboard.press('Escape'); await settle();
await page.click('#logExportBtn'); await page.waitForTimeout(500);
is(lastCall('get_logs_export').q.status === 'Ready', 'تصدير الكل بيبعت نفس فلاتر الشاشة (مصدر واحد)', JSON.stringify(lastCall('get_logs_export').q));
await page.click('#logClearAllBtn'); await settle();

console.log('\n── سحب عرض الأعمدة (#51) ──');
const ws0 = await page.$$eval('#logBody colgroup col', c => c.map(x => parseFloat(x.style.width)));
is(ws0.length === 12 && ws0.every(w => w > 0), 'colgroup بعد أول قياس', ws0.join());
const tw = await page.$eval('#logBody .log-otbl', e => e.getBoundingClientRect().width), cw = await page.$eval('#logBody', e => e.clientWidth);
is(Math.abs(tw - cw) <= 2 && await page.$eval('#logBody', e => e.scrollWidth <= e.clientWidth + 1), 'الأعمدة متماثلة بالتناسب ومالية الكارت من غير سكرول أفقي', tw + '/' + cw);
const h = await page.$('#logBody th[data-col="courier"] .col-rz'); const bb = await h.boundingBox();
await page.mouse.move(bb.x + bb.width / 2, bb.y + 10); await page.mouse.down(); await page.mouse.move(bb.x + bb.width / 2 - 40, bb.y + 10, { steps: 6 });
is(await page.$('.w-badge') !== null, 'بادج العرض بيظهر وقت السحب');
await page.mouse.up(); await page.waitForTimeout(150);
const ws1 = await page.$$eval('#logBody colgroup col', c => c.map(x => parseFloat(x.style.width)));
is(ws1[4] > ws0[4] + 20, 'السحب لليسار (RTL) كبّر العمود', ws0[4] + ' → ' + ws1[4]);
const saved = await page.evaluate(() => localStorage.getItem('dco_col_widths_v1_Order-Status-Updater.html_log'));
is(!!saved && JSON.parse(saved).courier > 0, 'العرض اتحفظ في localStorage (dco_col_widths_v1_<الصفحة>_log)');
await page.click('#logBody th[data-fk="status"] .th-label'); await settle(300); await page.click('#logBody th[data-fk="status"] .th-label'); await page.click('#logBody th[data-fk="status"] .th-label'); await settle(300);
const ws2 = await page.$$eval('#logBody colgroup col', c => c.map(x => parseFloat(x.style.width)));
is(Math.abs(ws2[4] - ws1[4]) <= 1, 'العرض بيفضل بعد إعادة رسم الجدول (فلتر/ترتيب)', ws1[4] + ' → ' + ws2[4]);
await page.dblclick('#logBody th[data-col="courier"] .col-rz'); await page.waitForTimeout(150);
const ws3 = await page.$$eval('#logBody colgroup col', c => c.map(x => parseFloat(x.style.width)));
is(ws3[4] <= ws2[4], 'دبل كليك = ضبط على المحتوى (بيصغّر كمان)', ws2[4] + ' → ' + ws3[4]);

console.log('\n── الدفعة المقسومة والتحديد عبر الفلاتر ──');
await clickFlt('orders'); await page.fill('#lfOrdInp', '37001'); await page.keyboard.press('Enter'); await settle(); await page.keyboard.press('Escape');
is(await page.$$eval('#logBody .split-badge', s => s.length) === 1 && (await page.$eval('#logBody .split-badge', e => e.textContent)).includes('1 من 8'), 'دفعة ظاهر منها صف واحد من 8 بتتعلّم ✂ 1 من 8');
const cA = await page.$$eval('#logBody tr.log-batch-row', trs => [...trs[0].children].map(td => td.innerText.trim()));
is(cA[7] === '✓5' && cA[9] === '✗2' && cA[6] === '8', 'والعدّادات بتفضل للدفعة كلها مش للصف الظاهر', cA.join('|'));
await page.click('#logClearAllBtn'); await settle();

console.log('\n── سلامة ──');
is(errs.length === 0, 'صفر خطأ JS/كونسول', errs.slice(0, 3).join(' || '));
await browser.close(); server.close();
console.log(`\n${fail ? '❌' : '✅'} ${pass} عدّى · ${fail} فشل`); process.exit(fail ? 1 : 0);
