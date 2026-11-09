// docs/cod-bosta-check.mjs — فحص تاب «تحصيل بوسطة» v1.77.0 (متصفح فعلي + Worker وهمي + ملفات إكسيل حقيقية)
//   npm i playwright exceljs@4.3.0 --no-save && node docs/cod-bosta-check.mjs
//   EXCELJS_PATH=مسار/exceljs.min.js (الـ CDN مش متاح في بيئة الفحص فبنقدّمه محليًا) · PW_CHROMIUM لو كروميوم مثبّت مسبقًا
//   الملفات في docs/fixtures (بيانات تجريبية بنفس شكل ملف Cash Cycles الحقيقي — بلا أسماء عملاء حقيقية).
import http from 'node:http'; import fs from 'node:fs'; import path from 'node:path'; import { createRequire } from 'node:module'; import { fileURLToPath } from 'node:url';
import { chromium } from 'playwright';
const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const FIX = f => path.join(ROOT, 'docs/fixtures', f);
const req = createRequire(import.meta.url);
let EXCEL = process.env.EXCELJS_PATH;
if (!EXCEL) { for (const base of [ROOT, process.cwd(), '/tmp']) { try { EXCEL = req.resolve('exceljs/dist/exceljs.min.js', { paths: [base] }); break; } catch {} } }
if (!EXCEL || !fs.existsSync(EXCEL)) { console.error('🔴 exceljs.min.js مش لاقيه — npm i exceljs@4.3.0 --no-save أو EXCELJS_PATH'); process.exit(1); }
const MIME = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.css': 'text/css; charset=utf-8' };
const server = http.createServer((rq, res) => {
  const f = path.join(ROOT, decodeURIComponent(rq.url.split('?')[0]).replace(/^\/+/, ''));
  if (!f.startsWith(ROOT) || !fs.existsSync(f) || fs.statSync(f).isDirectory()) { res.writeHead(404); return res.end('nf'); }
  res.writeHead(200, { 'Content-Type': MIME[path.extname(f)] || 'application/octet-stream' }); res.end(fs.readFileSync(f));
});
await new Promise(r => server.listen(0, '127.0.0.1', r));
const BASE = `http://127.0.0.1:${server.address().port}`;
let pass = 0, fail = 0;
const is = (c, m, d = '') => { c ? pass++ : fail++; console.log(c ? '  ✅' : '  ❌', m, !c && d ? `\n       ${d}` : ''); };
const sleep = ms => new Promise(r => setTimeout(r, ms));
const launchOpts = { args: ['--no-sandbox'] }; if (process.env.PW_CHROMIUM) launchOpts.executablePath = process.env.PW_CHROMIUM;
const browser = await chromium.launch(launchOpts);
const SESSION = { v: 1, username: 'Ahmed_Ibraheem', displayName: 'Ahmed Ibraheem', loginAt: '2026-11-04T08:00:00.000Z' };

// ── Worker وهمي: بيحكم بالمرجع (مش بيعيد كتابة منطق الـ Worker — ده مفحوص في ريبوه) ──
const VERDICT = {
  '#70101': { status: 'ready', orderId: '101', orderName: '#70101', shopify: '2675.00', preRegistered: false },
  '#70102': { status: 'ready', orderId: '102', orderName: '#70102', shopify: '1850.00', preRegistered: false },
  '#70103': { status: 'ready_zero', orderId: '103', orderName: '#70103', shopify: '0.00', preRegistered: false },
  '#70104': { status: 'ready', orderId: '104', orderName: '#70104', shopify: '-1650.00', preRegistered: false },
  '#70105': { status: 'ready', orderId: '105', orderName: '#70105', shopify: '500.00', preRegistered: true },
  '#70106': { status: 'error', orderId: '106', orderName: '#70106', shopify: '-7500.00', reasons: ['الإجمالي في الملف (-2000.00) ≠ مستحق شوبيفاي (-7500.00)'] },
  '#70107': { status: 'error', reasons: ['Business ID («WRONGBIZ») مش بتاع الشركة'] },
  '#70109': { status: 'error', reasons: ['Net Value (1000.00) ≠ COD + Online − Total Fees + Flex Ship (1100.00)'] },
  '149622': { status: 'error', reasons: ['الأوردر #149622 مش موجود على شوبيفاي'] },
};
const registered = new Set();
async function open({ payFail = {}, payNetwork = null, already = new Set() } = {}) {
  const ctx = await browser.newContext(); const page = await ctx.newPage(); const calls = [], errs = [];
  page.on('pageerror', e => errs.push(e.message));
  await page.addInitScript(([s]) => { sessionStorage.setItem('dco_session', JSON.stringify(s)); localStorage.setItem('delivery_cod_ops_worker_secret', 'S'); }, [SESSION]);
  await page.route('**/cdnjs.cloudflare.com/**/exceljs*', route => route.fulfill({ status: 200, contentType: 'text/javascript', body: fs.readFileSync(EXCEL) }));
  await page.route('**/*.workers.dev/**', async route => {
    const rq = route.request(); let body = null; try { body = rq.postData() ? JSON.parse(rq.postData()) : null; } catch {}
    const action = new URL(rq.url()).searchParams.get('action') || (body && body.action) || '';
    calls.push({ action, body });
    let out = { ok: true, success: true, version: '99.0.0', checks: [], entries: [], orders: [], employees: [], values: [], results: [], total: 0 };
    if (action === 'getCourierValues') out = { success: true, values: ['Bosta'] };
    if (action === 'bostaValidate') {
      out = { success: true, results: body.rows.map(r => {
        if (registered.has(r.trackingNumber)) return { rowNo: r.rowNo, status: 'done', reasons: ['اتسجّل قبل كده (2026-11-04 10:00 UTC)'], orderId: '1', orderName: r.orderRef };
        const bn = /^#8\d{4}$/.test(r.orderRef) ? Number(r.orderRef.slice(1)) : null;   // ملف الجدول الكبير (§⑧)
        if (bn !== null) {
          const g = (Number(r.cod) || 0) + (Number(r.online) || 0);
          if (bn % 7 === 3) return { rowNo: r.rowNo, status: 'error', orderId: String(bn), orderName: r.orderRef, shopify: String(g + 100), reasons: [`الإجمالي في الملف (${g.toFixed(2)}) ≠ مستحق شوبيفاي (${(g + 100).toFixed(2)})`] };
          return { rowNo: r.rowNo, status: 'ready', orderId: String(bn), orderName: r.orderRef, shopify: g.toFixed(2), preRegistered: false, reasons: [] };
        }
        const v = VERDICT[r.orderRef] || { status: 'error', reasons: ['؟'] };
        return { rowNo: r.rowNo, tracking: r.trackingNumber, reasons: [], ...v };
      }) };
    }
    if (action === 'bostaPay') {
      const ref = body.row.orderRef;
      if (payNetwork === ref) { await route.abort('failed'); return; }
      if (payFail[ref]) out = { success: false, status: 'error', error: payFail[ref], actions: [] };
      else if (already.has(ref)) out = { success: true, status: 'already', alreadyRegistered: true, actions: [], logged: true };
      else { registered.add(body.row.trackingNumber); out = { success: true, status: 'success', actions: ['تم'], logged: true, kind: 'payment' }; }
      await sleep(30);
    }
    await route.fulfill({ status: 200, contentType: 'application/json', headers: { 'Access-Control-Allow-Origin': '*' }, body: JSON.stringify(out) });
  });
  await page.goto(`${BASE}/COD-Payment-Center.html`); await page.waitForSelector('#entryInput');
  return { page, calls, errs };
}
const txt = (page, sel) => page.evaluate(s => (document.querySelector(s)?.innerText || '').replace(/\s+/g, ' ').trim(), sel);
const upload = async (page, file) => { await page.setInputFiles('#bxFile', FIX(file)); };
const rowsOf = page => page.$$eval('#bxBody tr', trs => trs.map(t => ({ cls: t.className, cells: [...t.children].map(c => c.innerText.replace(/\s+/g, ' ').trim()) })));
const waitReady = page => page.waitForFunction(() => BX.phase === 'ready', null, { timeout: 15000 });

console.log('\n══ ① التاب والملفات المرفوضة ══');
let { page, calls, errs } = await open();
is(await page.$eval('#tabBosta', e => e.textContent.trim()) === '🚚 تحصيل بوسطة', 'التاب «🚚 تحصيل بوسطة» موجود');
is(await page.evaluate(() => [...document.querySelectorAll('.main-tab-btn')].map(b => b.id).join()) === 'tabScan,tabBosta,tabLog', 'ترتيب التابات: تحصيل المناديب · تحصيل بوسطة · السجل');
await page.click('#tabBosta');
is(await page.$eval('#panelBosta', e => e.classList.contains('active')) && !(await page.$eval('#panelScan', e => e.classList.contains('active'))), 'فتح التاب بيقفل تاب المناديب');
is(await page.$eval('#panelLog', e => !e.classList.contains('active')), 'ومايفتحش السجل');
await upload(page, 'bosta-wrong-sheet.xlsx'); await sleep(500);
is(/لا يوجد شيت اسمه «Cash Cycles»/.test(await txt(page, '#bxFileErr')), 'شيت باسم غلط ← مرفوض');
is(await page.$eval('#bxTableWrap', e => !e.classList.contains('show')), 'ومفيش جدول');
is(!calls.some(c => c.action === 'bostaValidate'), 'ولا نداء للـ Worker');
await upload(page, 'bosta-two-sheets.xlsx'); await sleep(500);
is(/شيت واحد بس — لقينا 2/.test(await txt(page, '#bxFileErr')), 'شيتين ← مرفوض');
await upload(page, 'bosta-mixed-cashout.xlsx'); await sleep(500);
const mixedTxt = await txt(page, '#bxFileErr');
is(/Cash-out ID مش موحّد/.test(mixedTxt) && /TESTCOD02NOV26/.test(mixedTxt) && /OTHERCOD99/.test(mixedTxt), 'Cash-out ID مختلف ← الملف كله يقف وبيسمّي القيمتين', mixedTxt);
is(!calls.some(c => c.action === 'bostaValidate' || c.action === 'bostaPay'), 'مفيش أي نداء فحص/تسجيل لملف مرفوض');
is(errs.length === 0, 'صفر خطأ في الكونسول', errs.join(' | '));

console.log('\n══ ② فحص ملف سليم الشكل ══');
await upload(page, 'bosta-cash-cycles-sample.xlsx'); await waitReady(page);
is(await txt(page, '#bxFileErr') === '', 'رسالة رفض الملف اتمسحت');
let rows = await rowsOf(page);
is(rows.length === 10, 'عشر صفوف في الجدول', String(rows.length));
const vc = calls.filter(c => c.action === 'bostaValidate');
is(vc.length === 1 && vc[0].body.rows.length === 9, 'نداء فحص واحد بـ9 صفوف (الصف المتكرر ماتبعتش)', JSON.stringify(vc.map(c => c.body.rows.length)));
const ctx = vc[0].body.ctx;
is(ctx.cashOutId === 'TESTCOD02NOV26' && ctx.paidAt === '2026-11-02' && ctx.rowsTotal === 10, 'ctx: Cash-out · Paid At · عدد صفوف الملف كله', JSON.stringify(ctx));
is(ctx.netTotal === '3234.33', 'ctx: مجموع Net Value للملف كله', ctx.netTotal);
is(ctx.payOrders === 8 && ctx.refundOrders === 2, 'ctx: عدّاد التحصيل/الاسترداد', JSON.stringify(ctx));
const row1 = vc[0].body.rows[0];
is(row1.trackingNumber === '7000000001' && row1.orderRef === '#70101' && row1.orderType === 'SEND' && row1.cod === 2675 && row1.online === 0 && row1.netValue === 2538.2 && row1.cashOutId === 'TESTCOD02NOV26' && row1.paidAt === '2026-11-02' && row1.businessId === 'MrQkqmcexcHuuMo7n' && row1.paymentStatus === 'Paid', 'صف الملف اتقرا صح بكل أعمدته', JSON.stringify(row1));
is(vc[0].body.rows.find(r => r.orderRef === '#70105').orderType === 'EXCHANGE', 'Order Type بيوصل للـ Worker بقيمته (EXCHANGE)');
const st = rows.map(r => r.cls.replace('bx-', ''));
is(JSON.stringify(st) === JSON.stringify(['ready', 'ready', 'ready_zero', 'ready', 'ready', 'error', 'error', 'error', 'error', 'error']), 'حالات الصفوف', JSON.stringify(st));
is(/متكرر في الملف \(الصف 2\)/.test(rows[7].cells[9]), 'رقم تتبع متكرر ← خطأ محلي بيذكر الصف', rows[7].cells[9]);
is(/Business ID/.test(rows[6].cells[9]) && /≠ مستحق شوبيفاي/.test(rows[5].cells[9]) && /Net Value/.test(rows[8].cells[9]) && /مش موجود على شوبيفاي/.test(rows[9].cells[9]), 'سبب كل خطأ ظاهر في الجدول');
is(rows[4].cells[7].includes('📋') && rows[4].cells[7].includes('مسجل مسبقاً') && !rows[4].cells[1].includes('📋'), 'عمود «التسجيل المسبق»: الأوردر المسجّل مسبقًا بباج 📋 مسجل مسبقاً (وبلا أيقونة جنب رقم الأوردر)', rows[4].cells[7]);
is(rows[0].cells[7] === 'غير مسجّل' && rows.filter(r => r.cells[7].includes('مسجل مسبقاً')).length === 1, 'باقي الصفوف المفحوصة «غير مسجّل» وصف واحد بس مسجّل مسبقًا', rows.map(r => r.cells[7]).join(' / '));
is(rows[0].cells[3].startsWith('S1') && rows[3].cells[3].startsWith('S2') && rows[4].cells[3].startsWith('S2'), 'SEND = S1 وأي نوع تاني = S2');
is(rows[0].cells[4] === '2,675' && rows[3].cells[4] === '−1,650' && rows[1].cells[4] === '1,850', 'الإجمالي COD+Online (الأونلاين محسوب، والاسترداد بالسالب)', rows.map(r => r.cells[4]).join());
is(rows[0].cells[6] === '2,538.2' || rows[0].cells[6] === '2,538.20', 'Net Value معروض', rows[0].cells[6]);
const sum = await txt(page, '#bxSum');
is(/جاهز للتسجيل 5/.test(sum) && /أخطاء 5/.test(sum), 'الملخص: 5 جاهز · 5 أخطاء', sum);
const runTxt = await txt(page, '#bxRun');
is(/سجّل 5 أوردر/.test(runTxt), 'زرار التسجيل بعدد الجاهز', runTxt);
is(await page.$eval('#bxRun', e => !e.disabled), 'زرار التسجيل مفعّل');
is(/ناقصة في الخزنة/.test(await txt(page, '#bxHint')), 'تلميح: الجلسة هتفضل ناقصة في الخزنة', await txt(page, '#bxHint'));
is(await page.$$eval('#bxTable th .bt-flt', e => e.length) === 10, 'قمع الفلتر على كل الأعمدة العشرة (القسم الموحّد v8.7.0)');
is(await page.evaluate(() => !document.querySelector('.eco-tbl-on,.eco-tbl-bar')), 'مفيش محرّك §TABLE القديم على الجدول (محرّكه الخاص بس)');
is(await page.evaluate(() => !!document.querySelector('#bxBody a.order-link[href*="/admin/orders/101"]')), 'رقم الأوردر لينك لشوبيفاي');

console.log('\n══ ③ التسجيل ══');
await page.click('#bxRun');
const conf = await txt(page, '#confirmBody');
is(await page.$eval('#confirmOverlay', e => e.classList.contains('open')), 'نافذة التأكيد اتفتحت');
is(/Cash-out TESTCOD02NOV26/.test(conf) || /TESTCOD02NOV26/.test(conf), 'التأكيد بيذكر الـ Cash-out', conf);
is(/تحصيل على شوبيفاي \(3\)/.test(conf) && /استرداد على شوبيفاي \(1\)/.test(conf) && /بدون تحصيل.*\(1\)/.test(conf), 'التأكيد بيفصّل: 3 تحصيل · 1 استرداد · 1 بدون تحصيل', conf);
is(/5 صف مش هيتسجّل/.test(conf) && /ناقصة/.test(conf), 'تحذير: 5 صفوف مش هتتسجّل والجلسة ناقصة', conf);
is(/لا يمكن التراجع/.test(conf), 'تحذير «لا يمكن التراجع»');
is(!calls.some(c => c.action === 'bostaPay'), 'مفيش تسجيل قبل التأكيد');
await page.click('#confirmOkBtn');
await page.waitForFunction(() => !window.__bxBusy && document.getElementById('bxResult').className.includes('show'), null, { timeout: 15000 });
const pays = calls.filter(c => c.action === 'bostaPay');
is(pays.length === 5, 'خمس نداءات bostaPay (الجاهز بس)', String(pays.length));
is(JSON.stringify(pays.map(c => c.body.row.orderRef)) === JSON.stringify(['#70101', '#70102', '#70103', '#70104', '#70105']), 'بالترتيب وبالتتابع', JSON.stringify(pays.map(c => c.body.row.orderRef)));
is(pays.every(c => c.body.ctx.cashOutId === 'TESTCOD02NOV26' && c.body.ctx.netTotal === '3234.33' && c.body.ctx.rowsTotal === 10 && c.body.employee === 'Ahmed_Ibraheem'), 'كل نداء فيه ctx الملف كله والموظف');
is(!calls.some(c => c.action === 'pay' || c.action === 'refund'), 'مفيش استخدام لـ pay/refund القديمين');
rows = await rowsOf(page);
is(JSON.stringify(rows.map(r => r.cls.replace('bx-', ''))) === JSON.stringify(['registered', 'registered', 'registered', 'registered', 'registered', 'error', 'error', 'error', 'error', 'error']), 'الصفوف اتحوّلت لـ«تم التسجيل» والأخطاء زي ما هي', JSON.stringify(rows.map(r => r.cls)));
const rb = await page.$eval('#bxResult', e => e.className);
is(rb.includes('show-warn') && /تم جزئيًا/.test(await txt(page, '#bxResultTitle')), 'النتيجة: «تم جزئيًا» (أصفر) لإن فيه أخطاء', rb);
is(/ناقصة في الخزنة/.test(await txt(page, '#bxResultDetail')), 'النتيجة بتقول الجلسة ناقصة في الخزنة');
is(await page.$eval('#bxRun', e => e.disabled), 'زرار التسجيل اتقفل (مفيش جاهز)');

console.log('\n══ ④ إعادة رفع نفس الملف (تكرار) ══');
const before = calls.filter(c => c.action === 'bostaPay').length;
await upload(page, 'bosta-cash-cycles-sample.xlsx'); await waitReady(page);
rows = await rowsOf(page);
is(JSON.stringify(rows.slice(0, 5).map(r => r.cls.replace('bx-', ''))) === JSON.stringify(['done', 'done', 'done', 'done', 'done']), 'الخمسة المسجّلين بيرجعوا «مسجّل سابقًا»', JSON.stringify(rows.map(r => r.cls)));
is(await page.$eval('#bxRun', e => e.disabled), 'ومفيش حاجة جاهزة للتسجيل تاني');
is(calls.filter(c => c.action === 'bostaPay').length === before, 'صفر تسجيل تاني');
is(/مسجّل 5/.test(await txt(page, '#bxSum')), 'الملخص: مسجّل 5', await txt(page, '#bxSum'));
is(errs.length === 0, 'صفر خطأ في الكونسول', errs.join(' | '));
await page.context().close();

console.log('\n══ ⑤ فشل صف وانقطاع اتصال ══');
registered.clear();
({ page, calls, errs } = await open({ payFail: { '#70102': 'الأوردر اتعدّل بعد الفحص — الإجمالي ≠ مستحق شوبيفاي' } }));
await page.click('#tabBosta'); await upload(page, 'bosta-cash-cycles-sample.xlsx'); await waitReady(page);
await page.click('#bxRun'); await page.click('#confirmOkBtn');
await page.waitForFunction(() => !window.__bxBusy && document.getElementById('bxResult').className.includes('show'), null, { timeout: 15000 });
rows = await rowsOf(page);
is(rows[1].cls === 'bx-failed' && /اتعدّل بعد الفحص/.test(rows[1].cells[9]), 'صف رفضه الـ Worker لحظة التسجيل ← «فشل» وبسببه');
is(calls.filter(c => c.action === 'bostaPay').length === 5, 'باقي الصفوف كملت بعد الفشل');
is(rows[0].cls === 'bx-registered' && rows[4].cls === 'bx-registered', 'اللي قبله وبعده اتسجّل');
is(/فشل 1/.test(await txt(page, '#bxResultTitle')), 'العنوان بيعدّ الفشل', await txt(page, '#bxResultTitle'));
await page.context().close();

registered.clear();
({ page, calls, errs } = await open({ payNetwork: '#70103' }));
await page.click('#tabBosta'); await upload(page, 'bosta-cash-cycles-sample.xlsx'); await waitReady(page);
await page.click('#bxRun'); await page.click('#confirmOkBtn');
await page.waitForFunction(() => !window.__bxBusy && document.getElementById('bxResult').className.includes('show'), null, { timeout: 15000 });
rows = await rowsOf(page);
is(rows[2].cls === 'bx-unknown' && /ما اتأكدناش/.test(rows[2].cells[9]), 'انقطاع الاتصال ← «تعذّر» مش «فشل» (الكتابة ممكن تكون تمّت)');
is(calls.filter(c => c.action === 'bostaPay').length === 3, 'الدفعة وقفت عند الصف المشكوك فيه (مفيش صفوف بعده)', String(calls.filter(c => c.action === 'bostaPay').length));
is(rows[3].cls === 'bx-ready' && rows[4].cls === 'bx-ready', 'اللي بعده لسه «جاهز» ماتلمسش');
is(await page.$eval('#bxResult', e => e.className.includes('show-error')) && /التسجيل وقف/.test(await txt(page, '#bxResultTitle')), 'النتيجة حمرا: التسجيل وقف');
is(await page.$eval('#confirmOverlay', e => e.classList.contains('open')) && /أعد رفع نفس الملف/.test(await txt(page, '#confirmBody')), 'نافذة إقرار بتقول: أعد رفع الملف (مش هيتكرر)');
is(await page.evaluate(() => window.__bxBusy) === false, 'علم الدفعة اتفك');

console.log('\n══ ⑥ الحارس والقفل ══');
is(await page.evaluate(() => ECO_HUB.isBusy()) === false, 'ECO_HUB.isBusy فاضي بعد الدفعة');
await page.evaluate(() => { window.__bxBusy = true; });
is(await page.evaluate(() => ECO_HUB.isBusy()) === true, 'ECO_HUB.isBusy true أثناء التسجيل (الخروج التلقائي موقوف)');
await page.evaluate(() => { window.__bxBusy = false; });
is(errs.length === 0, 'صفر خطأ في الكونسول', errs.join(' | '));
await page.context().close();

console.log('\n══ ⑦ السجل: جلسة بوسطة ══');
{
  const ctx2 = await browser.newContext(); const pg = await ctx2.newPage(); const e2 = [];
  pg.on('pageerror', e => e2.push(e.message));
  await pg.addInitScript(([s]) => { sessionStorage.setItem('dco_session', JSON.stringify(s)); localStorage.setItem('delivery_cod_ops_worker_secret', 'S'); }, [SESSION]);
  const mkRow = (id, ref, type, gross, net, extra = {}) => ({ id, timestamp: '2026-11-04T10:00:00.000Z', tool: 'cod_payment', type, employee: 'Ahmed_Ibraheem', order_id: String(id), order_name: ref, value_after: gross, notes: `تحصيل بوسطة — TESTCOD02NOV26`,
    extra: JSON.stringify({ result: 'success', batchId: 'bosta-TESTCOD02NOV26', courier: 'Bosta', courierCollect: net, source: 'bosta_cash_cycle', cashOutId: 'TESTCOD02NOV26', trackingNumber: 't' + id, slot: 'S1', netValue: net.toFixed(2),
      batchExpected: { orders: 3, payOrders: 3, refundOrders: 0, collect: '3000.00', extraShippingTotal: '0.00', net: '3000.00' }, ...extra }) });
  const ENT = [mkRow(1, '#70101', 'payment', 2675, 2538.2), mkRow(3, '#70103', 'payment', 0, -85.82, { noCollection: true })];
  await pg.route('**/cdnjs.cloudflare.com/**/exceljs*', r => r.fulfill({ status: 200, contentType: 'text/javascript', body: fs.readFileSync(EXCEL) }));
  await pg.route('**/*.workers.dev/**', async route => {
    const u = new URL(route.request().url()); const a = u.searchParams.get('action') || '';
    let out = { ok: true, success: true, version: '99.0.0', checks: [], entries: [], values: [], total: 0 };
    if (a === 'get_logs') out = { ok: true, entries: ENT }; if (a === 'get_logs_count') out = { ok: true, total: ENT.length }; if (a === 'getCourierValues') out = { success: true, values: ['Bosta'] };
    await route.fulfill({ status: 200, contentType: 'application/json', headers: { 'Access-Control-Allow-Origin': '*' }, body: JSON.stringify(out) });
  });
  await pg.goto(`${BASE}/COD-Payment-Center.html`); await pg.waitForSelector('#entryInput');
  await pg.click('#tabLog'); await pg.waitForSelector('.log-batch-row', { timeout: 10000 });
  const head = await txt(pg, '.log-batch-row');
  is(/Bosta/.test(head) && /TESTCOD02NOV26/.test(head), 'السجل: جلسة بوسطة بتعرض الـ Cash-out ID', head);
  is(/⚠ −1/.test(head), 'السجل: الجلسة ناقصة (2 من 3) متعلّمة', head);
  await pg.click('.log-batch-row');
  const det = await txt(pg, '.log-detail-row');
  is(/Cash-out ناقص/.test(det) && /موظف الخزنة ما يأكّدش/.test(det), 'السجل: بانر «Cash-out ناقص» بنص بوسطة مش نص المناديب', det.slice(0, 200));
  is(/Net 2,538.2/.test(det) && /Net −85.82/.test(det) && /بدون تحصيل/.test(det), 'السجل: Net لكل أوردر + «بدون تحصيل»', det);
  is(!/مستلَم من المندوب/.test(det), 'السجل: مفيش نص «مستلَم من المندوب» الخاص بالمناديب');
  is(e2.length === 0, 'صفر خطأ في الكونسول', e2.join(' | '));
  await ctx2.close();
}

console.log('\n══ ⑧ القسم الموحّد: جدول الصفوف (html-builder v8.7.0) ══');
{
  const ExcelNode = req(path.resolve(path.dirname(EXCEL), '..'));
  const wb = new ExcelNode.Workbook(), ws = wb.addWorksheet('Cash Cycles');
  ws.addRow(['Business ID', 'Order Id', 'Order Type', 'Order Status', 'Order Reference', 'COD', 'Online Payment Amount', 'Total Fees', 'Flex Ship Amount', 'Net Value', 'Payment Status', 'Paid At', 'Cash-out ID']);
  for (let i = 0; i < 60; i++) {
    const cod = [500, 1099, 1800, 2600, 1650, 750, 2000][i % 7] * (i % 11 === 10 ? -1 : 1), fee = Math.abs(Math.round(cod * 4) / 100);
    ws.addRow(['MrQkqmcexcHuuMo7n', String(9000000000 + i * 13), i % 9 === 8 ? 'EXCHANGE' : 'SEND', 'Delivered', `#${80100 + i}`, cod, 0, fee, 0, Math.round((cod - Math.sign(cod) * fee) * 100) / 100, 'Paid', '2026-08-12', 'WEDCOD12AUG26']);
  }
  const BIG = path.join(os_tmp(), 'bx-big.xlsx'); await wb.xlsx.writeFile(BIG);
  var { page: pg, errs: e8 } = await open(); await pg.click('#tabBosta');
  await pg.setInputFiles('#bxFile', BIG); await waitReady(pg); await sleep(500);
  const nRows = await pg.$$eval('#bxBody tr', t => t.length);
  is(nRows === 60, 'ستين صف اترسموا', String(nRows));
  const unified = await pg.evaluate(() => { const s = document.getElementById('bxTableWrap'); return s.classList.contains('bt-section') && !!s.querySelector(':scope > .bt-bar') && !!s.querySelector(':scope > .bt-chips') && !!s.querySelector('.bt-scroll #bxTable'); });
  is(unified, 'كارت واحد: صف النتائج ← chips ← جدول بسكرول داخلي');
  is(await txt(pg, '#btCount') === '60', '«النتائج» = 60');
  is(await pg.evaluate(() => document.getElementById('btClearAll').classList.contains('inactive')), '«مسح كل الفلاتر» باهت عند التحميل (حالة ١)');
  is(await pg.evaluate(() => !document.querySelector('#bxTable th.flt-on')), 'ولا عمود ملوّن عند التحميل');
  const sticky = await pg.evaluate(() => { const sc = document.getElementById('btScroll'), th = document.querySelector('#bxTable thead th'); const cs = getComputedStyle(th), ss = getComputedStyle(sc); return { pos: cs.position, ov: ss.overflowY, mh: ss.maxHeight, sh: sc.scrollHeight > sc.clientHeight }; });
  is(sticky.pos === 'sticky' && sticky.ov === 'auto' && sticky.sh, 'عناوين sticky جوّه سكرول داخلي والجدول أطول من الكارت', JSON.stringify(sticky));
  await pg.evaluate(() => { document.getElementById('btScroll').scrollTop = 400; });
  const topGap = await pg.evaluate(() => Math.round(document.querySelector('#bxTable thead th').getBoundingClientRect().top - document.getElementById('btScroll').getBoundingClientRect().top));
  is(Math.abs(topGap) <= 2, 'العنوان بيفضل ثابت أعلى الكارت بعد السكرول', String(topGap));
  await pg.evaluate(() => { document.getElementById('btScroll').scrollTop = 0; });
  const fs12 = await pg.evaluate(() => { const th = getComputedStyle(document.querySelector('#bxTable thead th')), td = getComputedStyle(document.querySelector('#bxBody td')); return [th.fontSize, th.fontWeight, td.fontSize, td.fontWeight].join(); });
  is(fs12 === '12px,700,12.5px,600', 'خط الجدول: th 12/700 · td 12.5/600', fs12);
  // — فلتر الحالة: القايمة تفضل مفتوحة بعد أكتر من اختيار (Standards #32)
  await pg.click('[data-btflt="status"]');
  is(await pg.evaluate(() => !!document.querySelector('.bt-pop') && !document.querySelector('.bt-pop').closest('table')), 'القايمة عائمة على body (مش جوّه الجدول)');
  is(await pg.evaluate(() => getComputedStyle(document.querySelector('.bt-pop')).position === 'fixed' && getComputedStyle(document.querySelector('.bt-pop')).zIndex === '200'), 'القايمة fixed بـ z-index 200');
  await pg.click('.bt-pop .bt-item >> nth=0'); await pg.click('.bt-pop .bt-item >> nth=1');
  is(await pg.evaluate(() => !!document.querySelector('.bt-pop')), 'القايمة فضلت مفتوحة بعد اختيارين ورا بعض');
  is(await pg.$$eval('.bt-pop .bt-item.on', e => e.length) === 2, 'اتعلّم الاتنين');
  is(await pg.evaluate(() => document.getElementById('btClearAll').classList.contains('inactive')) === false, '«مسح كل الفلاتر» اتفعّل (حالة ٢)');
  is(await pg.evaluate(() => document.querySelector('#bxTable th[data-fk="status"]').classList.contains('flt-on')), 'عمود الحالة ملوّن بالعدّاد');
  await pg.keyboard.press('Escape');
  is(await pg.evaluate(() => !document.querySelector('.bt-pop')), 'Escape بيقفل القايمة');
  const chipsTxt = await txt(pg, '#btChips');
  is(/^الحالة:/.test(chipsTxt) && (chipsTxt.match(/الحالة:/g) || []).length === 1, 'chips: سطر للفلتر واسمه مرة واحدة', chipsTxt);
  await pg.hover('[data-btflt="status"]');
  { const bb = await pg.evaluate(() => { const r = document.querySelector('[data-btflt="status"]').getBoundingClientRect(); return [r.x + r.width / 2, r.y + r.height / 2]; }); await pg.mouse.move(bb[0] - 20, bb[1]); await pg.mouse.move(bb[0], bb[1], { steps: 5 }); await sleep(100); }   // hover() بيعمل scroll وممكن يتشال التلميح — فحركة ماوس حقيقية بعدها
  is(await pg.evaluate(() => !!document.querySelector('.bt-tip') && document.querySelector('.bt-tip').textContent.includes('،')), 'tooltip بقيم الفلتر المفعّل');
  await pg.hover('[data-btflt="type"]');
  is(await pg.evaluate(() => !document.querySelector('.bt-tip')), 'مفيش tooltip على عمود مفيهوش فلتر');
  await pg.click('[data-btflt="status"]'); await pg.click('.bt-pop .bt-item >> nth=1'); await pg.keyboard.press('Escape');   // نشيل التاني ← فلتر بقيمة واحدة
  const cnt = +(await txt(pg, '#btCount')), of = await txt(pg, '#btOf');
  is(cnt === (await pg.$$eval('#bxBody tr', t => t.length)) && /من 60/.test(of), 'النتائج = الصفوف المعروضة + «من 60 صف»', `${cnt} ${of}`);
  await pg.click('#btClearAll');
  is(await txt(pg, '#btCount') === '60' && await pg.evaluate(() => document.getElementById('btClearAll').classList.contains('inactive') && !document.querySelector('#bxTable th.flt-on')), 'مسح كل الفلاتر بيرجّع الحالة ١ بالظبط');
  // — عدّاد الملخّص = فلتر الحالة
  const errN = +(await pg.$eval('[data-btcard="err"] b', e => e.textContent));
  await pg.click('[data-btcard="err"]');
  is(await txt(pg, '#btCount') === String(errN) && await pg.$eval('[data-btcard="err"]', e => e.classList.contains('on')), `ضغطة عدّاد «أخطاء» بتفلتر الجدول (${errN})`);
  is(await pg.$$eval('#bxBody tr', t => t.every(r => r.classList.contains('bx-error'))), 'وكل الصفوف المعروضة أخطاء');
  await pg.click('[data-btcard="err"]');
  is(await txt(pg, '#btCount') === '60', 'الضغطة التانية بتلغيه');
  // — فلتر رقمي: نطاق ← قايمة (متبادلين والتاني باهت لكن قابل للضغط)
  await pg.click('[data-btflt="gross"]'); await pg.fill('#btRf', '1500'); await sleep(100);
  const gt = await pg.$$eval('#bxBody tr td:nth-child(5)', t => t.map(x => Number(x.innerText.replace(/[^\d.\-−]/g, '').replace('−', '-'))));
  is(gt.length > 0 && gt.every(v => v >= 1500), 'نطاق «من 1500» بيفلتر الإجمالي', JSON.stringify(gt.slice(0, 6)));
  is(await pg.evaluate(() => document.querySelector('[data-btsec="list"]').classList.contains('dim') && !document.querySelector('[data-btsec="list"] .bt-item').closest('[inert]')), 'قايمة القيم باهتة لكن قابلة للضغط');
  await pg.click('[data-btsec="list"] .bt-item >> nth=0');
  is(await pg.evaluate(() => document.getElementById('btRf').value === '' && document.querySelector('[data-btsec="range"]').classList.contains('dim')), 'اختيار قيمة بيمسح النطاق والتبادل بيتعكس');
  await pg.keyboard.press('Escape'); await pg.click('#btClearAll');
  // — فلتر النص بتوكنز + اقتراحات
  await pg.click('[data-btflt="order"]'); await pg.keyboard.type('8010');
  const sg = await pg.$$eval('.bt-pop [data-btsg]', e => e.length);
  is(sg > 0 && sg <= 10, 'اقتراحات لايف (≤ 10) مع الكتابة', String(sg));
  await pg.keyboard.press('Enter'); await sleep(80);
  is(await pg.evaluate(() => !!document.querySelector('.bt-pop')) && await pg.$$eval('.bt-pop .bt-chip', e => e.length) === 1, 'Enter بيضيف توكن والقايمة تفضل مفتوحة');
  await pg.keyboard.type('80155'); await pg.keyboard.press('Enter'); await sleep(80);
  is(await txt(pg, '#btCount') === '11', 'توكنين = «أو» (10 + 1)', await txt(pg, '#btCount'));
  await pg.keyboard.press('Enter'); await sleep(80);
  is(await pg.evaluate(() => !document.querySelector('.bt-pop')), 'Enter على حقل فاضي بيقفل القايمة والفلتر يفضل');
  is(await txt(pg, '#btCount') === '11', 'والفلتر لسه مطبّق');
  await pg.click('#btClearAll');
  // — الترتيب: 3 حالات والأيقونة عند التفعيل بس
  is(await pg.$$eval('.bt-sort.active', e => e.length) === 0, 'مفيش سهم ترتيب قبل أول ضغطة');
  const netCol = () => pg.$$eval('#bxBody tr td:nth-child(7)', t => t.map(x => Number(x.innerText.replace(/,/g, '').replace('−', '-'))));
  await pg.click('[data-btsort="net"]'); let nv = await netCol();
  is(nv.every((v, i) => i === 0 || nv[i - 1] <= v) && await txt(pg, '[data-fk="net"] .bt-sort') === '▲', 'ضغطة ١: تصاعدي بالقيمة الرقمية + ▲', nv.slice(0, 4).join());
  await pg.click('[data-btsort="net"]'); nv = await netCol();
  is(nv.every((v, i) => i === 0 || nv[i - 1] >= v) && await txt(pg, '[data-fk="net"] .bt-sort') === '▼', 'ضغطة ٢: تنازلي + ▼');
  await pg.click('[data-btsort="net"]');
  is(await pg.$$eval('.bt-sort.active', e => e.length) === 0 && (await pg.$$eval('#bxBody tr td:first-child', t => t.map(x => +x.innerText))).every((v, i, a) => i === 0 || a[i - 1] < v), 'ضغطة ٣: بلا ترتيب (ترتيب الملف الأصلي)');
  await pg.click('[data-btsort="net"]'); await pg.click('[data-btflt="status"]'); await pg.click('.bt-pop .bt-item >> nth=0'); await pg.keyboard.press('Escape');
  is(await pg.evaluate(() => document.querySelector('[data-fk="net"]').classList.contains('sorted')), 'الترتيب شغّال مع الفلتر');
  await pg.click('#btClearAll');
  is(await pg.evaluate(() => document.querySelector('[data-fk="net"]').classList.contains('sorted')), 'والترتيب بيفضل بعد «مسح كل الفلاتر» (مستقل)');
  await pg.click('[data-btsort="net"]'); await pg.click('[data-btsort="net"]');
  // — طي الجدول
  await pg.click('#btBar');
  is(await pg.evaluate(() => document.getElementById('btWrap').classList.contains('collapsed')), 'الضغط على صف النتائج بيطوي الجدول');
  await pg.click('#btClearAll', { force: true }).catch(() => {});
  is(await pg.evaluate(() => document.getElementById('btWrap').classList.contains('collapsed')), 'وزرار المسح مابيطويش (stopPropagation)');
  await pg.click('#btBar');
  // — عرض الأعمدة
  const cw = () => pg.$eval('#btCg col[data-c="order"]', c => Math.round(parseFloat(c.style.width)));
  const w0 = await cw(); const hb = await pg.$eval('[data-btrz="order"]', e => { const r = e.getBoundingClientRect(); return [r.x + r.width / 2, r.y + r.height / 2]; });
  await pg.mouse.move(hb[0], hb[1]); await pg.mouse.down(); await pg.mouse.move(hb[0] - 60, hb[1], { steps: 5 }); await pg.mouse.up(); await sleep(150);
  const w1 = await cw();
  is(w1 > w0, 'سحب المقبض لليسار (RTL) بيوسّع العمود', `${w0} → ${w1}`);
  const sumOk = await pg.evaluate(() => { const t = document.getElementById('bxTable'), sc = document.getElementById('btScroll'); return Math.abs(t.getBoundingClientRect().width - sc.clientWidth) <= 2 && sc.scrollWidth <= sc.clientWidth + 1; });
  is(sumOk, 'الجدول مالي عرض الكارت من غير فراغ ولا سكرول أفقي');
  is(await pg.evaluate(() => !!JSON.parse(localStorage.getItem('dco_col_widths_v2_COD-Payment-Center.html_bosta') || 'null')), 'العرض اتحفظ في localStorage');
  await pg.dblclick('[data-btrz="status"]'); await sleep(100);
  is(await pg.evaluate(() => Object.values(document.querySelectorAll('#btCg col')).every(c => parseFloat(c.style.width) >= 64)), 'دبل كليك = ضبط تلقائي في الحدود');
  // — مربع الرفع بعد التحميل
  is(await pg.evaluate(() => document.getElementById('bxDrop').classList.contains('compact')), 'مربع الرفع اتحوّل لشريط مضغوط بعد التحميل');
  is(await txt(pg, '#bxDropTitle') === 'bx-big.xlsx' && /60 صف/.test(await txt(pg, '#bxDropSub')), 'الشريط بيعرض اسم الملف وعدد الصفوف');
  is(await pg.evaluate(() => ![...document.querySelectorAll('#panelBosta input,#panelBosta textarea')].some(i => i.hasAttribute('placeholder')) && !document.querySelector('.bt-pop [placeholder]')), 'مفيش placeholder في التاب');
  is(await pg.evaluate(() => !document.querySelector('#bxSum [style*="#"]') && !/#[0-9a-fA-F]{3,6}\b/.test(document.querySelector('style:last-of-type')?.textContent.split('§BOSTA-CSS')[1] || '')), 'صفر hex حرفي في CSS التاب');
  is(await pg.evaluate(() => !document.getElementById('bxNew')), 'زرار «ملف تاني» اتشال');
  is(/استبدال الملف/.test(await txt(pg, '#bxDropCta')) && await pg.evaluate(() => { const c = document.getElementById('bxDropCta'); const st = getComputedStyle(c); return !!c.querySelector('svg') && st.borderTopColor === getComputedStyle(document.documentElement).getPropertyValue('--red') || st.borderTopColor.startsWith('rgb(2') || st.borderTopColor.startsWith('rgb(1'); }), 'زرار «استبدال الملف» بأيقونة وإطار أحمر');
  await pg.click('#bxDrop'); await sleep(100);
  is(await pg.$eval('#confirmOverlay', e => e.classList.contains('open')) && /استبدال الملف/.test(await txt(pg, '#confirmHeader')), 'ضغطة «استبدال الملف» بتفتح نافذة تأكيد');
  await pg.click('#confirmCancelBtn'); await sleep(100);
  is(await pg.evaluate(() => document.getElementById('bxDrop').classList.contains('compact')) && await txt(pg, '#bxDropTitle') === 'bx-big.xlsx', 'إلغاء التأكيد: الملف والجدول زي ما هم');
  // عدّاد «مسجل مسبقاً» = فلتر عمود التسجيل المسبق
  const preN = +(await pg.$eval('[data-btpre] b', e => e.textContent));
  await pg.click('[data-btpre]');
  is(await txt(pg, '#btCount') === String(preN) && await pg.$eval('[data-btpre]', e => e.classList.contains('on')), `عدّاد «مسجل مسبقاً» بيفلتر الجدول (${preN})`);
  await pg.click('[data-btpre]');
  is(e8.length === 0, 'صفر خطأ في الكونسول', e8.join(' | '));
  // — موبايل: صفر سكرول أفقي للصفحة
  await pg.setViewportSize({ width: 390, height: 844 });
  await pg.setInputFiles('#bxFile', BIG); await waitReady(pg); await sleep(500);
  is(await pg.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1), 'موبايل 390px: مفيش سكرول أفقي للصفحة', await pg.evaluate(() => document.documentElement.scrollWidth + '>' + innerWidth));
}
function os_tmp() { return process.env.TMPDIR || '/tmp'; }

await browser.close(); server.close();
console.log(`\n${fail ? '❌' : '✅'} ${pass} عدّى · ${fail} فشل`);
process.exit(fail ? 1 : 0);
