// docs/cod-fixes-check.mjs — «تحصيل الأوردرات COD» v1.72.0 (متصفح فعلي + Worker وهمي + ExcelJS وهمي بيسجّل الخلايا)
//   ① إشارة طرق الدفع (استرداد بالسالب في D1 → -10,800 مش +10,800) في الشاشة وشيت «الإجمالي»
//   ② نوع الأوردر من الـ Worker (orderKind) + التسمية المحايدة للسجل القديم
//   ③ الإكسيل: سطور الاسترجاع بتقفل على رقم الصف · التاريخ بتوقيت القاهرة · النتيجة من خريطة الشاشة · الأعمدة والشيت الجداد
//   ④ اسم الملف · ⑤ الإدخال بالموجب · نافذة التأكيد بتعرض طرق الدفع
// البيانات = صفوف D1 الحقيقية لجلستَي لقطة الشاشة (02-11-2026) مقصوصة من أسماء المنتجات.
// تشغيل: node docs/cod-fixes-check.mjs   (محتاج playwright)
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

// ── البيانات الحقيقية ────────────────────────────────────────────
const B_COLLECT = 'eff6ac31-8567-4af3-84fe-19f13db9d014', B_REFUND = 'b07c604d-af43-4036-b498-ce7c264480c0';
const L = (sku, p) => ({ sku, quantity: 1, unitPrice: p.toFixed(2), unitDiscount: null, totalPrice: p.toFixed(2) });
const RET = (sku, p) => ({ sku, quantity: 1, discountedUnitPrice: p.toFixed(2) });
let ACC_MODE = false;               // v1.76.0 — صفوف فيها extra.paymentAccounts (Worker ≥ 3.10.0)
let KIND_MODE = 'legacy';            // legacy = صف D1 زي ما هو · new = بـ orderKind من Worker 3.9.0
const pay = (id, ts, order, val, cc, items) => ({ id, type: 'payment', timestamp: ts, employee: 'Fady_Mostafa', order_name: order, order_id: String(id), value_after: val, notes: null,
  extra: JSON.stringify({ result: 'success', batchId: B_COLLECT, courier: 'Showroom', employeeDisplayName: 'Fady Mostafa', paymentMethods: { cash: cc.toFixed(2), instapay: '0.00', wallet: '0.00' }, pmScope: 'order',
    sessionPaymentMethods: { cash: '19000.00' }, extraShipping: [], extraShippingTotal: '0.00', isRefund: false, lineItems: items, returnedItems: [], hasReturn: false, returnShipping: '0.00', courierCollect: cc, preRegistered: false }) });
const rows = () => [
  pay(432160, '2026-11-02T09:41:24.507Z', '#62795', 2875, 2800, [L('CA-ECO-15 / Black / 43', 2800)]),
  pay(432161, '2026-11-02T09:41:25.433Z', '#63183', 2675, 2600, [L('BOA1 / Black x Beige / 43', 2600)]),
  pay(432162, '2026-11-02T09:41:26.551Z', '#63578', 13600, 13600, [L('RN-NK-110 / Grey×black / 43', 2800), L('C50 / Navy / 43', 2800), L('RN-AD-120 / Grey×beige / 43', 2600), L('RN-AD-120 / Black×grey / 43', 2600), L('C50 / Light beige / 44', 2800)]),
  { id: 432999, type: 'refund', timestamp: '2026-11-02T12:15:48.663Z', employee: 'Fady_Mostafa', order_name: '#63578', order_id: '19096316641602', value_after: 10800, notes: null,
    extra: JSON.stringify({ result: 'success', batchId: B_REFUND, courier: 'Showroom', employeeDisplayName: 'Fady Mostafa',
      paymentMethods: { cash: '-10800.00', instapay: '0.00', wallet: '0.00' },          // ← الموظف كتبها بالسالب (الحالة اللي كانت بتتقلب)
      pmScope: 'order', sessionPaymentMethods: { cash: '-10800.00' }, extraShipping: [], extraShippingTotal: '0.00', isRefund: true, refundAmount: 10800,
      lineItems: [L('C50 / Light beige / 44', 2800)],
      returnedItems: [RET('RN-NK-110 / Grey×black / 43', 2800), RET('C50 / Navy / 43', 2800), RET('RN-AD-120 / Grey×beige / 43', 2600), RET('RN-AD-120 / Black×grey / 43', 2600)],
      hasReturn: true, returnShipping: '0.00', courierCollect: -10800, preRegistered: false,
      ...(KIND_MODE === 'new' ? { orderKind: 'partial_return', multiCycle: false } : {}) }) },
  // صف قديم (قبل v3.5.0): من غير extra.result ← لازم يطلع «—» في الإكسيل مش «ناجح»
  { id: 1000, type: 'payment', timestamp: '2026-11-02T22:30:00.000Z', employee: 'Fady_Mostafa', order_name: '#50000', order_id: '1000', value_after: 500, notes: null,
    extra: JSON.stringify({ batchId: 'old-batch-1', courier: 'Showroom', paymentMethods: { cash: '500.00' }, courierCollect: 500, lineItems: [L('OLD / 1', 500)], returnedItems: [], hasReturn: false }) },
];

// 🆕 v1.76.0 — بيحوّل صفوف التحصيل/الاسترداد لتقسيم: انستاباي 10% (فادي/مُرسل نص بنص) + محفظة 5% (إسلام)، والباقي نقدي
const withAcc = list => list.map(r => {
  const x = JSON.parse(r.extra); const cc = Math.abs(x.courierCollect || 0);
  if (!cc || !/^(payment|refund)$/.test(r.type) || x.batchId === 'old-batch-1') return r;
  const ins = cc * 0.10, wal = cc * 0.05, f2 = n => n.toFixed(2), sg = r.type === 'refund' ? -1 : 1;
  // الصف القديم بإشارة الموظف: الاسترداد بالسالب — الواجهة بتاخد الإشارة من type الصف
  x.paymentMethods = { cash: f2(sg * (cc - ins - wal)), instapay: f2(sg * ins), wallet: f2(sg * wal) };
  x.paymentAccounts = { instapay: { 'فادي': f2(ins / 2), 'مُرسل': f2(ins / 2) }, wallet: { 'إسلام': f2(wal) } };
  return { ...r, extra: JSON.stringify(x) };
});
// ── ExcelJS وهمي بيسجّل الخلايا فعلاً ─────────────────────────────
const browser = await chromium.launch({ args: ['--no-sandbox'], ...(process.env.PW_CHROMIUM ? { executablePath: process.env.PW_CHROMIUM } : {}) });
const ctx = await browser.newContext({ viewport: { width: 1280, height: 900 } }); const page = await ctx.newPage(); const errs = [];
page.on('pageerror', e => errs.push(e.message));
await page.addInitScript(() => { sessionStorage.setItem('dco_session', JSON.stringify({ v: 1, username: 'A', displayName: 'A', loginAt: '2026-11-02T08:00:00Z' })); localStorage.setItem('delivery_cod_ops_worker_secret', 'S'); });
await page.addInitScript(() => {
  const mkCell = (row, col) => ({ row, col, value: null, font: null, fill: null, border: null, alignment: null, numFmt: null });
  const mkRow = (sh, n) => { const r = { n, cells: [], height: null,
    getCell(c) { while (r.cells.length < c) r.cells.push(mkCell(r, r.cells.length + 1)); return r.cells[c - 1]; },
    eachCell(o, cb) { if (typeof o === 'function') { cb = o; o = {}; } const inc = o && o.includeEmpty; r.cells.forEach((c, i) => { if (inc || (c.value !== null && c.value !== undefined && c.value !== '')) cb(c, i + 1); }); } }; return r; };
  const mkSheet = name => { const sh = { name, rows: [], _cols: [], views: null, _kind: 'sheet',
    addRow(o) { const r = mkRow(sh, sh.rows.length + 1); sh._cols.forEach((c, i) => { const v = o[c.key]; r.getCell(i + 1).value = v === undefined ? null : v; }); sh.rows.push(r); return r; },
    getRow(n) { return sh.rows[n - 1]; }, eachRow(cb) { sh.rows.forEach(r => cb(r, r.n)); }, get rowCount() { return sh.rows.length; } };
    Object.defineProperty(sh, 'columns', { get: () => sh._cols, set(v) { sh._cols = v; const r = mkRow(sh, 1); v.forEach((c, i) => { r.getCell(i + 1).value = c.header; }); sh.rows.push(r); } }); return sh; };
  window.__wbs = [];
  window.ExcelJS = { Workbook: function () { const wb = { sheets: [], views: null, addWorksheet(n) { const s = mkSheet(n); wb.sheets.push(s); return s; }, xlsx: { writeBuffer: async () => { window.__wbs.push(wb); return new ArrayBuffer(8); } } }; return wb; } };
  window.__dump = () => { const wb = window.__wbs.at(-1); return wb.sheets.map(s => ({ name: s.name, rows: s.rows.map(r => ({ v: r.cells.map(c => c.value), fonts: r.cells.map(c => c.font && { color: c.font.color && c.font.color.argb, italic: !!c.font.italic, bold: !!c.font.bold }) })) })); };
});
const calls = [];
await page.route('**/*.workers.dev/**', async route => {
  const u = new URL(route.request().url()); const a = u.searchParams.get('action') || '';
  calls.push(a);
  const R = ACC_MODE ? withAcc(rows()) : rows();
  let out = { ok: true, success: true, version: '99.0.0', checks: [], employees: [], values: [], entries: [], total: 0 };
  if (a === 'get_logs' || a === 'get_logs_export') { out.entries = R; out.total = R.length; out.cap = 5000; out.truncated = false; }
  if (a === 'get_logs_count') out.total = R.length;
  await route.fulfill({ status: 200, contentType: 'application/json', headers: { 'Access-Control-Allow-Origin': '*' }, body: JSON.stringify(out) });
});
const open = async () => { await page.goto(`${BASE}/COD-Payment-Center.html`); await page.waitForSelector('#entryInput'); await page.click('#tabLog'); await page.waitForSelector('.log-otbl .log-batch-row'); };
const dump = () => page.evaluate(() => window.__dump());
const col = (sheet, key) => sheet.rows[0].v.indexOf(key);
const exportSelected = async () => {
  await page.evaluate(() => { selectedLogBatches.clear(); document.querySelectorAll('.log-cb').forEach(c => { c.checked = false; }); });
  for (const cb of await page.locator('.log-cb').all()) { const row = await cb.evaluate(n => n.closest('tr').innerText); if (/Showroom/.test(row) && !/^\s*$/.test(row)) await cb.check(); }
  const dl = page.waitForEvent('download', { timeout: 8000 }).catch(() => null);
  await page.click('#logExportSelectedBtn'); const d = await dl; await page.waitForTimeout(250);
  return d;
};

console.log('\n══ ① الشاشة: طرق الدفع في الاسترداد ══');
await open();
const batchRows = await page.locator('.log-batch-row').allInnerTexts();
const pmCell = page.locator('.log-batch-row', { hasText: 'استرداد' }).first().locator('td').nth(9);
const pmTxt = (await pmCell.innerText()).replace(/\s+/g, ' ').trim();
is(/−10,800/.test(pmTxt) && !/(^|\s)10,800/.test(pmTxt.replace('−10,800', '')), 'خلية «طرق الدفع» في جلسة الاسترداد = −10,800 (مش 10,800 موجب)', pmTxt);
const pmCellHtml = await pmCell.innerHTML();
is(/color:var\(--red\)/.test(pmCellHtml), 'وبالأحمر زي عمود «استرداد»', pmCellHtml.slice(0, 120));
const collectRow = batchRows.find(t => t.includes('19,150') || t.includes('19150')) || '';
is(/19,000/.test(collectRow), 'جلسة التحصيل: طرق الدفع 19,000 (من غير الشحن) زي ما كانت', collectRow.replace(/\s+/g, ' '));

console.log('\n══ ② نوع الأوردر في تفاصيل السجل ══');
await page.locator('.log-batch-row', { hasText: 'استرداد' }).first().click();
const detail = await page.locator('.log-detail-row:visible').first().innerText();
is(detail.includes('استرجاع جزئي / استبدال'), 'سجل قديم (بلا orderKind) ← تسمية محايدة «استرجاع جزئي / استبدال»', detail.replace(/\s+/g, ' ').slice(0, 160));
is(await page.locator('.log-detail-row:visible span[title*="سجل قديم"]').count() === 1, 'ومعاها tooltip «سجل قديم»');
KIND_MODE = 'new'; await open();
await page.locator('.log-batch-row', { hasText: 'استرداد' }).first().click();
const detail2 = await page.locator('.log-detail-row:visible').first().innerText();
is(detail2.includes('استرجاع جزئي') && !detail2.includes('استبدال') && !detail2.includes('/'), 'صف بـ orderKind=partial_return ← «استرجاع جزئي» بالظبط (مش استبدال)', detail2.replace(/\s+/g, ' ').slice(0, 160));

console.log('\n══ ③ دوال المصدر الواحد (نوع الأوردر · اسم الملف · التقسيم) ══');
const fn = await page.evaluate(() => ({
  k: [
    orderKindKey({ hasReturn: false }, false), orderKindKey({ orderKind: 'normal', hasReturn: false }, false),
    orderKindKey({ orderKind: 'exchange', hasReturn: true }, false), orderKindKey({ orderKind: 'full_return', hasReturn: true }, true),
    orderKindKey({ hasReturn: true, lineItems: [1] }, true), orderKindKey({ hasReturn: true, lineItems: [] }, true),
    orderKindKey({ hasReturn: false }, true), orderKindKey({ orderKind: 'hacked', hasReturn: true, lineItems: [1] }, false),
  ],
  names: ['SK1 / x'].concat([]).length,
  f: [
    exportFileName([{ date: '2026-11-02T12:00:00Z', courier: 'Showroom' }], true, false, false),
    exportFileName([{ date: '2026-11-02T12:00:00Z', courier: 'Showroom' }], false, false, true),
    exportFileName([{ date: '2026-10-01T12:00:00Z', courier: 'A' }, { date: '2026-11-03T12:00:00Z', courier: 'B' }], false, false, false),
    exportFileName([{ date: '2026-10-01T12:00:00Z', courier: 'A' }, { date: '2026-11-03T12:00:00Z', courier: 'B' }], false, true, true),
    exportFileName([{ date: '2026-12-30T12:00:00Z', courier: 'A' }, { date: '2027-01-02T12:00:00Z', courier: 'B' }, { date: '2027-01-02T12:00:00Z', courier: 'C' }], true, false, false),
    exportFileName([{ date: '2026-11-02T22:30:00Z', courier: 'Mohamed Tarek' }], false, false, false),
    exportFileName([{ date: '2026-11-02T12:00:00Z', courier: 'a/b:c*' }], false, false, false),
    exportFileName([], false, false, false),
  ],
  split: allocatePaymentSplit([-2400, 0], { cash: -2400, instapay: 0, wallet: 0 }),
  split2: allocatePaymentSplit([2800, 2600, 13600], { cash: 19000, instapay: 0, wallet: 0 }).map(x => x.cash),
}));
is(JSON.stringify(fn.k) === JSON.stringify(['normal', 'normal', 'exchange', 'full_return', 'legacy_mixed', 'legacy_return', 'refund_only', 'legacy_mixed']), 'orderKindKey: كل الحالات (جديد · قديم · استرداد بلا مرتجع · قيمة مش معروفة)', JSON.stringify(fn.k));
is(JSON.stringify(fn.f) === JSON.stringify([
  'COD_Showroom_2026-11-02_sel.xlsx', 'COD_Showroom_2026-11-02.xlsx', 'COD_All_2026-10-01_to_11-03.xlsx', 'COD_2-Couriers_2026-10-01_to_11-03_partial.xlsx',
  'COD_3-Couriers_2026-12-30_to_2027-01-02_sel.xlsx', 'COD_Mohamed-Tarek_2026-11-03.xlsx', 'COD_abc_2026-11-02.xlsx', 'COD_All_NoDate.xlsx']),
  'exportFileName: مندوب واحد · All · فترة · N-Couriers · _sel · _partial · عبر السنة · منتصف الليل بتوقيت القاهرة · حروف ممنوعة', JSON.stringify(fn.f));
is(fn.split.every(x => parseFloat(x.cash) >= 0) && fn.split2.reduce((a, b) => a + parseFloat(b), 0) === 19000, 'allocatePaymentSplit: حصص غير سالبة ومجموعها = المُدخل بالمليم', JSON.stringify(fn.split) + ' | ' + fn.split2);

console.log('\n══ ④ الإكسيل — الجلستين اللي في لقطة الشاشة (بيانات قديمة: بلا orderKind) ══');
KIND_MODE = 'legacy'; await open();
let d = await exportSelected();
is(d && d.suggestedFilename() === 'COD_Showroom_2026-11-02_sel.xlsx' || d && d.suggestedFilename() === 'COD_Showroom_2026-11-02_to_11-03_sel.xlsx', 'اسم الملف مختصر ومعبّر (مندوب + فترة البيانات + _sel)', d && d.suggestedFilename());
let wb = await dump();
const s1 = wb.find(s => s.name === 'سجل التحصيل'), s2 = wb.find(s => s.name === 'الإجمالي'), s3 = wb.find(s => s.name === 'معلومات التصدير');
is(!!s1 && !!s2 && !!s3 && wb.length === 3, 'التلات شيتات: سجل التحصيل · الإجمالي · معلومات التصدير', wb.map(s => s.name).join(' | '));
const H = s1.rows[0].v;
is(['الوقت', 'الجلسة', 'ملاحظة النتيجة'].every(h => H.slice(-3).includes(h)) && H.length === 19, 'الأعمدة الجديدة في الآخر (الوقت · الجلسة · ملاحظة النتيجة) والباقي في أماكنه', H.join(' | '));
const iOrd = H.indexOf('رقم الأوردر'), iType = H.indexOf('نوع الأوردر'), iSku = H.indexOf('SKU'), iCol = H.indexOf('سعر بعد الخصم'), iL = H.indexOf('تحصيل الأوردر كامل (بدون الشحن)'), iDate = H.indexOf('التاريخ'), iRes = H.indexOf('النتيجة'), iNote = H.indexOf('ملاحظة النتيجة'), iTime = H.indexOf('الوقت'), iSess = H.indexOf('الجلسة');
const body = s1.rows.slice(1);
const startRef = body.findIndex(r => r.v[iOrd] === '#63578' && r.v[iL] === -10800);
const refundBlock = []; for (let i = startRef; i < body.length && (i === startRef || !body[i].v[iOrd]); i++) refundBlock.push(body[i]);
is(startRef >= 0 && String(refundBlock[0].v[iSku]).startsWith('↩'), 'صف الاسترداد: الأوردر والتحصيل متعلقين على أول سطر **مرتجع** (↩) مش على قطعة باقية', refundBlock[0] && refundBlock[0].v[iSku]);
const sumLines = refundBlock.reduce((t, r) => t + (typeof r.v[iCol] === 'number' ? r.v[iCol] : 0), 0);
is(sumLines === -10800, 'مجموع «سعر بعد الخصم» لسطور الاسترداد = −10,800 = «تحصيل الأوردر كامل» (كان −8,000)', String(sumLines));
const keptRow = refundBlock.find(r => String(r.v[iSku]).includes('باقي في الأوردر'));
is(!!keptRow && keptRow.v[iCol] === null && keptRow.v[iL] === null && keptRow.fonts.some(f => f && f.italic && f.color === 'FF888888'), 'القطعة الباقية سطر مرجعي رمادي مائل بلا قيمة مالية', JSON.stringify(keptRow && keptRow.v));
is(refundBlock[0].v[iType] === 'استرجاع جزئي / استبدال', 'نوع الأوردر في الإكسيل = التسمية المحايدة (سجل قديم)', refundBlock[0].v[iType]);
const normalBlockFirst = body.find(r => r.v[iOrd] === '#63578' && r.v[iL] === 13600);
is(normalBlockFirst && normalBlockFirst.v[iType] === 'عادي' && typeof normalBlockFirst.v[iCol] === 'number', 'التحصيل العادي لنفس الأوردر لسه سطوره بقيمها (مش اتمسّح منها حاجة)');
is(refundBlock[0].v[iDate] === '02-11-2026', 'التاريخ DD-MM-YYYY بتوقيت القاهرة', String(refundBlock[0].v[iDate]));
is(/\d{2}:\d{2}/.test(String(refundBlock[0].v[iTime])) && /^b07c604d$/.test(String(refundBlock[0].v[iSess])), 'عمودا الوقت والجلسة (أول 8 من batchId)', refundBlock[0].v[iTime] + ' / ' + refundBlock[0].v[iSess]);
const okRow = body.find(r => r.v[iOrd] === '#62795');
is(okRow.v[iRes] === 'ناجح', 'صف بنتيجة success ← «ناجح»', String(okRow.v[iRes]));
const oldRow = body.find(r => r.v[iOrd] === '#50000');
is(oldRow && oldRow.v[iRes] === '—' && /سجل قديم/.test(String(oldRow.v[iNote])), 'صف قديم بلا extra.result ← «—» + ملاحظة «سجل قديم» (مش «ناجح»)', oldRow && (oldRow.v[iRes] + ' | ' + oldRow.v[iNote]));
is(oldRow && oldRow.v[iDate] === '03-11-2026', 'صف 22:30 UTC بيتسجّل 03-11 بتوقيت القاهرة (مش يوم جهاز الموظف)', oldRow && oldRow.v[iDate]);
const h2 = s2.rows[0].v;
const sh = s2.rows.find(r => r.v[0] === 'Showroom');
const g = k => sh.v[h2.indexOf(k)];
is(g('تحصيل المندوب الصافي بدون شحن') === 8200 + 500, 'شيت «الإجمالي»: الصافي = 13,600 + 2,600 + 2,800 − 10,800 (+500 الصف القديم) ', String(g('تحصيل المندوب الصافي بدون شحن')));
is(g('نقدي') === g('تحصيل المندوب الصافي بدون شحن'), 'النقدي = الصافي (كان 29,800 مقابل 8,200)', `${g('نقدي')} vs ${g('تحصيل المندوب الصافي بدون شحن')}`);
is(g('فرق طرق الدفع عن الصافي') === 0, '«فرق طرق الدفع عن الصافي» = 0 (كان 21,600 أحمر)', String(g('فرق طرق الدفع عن الصافي')));
const info = Object.fromEntries(s3.rows.slice(1).map(r => [r.v[0], r.v[1]]));
is(info['نسخة الواجهة'] && /^v1\./.test(info['نسخة الواجهة']) && /جلسات اتحددت/.test(info['نوع التصدير']) && info['الملف كامل؟'] === 'نعم — الجلسات المحددة بس' && info['عدد الجلسات'] === 3, 'شيت «معلومات التصدير»: النسخة · نوع التصدير · هل الملف كامل · عدد الجلسات', JSON.stringify(info).slice(0, 300));
is(/\d{2}-\d{2}-\d{4}/.test(info['وقت التصدير (توقيت القاهرة)']) && !!info['فترة بيانات الملف'] && /Showroom/.test(info['المناديب في الملف']), 'وقت التصدير بتوقيت القاهرة · فترة البيانات · المناديب');

console.log('\n══ ⑤ الإكسيل — نفس البيانات بعد Worker 3.9.0 (orderKind) ══');
KIND_MODE = 'new'; await open(); d = await exportSelected(); wb = await dump();
const t1 = wb.find(s => s.name === 'سجل التحصيل'); const b1 = t1.rows.slice(1);
const r2 = b1.find(r => r.v[iOrd] === '#63578' && r.v[iL] === -10800);
is(r2 && r2.v[iType] === 'استرجاع جزئي', 'نوع الأوردر «استرجاع جزئي» (مش استبدال)', r2 && r2.v[iType]);
is(r2 && r2.fonts[iType] && r2.fonts[iType].color === 'FFCC0000', 'ولونه أحمر (عائلة الاسترجاع)', JSON.stringify(r2 && r2.fonts[iType]));

console.log('\n══ ⑥ الإدخال: المبلغ بالموجب + نافذة التأكيد ══');
const inp = await page.evaluate(() => {
  const el = document.getElementById('pmCash'); el.value = '-5'; el.dispatchEvent(new Event('input', { bubbles: true }));
  const afterPaste = el.value; const toast = [...document.querySelectorAll('.toast')].map(t => t.textContent).join('|');
  const ev = new KeyboardEvent('keydown', { key: '-', cancelable: true }); el.dispatchEvent(ev);
  el.value = ''; return { afterPaste, toast, blocked: ev.defaultPrevented };
});
is(inp.afterPaste === '5' && /بالموجب/.test(inp.toast), 'مدخل سالب (لصق/سهم) بيتحوّل لموجب + توست', JSON.stringify(inp));
// v1.75.0 — الخانات المرئية بقت بلاطات (§PAY-TILES) بتشيل أي «-» مكتوبة وبتعرض الإشارة من الصافي؛ سلوكها في docs/cod-pay-ui-check.mjs
const dlg = await page.evaluate(async () => {
  orders = [{ id: '19096316641602', orderName: '#63578', status: 'refund', amount: -10800, refundAmount: 10800, returnShipping: '0.00', hasReturn: true, courier: 'Showroom',
    lineItems: [{ sku: 'C50 / Light beige / 44', quantity: 1 }], returnedItems: [{ sku: 'x', quantity: 1, discountedUnitPrice: '2800.00' }], saleTransactions: [{ id: 't', amount: 13600 }], orderKind: 'partial_return', multiCycle: false }];
  renderTable(); updatePayMethodsCard();
  const set = (id, v) => { const el = document.getElementById(id); el.value = v; el.dispatchEvent(new Event('input', { bubbles: true })); };
  set('pmCash', '-10800');                                // الموظف كتبها بالسالب
  const valid = isPayValid(); const cashVal = document.getElementById('pmCash').value;
  await confirmBulkPay();
  return { valid, cashVal, body: document.getElementById('confirmBody').innerText };
});
is(dlg.valid && dlg.cashVal === '10800', 'مدخل 10800− ← اتحوّل 10800 والتحقق عدّى', JSON.stringify({ v: dlg.valid, c: dlg.cashVal }));
is(/نقدي/.test(dlg.body) && /10,800/.test(dlg.body), 'نافذة التأكيد بتعرض طرق الدفع (كانت بتخفيها لو سالبة)', dlg.body.replace(/\s+/g, ' ').slice(0, 220));
is(/1 استرداد استرجاع جزئي/.test(dlg.body.replace(/\s+/g, ' ')), 'وبتعدّ الأوردر «استرداد استرجاع جزئي» (مش «استرداد استبدال»)', dlg.body.replace(/\s+/g, ' ').slice(0, 220));
const dlg2 = await page.evaluate(async () => {
  orders[0].multiCycle = true; renderTable(); await confirmBulkPay(); return document.getElementById('confirmBody').innerText; });
is(/أكتر من دورة/.test(dlg2) && /#63578/.test(dlg2), 'أوردر على أكتر من دورة ← تحذير في نافذة التأكيد (بلا تغيير في الأرقام)');
is(errs.length === 0, 'صفر خطأ كونسول', errs.slice(0, 3).join(' || '));

console.log('\n══ ⑦ تفصيل حسابات الانستاباي والمحفظة (Worker ≥ 3.10.0) ══');
KIND_MODE = 'new'; ACC_MODE = false; await open(); await exportSelected();
is((await dump()).every(sh => sh.name !== 'حسابات الدفع'), 'سجل بلا تفصيل ← مفيش شيت «حسابات الدفع»');
const shNoAcc = (await dump()).find(sh => sh.name === 'الإجمالي');
is(shNoAcc.rows[0].v.includes('انستاباي · فادي') && shNoAcc.rows[0].v.indexOf('انستاباي · فادي') >= 10, 'أعمدة الحسابات في شيت «الإجمالي» **في الآخر** (بعد «فرق طرق الدفع عن الصافي»)');
ACC_MODE = true; await open();
const collectCell = (await page.locator('.log-batch-row', { hasText: '19,150' }).first().locator('td').nth(9).innerText()).replace(/\s+/g, ' ');
is(/📱 1,900/.test(collectCell) && /فادي 950/.test(collectCell) && /مُرسل 950/.test(collectCell) && /👛 950/.test(collectCell) && /إسلام 950/.test(collectCell), 'سطر جلسة التحصيل: انستاباي 1,900 (فادي 950 · مُرسل 950) · محفظة 950 (إسلام 950)', collectCell);
const refundCell = (await page.locator('.log-batch-row', { hasText: 'استرداد' }).first().locator('td').nth(9).innerText()).replace(/\s+/g, ' ');
is(/−1,080/.test(refundCell) && /فادي −540/.test(refundCell) && /مُرسل −540/.test(refundCell) && /إسلام −540/.test(refundCell), 'جلسة الاسترداد: التفصيل بالسالب (فادي −540 · مُرسل −540 · إسلام −540)', refundCell);
await exportSelected(); wb = await dump();
const tx = wb.find(sh => sh.name === 'الإجمالي'), hx = tx.rows[0].v, sr = tx.rows.find(r => r.v[0] === 'Showroom');
const gv = k => sr.v[hx.indexOf(k)];
is(gv('انستاباي · فادي') === 410 && gv('انستاباي · مُرسل') === 410 && gv('محفظة · إسلام') === 410 && !gv('انستاباي · إسلام') && !gv('محفظة · فادي'), 'شيت «الإجمالي»: فادي 410 · مُرسل 410 (انستاباي) · إسلام 410 (محفظة) = تحصيل − استرداد', JSON.stringify(hx.map((k, i) => [k, sr.v[i]]).slice(10)));
is(!gv('انستاباي/محفظة بلا تفصيل حساب'), '«بلا تفصيل حساب» = صفر لما كل الجلسات مفصّلة', String(gv('انستاباي/محفظة بلا تفصيل حساب')));
const t4 = wb.find(sh => sh.name === 'حسابات الدفع');
is(!!t4 && t4.rows[0].v.join('|') === 'التاريخ|الوقت|الجلسة|المندوب|الموظف|الطريقة|الحساب|المبلغ', 'شيت «حسابات الدفع» موجود بأعمدته', t4 && t4.rows[0].v.join('|'));
const L4 = t4 ? t4.rows.slice(1).map(r => `${r.v[5]}|${r.v[6]}|${r.v[7]}`) : [];
is(['انستاباي|فادي|950', 'انستاباي|مُرسل|950', 'محفظة|إسلام|950', 'انستاباي|فادي|-540', 'انستاباي|مُرسل|-540', 'محفظة|إسلام|-540', 'نقدي|—|-9180'].every(x => L4.includes(x)),
   'سطر لكل جلسة × طريقة × حساب بإشارة الجلسة (الاسترداد سالب) + سطر النقدي', JSON.stringify(L4));
is(t4 && t4.rows.slice(1).filter(r => r.v[7] < 0).every(r => r.fonts[7] && r.fonts[7].color === 'FFCC0000'), 'والسالب أحمر');
is(errs.length === 0, 'صفر خطأ كونسول', errs.slice(0, 3).join(' || '));

await browser.close(); server.close();
console.log(`\n${fail ? '❌' : '✅'} النتيجة: ${pass} عدّى · ${fail} فشل`);
process.exit(fail ? 1 : 0);
