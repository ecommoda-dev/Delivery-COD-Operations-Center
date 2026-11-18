// docs/cod-partial-check.mjs — فحص تاب «استرداد جزئي بوسطة» (v1.95.0 · Worker ≥ 3.19.0) — متصفح فعلي + Worker وهمي
//   npm i playwright --no-save && node docs/cod-partial-check.mjs        (PW_CHROMIUM لو كروميوم مثبّت مسبقًا)
// الـ Worker الوهمي بيرجّع ردود بشكل الـ Worker الحقيقي (v3.19.0) — منطق الحساب نفسه مفحوص في ريبو COD-Payment-Center (`bosta-partial-check.mjs`).
// اللي بنقيسه هنا: الواجهة بتعرض الحالات صح، وبتبعت العقد الصح (expected · paymentMethods · paymentAccounts · ack · reason)، وبتتصرف صح مع ردود الرفض والانقطاع.
import http from 'node:http'; import fs from 'node:fs'; import path from 'node:path'; import { fileURLToPath } from 'node:url';
import { chromium } from 'playwright';
const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
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
const SESSION = { v: 1, username: 'Ahmed_Ibraheem', displayName: 'Ahmed Ibraheem', loginAt: '2026-11-15T08:00:00.000Z' };

// ── بيانات الطابور (أرقام حقيقية من D1/شوبيفاي 15-11-2026) ──
const base = { bostaCap: '2000.00', bostaRegistered: false, uploads: [], blockers: [], warnings: [], needsReason: false, existing: null, registered: null };
const IT = {
  '#63994': { ...base, orderId: '19103443747138', orderName: '#63994', tracking: '4962164025', kind: 'return', uploadedAt: '2026-11-15T08:23:40.000Z', s1: 'Delivered', s2: 'In-Return', courier: 'Bosta', owed: '2500.00', remainder: '500.00', max: '500.00', codRemainder: '500.00', state: 'ready' },
  '#54860': { ...base, orderId: '18915406741826', orderName: '#54860', tracking: '3021158862', kind: 'return', uploadedAt: '2026-09-21T09:17:00.000Z', s1: 'Delivered', s2: 'Returned', courier: 'Bosta', owed: '2500.00', remainder: '500.00', max: '500.00', codRemainder: '500.00', state: 'ready',
    warnings: ['الشحنة رجعت (Returned) — العميل غالبًا أخد الباقي فعلًا من خارج الأداة. تأكد قبل ما تسجّل.'] },
  '#57634': { ...base, orderId: '18916431233346', orderName: '#57634', tracking: '3151078493', kind: 'exchange', uploadedAt: '2026-10-07T14:07:00.000Z', s1: 'Delivered', s2: 'In-Return', courier: 'Bosta', owed: '3000.00', remainder: '1000.00', max: '1000.00', codRemainder: '500.00', state: 'ready', needsReason: true,
    warnings: ['الباقي الحالي (1000.00) غير المسجّل وقت الرفع (500.00) — لازم تكتب السبب'] },
  '#60015': { ...base, orderId: '18936740217154', orderName: '#60015', tracking: '5513537751', kind: 'return', uploadedAt: '2026-10-15T06:56:00.000Z', s1: 'Delivered', s2: 'In-Return', courier: 'Bosta', owed: '2000.00', remainder: '0.00', max: '0.00', codRemainder: '700.00', state: 'exists',
    existing: { refundId: 'gid://shopify/Refund/777', amount: '700.00' } },
  '#57212': { ...base, orderId: '18913144832322', orderName: '#57212', tracking: '7845456495', kind: 'return', uploadedAt: '2026-10-01T07:47:00.000Z', s1: 'Shipped', s2: 'In-Return', courier: 'Bosta', owed: '2500.00', remainder: '500.00', max: null, codRemainder: '500.00', state: 'blocked',
    blockers: ['S1 = «Shipped» — لازم Delivered'] },
  '#59971': { ...base, orderId: '18936444617026', orderName: '#59971', tracking: '8072182999', kind: 'return', uploadedAt: '2026-10-14T12:25:00.000Z', s1: 'Delivered', s2: 'In-Return', courier: 'Bosta', owed: '0.00', remainder: '0.00', max: null, codRemainder: '500.00', state: 'done', registered: { at: '2026-11-14 10:00' } },
};
const ORDER = ['#63994', '#54860', '#57634', '#60015', '#57212', '#59971'];
// أوردرات مضافة يدويًا من خارج الطابور (Worker ≥ 3.21.0: `manual:true` → رفعة افتراضية برقم S2 من شوبيفاي · kind='manual' · codRemainder=null)
const MAN = {
  '#70001': { success: true, ...base, orderId: '70001', orderName: '#70001', tracking: '9090909090', kind: 'manual', manual: true, uploadedAt: null, s1: 'Delivered', s2: 'In-Return', courier: 'Bosta', owed: '2500.00', remainder: '500.00', codRemainder: null, max: '500.00', state: 'ready',
    warnings: ['أوردر مضاف يدويًا — مش من سجل «رفع بوسطة» (مفيش رفعة مقصوصة مسجّلة)، فالباقي بيتحسب من المستحق الحالي على شوبيفاي بس. راجع الأرقام قبل التسجيل.'] },
  '#70003': { success: true, ...base, orderId: '70003', orderName: '#70003', tracking: '9090909091', kind: 'manual', manual: true, uploadedAt: null, s1: 'Shipped', s2: 'In-Return', courier: 'Bosta', owed: '2500.00', remainder: '500.00', codRemainder: null, state: 'blocked',
    blockers: ['S1 = «Shipped» — لازم Delivered'] },
};
MAN['#70002'] = { success: false, error: 'الأوردر مفيهوش رقم تتبع S2 على شوبيفاي (bosta_tracking_number_s2) — مش هينفع يتسجّل استرداد جزئي بوسطة من غير رقم الشحنة' };
const pub = n => { const { max, ...x } = IT[n]; return x; };

async function open({ payRes = null, payAbort = false, listAfterPay = null } = {}) {
  const ctx = await browser.newContext(); const page = await ctx.newPage(); const calls = [], errs = [];
  page.on('pageerror', e => errs.push(e.message + ' @ ' + String(e.stack).split('\n').slice(1, 3).join(' ; ')));
  page.on('console', m => { if (m.type() === 'error' && !/Failed to load resource/.test(m.text())) errs.push(m.text()); });
  await page.addInitScript(([s]) => { sessionStorage.setItem('dco_session', JSON.stringify(s)); localStorage.setItem('delivery_cod_ops_worker_secret', 'S'); }, [SESSION]);
  await page.route('**/cdnjs.cloudflare.com/**', route => route.fulfill({ status: 200, contentType: 'text/javascript', body: '' }));
  let paid = false;
  await page.route('**/*.workers.dev/**', async route => {
    const rq = route.request(); let body = null; try { body = rq.postData() ? JSON.parse(rq.postData()) : null; } catch {}
    const action = new URL(rq.url()).searchParams.get('action') || (body && body.action) || '';
    calls.push({ action, body });
    let out = { ok: true, success: true, version: '99.0.0', checks: [], entries: [], orders: [], employees: [], values: [], results: [], total: 0 };
    if (action === 'getCourierValues') out = { success: true, values: ['Bosta'] };
    if (action === 'bostaPartialList') {
      const items = ORDER.map(n => (paid && listAfterPay && listAfterPay[n]) ? { ...pub(n), ...listAfterPay[n] } : pub(n));
      out = { success: true, items, counts: {}, truncated: false, total: items.length, cap: '2000.00' };
    }
    if (action === 'bostaPartialCheck') {
      const n = (body.orderRef.startsWith('#') ? body.orderRef : '#' + body.orderRef);
      out = IT[n] ? { success: true, ...IT[n] } : (body.manual === true && MAN[n]) ? (paid && listAfterPay && listAfterPay[n] ? { ...MAN[n], ...listAfterPay[n] } : MAN[n]) : { success: false, error: body.manual === true ? 'الأوردر ' + n + ' مش موجود على شوبيفاي' : 'مش موجود' };
    }
    if (action === 'bostaPartialPay') {
      if (payAbort) return route.abort('connectionreset');
      paid = !payRes || payRes.success === true;
      out = payRes || { success: true, status: 'success', actions: [], amount: '500.00', courier: 'Ahmed Ibraheem', refund: { created: true, id: 'gid://shopify/Refund/9001', amount: '500.00', owedAfter: '2000.00' }, logged: true };
    }
    route.fulfill({ status: 200, contentType: 'application/json', headers: { 'access-control-allow-origin': '*' }, body: JSON.stringify(out) });
  });
  await page.goto(`${BASE}/COD-Payment-Center.html`);
  await page.waitForSelector('#tabBpr');
  return { page, calls, errs, ctx };
}
const rowOf = (page, name) => page.locator('#bprBodyRows tr[data-oid]', { hasText: name });
const modalText = page => page.locator('#bprModalBody').innerText();

console.log('══ ① التاب والطابور ══');
{
  const { page, calls, errs, ctx } = await open();
  is(await page.locator('#tabBpr').count() === 1 && (await page.locator('#tabBpr').innerText()).includes('استرداد جزئي بوسطة'), 'تاب «استرداد جزئي بوسطة» موجود بين تحصيل بوسطة وسجل العمليات');
  is(await page.evaluate(() => [...document.querySelectorAll('.main-tab-btn')].map(b => b.id).join()) === 'tabScan,tabBosta,tabBpr,tabLog', 'ترتيب التابات: المناديب · بوسطة · استرداد جزئي · السجل');
  is(!calls.some(c => c.action === 'bostaPartialList'), 'مفيش نداء للطابور قبل فتح التاب (تحميل كسول)');
  await page.click('#tabBpr'); await page.waitForSelector('#bprBodyRows tr[data-oid]');
  is(calls.filter(c => c.action === 'bostaPartialList').length === 1, 'فتح التاب نادى bostaPartialList مرة واحدة');
  is(await page.locator('#panelBpr.active').count() === 1 && await page.locator('#panelScan.active').count() === 0, 'اللوحة اتفتحت والتانية اتقفلت');
  is(await page.locator('#bprBodyRows tr[data-oid]').count() === 4, '4 صفوف بس: الجاهز للتسجيل + «على شوبيفاي» (الموقوف والمسجّل مابيظهروش)');
  is((await page.locator('#tabBadgeBpr').innerText()) === '4' && await page.locator('#tabBadgeBpr').isVisible(), 'بادج التاب = جاهز + على شوبيفاي (4)');
  is(await page.locator('#bprChips, [data-bpcard]').count() === 0, 'عدّادات الحالة فوق الجدول اتشالت (الجدول للجاهز بس)');
  const a = await rowOf(page, '#63994').innerText();
  is(/4962164025/.test(a) && /2,500/.test(a) && /500/.test(a) && /Delivered/.test(a) && /In-Return/.test(a) && /جاهز للتسجيل/.test(a), 'صف #63994: التتبع · المستحق · الباقي · S1/S2 · الحالة', a);
  is(await rowOf(page, '#63994').locator('a[href*="business.bosta.co/orders/4962164025"]').count() === 1, 'رقم التتبع لينك لداشبورد بوسطة');
  is(/استبدال/.test(await rowOf(page, '#57634').innerText()), 'الاستبدال متعلّم «استبدال»');
  is(/رجعت \(Returned\)/.test(await rowOf(page, '#54860').innerText()), 'تحذير Returned ظاهر على الصف');
  is(await rowOf(page, '#54860').locator('td.bpr-stc').count() === 1 && /رجعت \(Returned\)/.test(await rowOf(page, '#54860').locator('td.bpr-stc').innerText()) && !/رجعت/.test(await rowOf(page, '#54860').locator('td:has(.bpr-st)').first().innerText()), 'التحذير في عمود «ملحوظات» والحالة لوحدها (بادج بس)');
  is(await rowOf(page, '#57212').count() === 0 && await rowOf(page, '#59971').count() === 0, 'الموقوف (#57212) والمسجّل (#59971) مش في الجدول');
  { const hs = (await page.locator('#bprTable thead th').allInnerTexts()).map(x => x.replace(/\s+/g, '')).join('|'); is(hs.includes('الحالة|ملحوظات|إجراء'), 'عمودا «الحالة» و«ملحوظات» منفصلين', hs); }
  is(await rowOf(page, '#60015').locator('[data-bpro]').count() === 1 && /سجّل في السجل/.test(await rowOf(page, '#60015').locator('[data-bpro]').innerText()), '«على شوبيفاي»: زرار «سجّل في السجل»');
  await page.click('#bprRefresh'); await sleep(200);
  is(calls.filter(c => c.action === 'bostaPartialList').length === 2, 'زرار «تحديث» بيجيب الطابور تاني');
  is(!calls.some(c => ['bostaPartialPay', 'bostaPay', 'bostaPayS1', 'pay', 'refund'].includes(c.action)), 'العرض ما كتبش حاجة');
  is(errs.length === 0, 'صفر خطأ في الكونسول', errs.join(' | '));
  await ctx.close();
}

console.log('══ ② التسجيل الأساسي #63994 ══');
{
  const { page, calls, errs, ctx } = await open({ listAfterPay: { '#63994': { state: 'done', registered: { at: '2026-11-15 12:00' } } } });
  await page.click('#tabBpr'); await page.waitForSelector('#bprBodyRows tr[data-oid]');
  await rowOf(page, '#63994').locator('[data-bpro]').click();
  await page.waitForSelector('#bprMeter');
  const chk = calls.find(c => c.action === 'bostaPartialCheck');
  is(chk && chk.body.orderRef === '#63994' && chk.body.trackingNumber === '4962164025', 'الفحص اتنادى بالأوردر ورقم التتبع', JSON.stringify(chk && chk.body));
  const t = await modalText(page);
  is(/2,500/.test(t) && /2,000/.test(t) && /500/.test(t), 'النافذة بتعرض المستحق 2,500 · حد بوسطة 2,000 · الباقي 500', t.slice(0, 300));
  is(/استرداد 500 ج على شوبيفاي/.test(t) && /Ahmed Ibraheem/.test(t), 'تنبيه الاسترداد على شوبيفاي باسم الموظف (بمسافة)');
  is(await page.locator('#bprGo').isDisabled(), 'زرار التسجيل مقفول في الأول');
  is(await page.locator('[data-bptog^="cash"]').count() === 0 && (await page.locator('.bpr-paycols .pay-col').count()) === 2, 'طرق الدفع انستاباي ومحفظة بس (مفيش نقدي)');
  { const mt = await page.locator('#bprModalBody').innerText();
    is(/-2,500/.test(mt) && /-2,000/.test(mt) && /-500/.test(mt), 'المربعات بالسالب (المستحق · حد بوسطة · الباقي)', mt.slice(0, 300));
    is(!/لسه ما اتسجّلش/.test(mt) && (await page.locator('.bpr-cell').count()) === 3, 'مربع «جزء بوسطة (لسه ما اتسجّلش)» اتشال (3 مربعات بس)'); }
  is((await page.locator('#bprMLbl').innerText()) === 'المتبقي' && (await page.locator('#bprRem').innerText()) === '-500', 'العدّاد: المتبقي 500');
  await page.click('[data-bptog="instapay:فادي"]'); await page.waitForSelector('[data-bpin="instapay:فادي"]');
  await page.fill('[data-bpin="instapay:فادي"]', '٣٠٠'); is(await page.inputValue('[data-bpin="instapay:فادي"]') === '-300', 'الأرقام العربي بتتحوّل في خانة المبلغ');
  is((await page.locator('#bprRem').innerText()) === '-200', 'المتبقي 200 بعد 300 انستاباي');
  await page.click('#bprAck'); is(await page.locator('#bprGo').isDisabled(), 'مقفول: إقرار بس والمبلغ ناقص');
  await page.click('[data-bptog="wallet:إسلام"]'); await page.waitForSelector('[data-bpin="wallet:إسلام"]');
  await page.click('[data-bprest="wallet:إسلام"]');
  is(await page.inputValue('[data-bpin="wallet:إسلام"]') === '-200', 'زرار «الباقي» بيملا 200');
  is((await page.locator('#bprMLbl').innerText()).includes('مظبوط'), 'العدّاد «مظبوط ✓»');
  is(await page.locator('#bprGo').isEnabled(), 'الزرار اتفتح: المبلغ مظبوط + إقرار');
  await page.fill('[data-bpin="wallet:إسلام"]', '250'); is(await page.locator('#bprGo').isDisabled() && (await page.locator('#bprMLbl').innerText()) === 'زيادة', 'زيادة عن الباقي → مقفول');
  await page.fill('[data-bpin="wallet:إسلام"]', '200');
  await page.click('#bprAck'); is(await page.locator('#bprGo').isDisabled(), 'شيل الإقرار → مقفول'); await page.click('#bprAck');
  is(await page.locator('#bprGo').isEnabled(), 'الإقرار تاني → مفتوح');
  await page.click('#bprGo');
  await page.waitForFunction(() => !document.getElementById('bprOverlay').classList.contains('open'));
  const pay = calls.find(c => c.action === 'bostaPartialPay'); const b = pay && pay.body;
  is(!!b && b.orderRef === '#63994' && b.trackingNumber === '4962164025' && b.employee === 'Ahmed_Ibraheem' && b.ack === true, 'نداء bostaPartialPay: الأوردر · التتبع · الموظف · الإقرار', JSON.stringify(b));
  is(b && JSON.stringify(b.expected) === JSON.stringify({ remainder: '500.00', owed: '2500.00', s2: 'In-Return' }), 'expected = الباقي · المستحق · S2 زي ما الفحص عرضهم', JSON.stringify(b && b.expected));
  is(b && JSON.stringify(b.paymentMethods) === JSON.stringify({ instapay: '300.00', wallet: '200.00' }) && !('cash' in b.paymentMethods), 'paymentMethods انستاباي + محفظة بلا نقدي', JSON.stringify(b && b.paymentMethods));
  is(b && JSON.stringify(b.paymentAccounts) === JSON.stringify({ instapay: { 'فادي': '300.00' }, wallet: { 'إسلام': '200.00' } }), 'paymentAccounts بالحسابات', JSON.stringify(b && b.paymentAccounts));
  is(b && b.reason === undefined, 'بلا سبب لما الباقي = المسجّل وقت الرفع');
  await sleep(300);
  is(calls.filter(c => c.action === 'bostaPartialList').length === 2, 'الطابور اتحدّث بعد النجاح');
  is(/تم التسجيل/.test(await rowOf(page, '#63994').innerText()), '#63994 بقت «تم التسجيل»');
  is(await page.evaluate(() => !window.__bxBusy), 'علم «مشغول» اتفك بعد التسجيل');
  is(calls.filter(c => c.action === 'bostaPartialPay').length === 1, 'نداء كتابة واحد بس');
  is(!calls.some(c => ['bostaPay', 'bostaPayS1', 'pay', 'refund'].includes(c.action)), 'ولا أي مسار كتابة تاني');
  is(errs.length === 0, 'صفر خطأ في الكونسول', errs.join(' | '));
  await ctx.close();
}

console.log('══ ③ سبب إجباري · على شوبيفاي · Returned ══');
{
  const { page, calls, ctx } = await open();
  await page.click('#tabBpr'); await page.waitForSelector('#bprBodyRows tr[data-oid]');
  await rowOf(page, '#57634').locator('[data-bpro]').click(); await page.waitForSelector('#bprMeter');
  is(await page.locator('#bprReason').count() === 1 && /غير المسجّل وقت الرفع/.test(await modalText(page)), 'الباقي ≠ المسجّل → خانة السبب ظاهرة بالرقمين');
  await page.click('[data-bptog="instapay:مُرسل"]'); await page.waitForSelector('[data-bpin="instapay:مُرسل"]'); await page.click('[data-bprest="instapay:مُرسل"]');
  await page.click('#bprAck'); is(await page.locator('#bprGo').isDisabled(), 'بلا سبب → مقفول رغم المبلغ والإقرار');
  await page.fill('#bprReason', 'ab'); is(await page.locator('#bprGo').isDisabled(), 'سبب أقل من 3 حروف → مقفول');
  await page.fill('#bprReason', 'العميل رجّع قطعة زيادة'); is(await page.locator('#bprGo').isEnabled(), 'سبب صالح → مفتوح');
  await page.click('[data-bptog="instapay:مُرسل"]'); is(await page.locator('#bprReason').inputValue() === 'العميل رجّع قطعة زيادة', 'السبب بيفضل بعد إعادة رسم البلاطات');
  await page.click('[data-bptog="instapay:مُرسل"]'); await page.click('[data-bprest="instapay:مُرسل"]');
  await page.click('#bprGo'); await page.waitForFunction(() => !document.getElementById('bprOverlay').classList.contains('open'));
  const b = calls.find(c => c.action === 'bostaPartialPay').body;
  is(b.reason === 'العميل رجّع قطعة زيادة' && b.expected.remainder === '1000.00' && b.paymentMethods.instapay === '1000.00', 'السبب والباقي 1000 اتبعتوا', JSON.stringify(b));
  await page.close(); await ctx.close();
}
{
  const { page, calls, ctx } = await open();
  await page.click('#tabBpr'); await page.waitForSelector('#bprBodyRows tr[data-oid]');
  await rowOf(page, '#60015').locator('[data-bpro]').click(); await page.waitForSelector('#bprMeter');
  const t = await modalText(page);
  is(/بدون استرداد جديد/.test(t) && /700/.test(t) && /777/.test(t), 'على شوبيفاي: بيقول «بدون استرداد جديد» ومبلغ الاسترداد الموجود 700');
  is((await page.locator('.bpr-cell.big small').innerText()).includes('الاسترداد الموجود'), 'الخانة الكبيرة = الاسترداد الموجود');
  await page.click('[data-bptog="wallet:فادي"]'); await page.waitForSelector('[data-bpin="wallet:فادي"]'); await page.click('[data-bprest="wallet:فادي"]'); await page.click('#bprAck');
  is(await page.inputValue('[data-bpin="wallet:فادي"]') === '-700' && await page.locator('#bprGo').isEnabled(), 'المبلغ المطلوب 700 (مش الباقي المحسوب 0)');
  is(/سجّل في السجل/.test(await page.locator('#bprAck').innerText()), 'نص الإقرار «سجّل في السجل»');
  await page.close(); await ctx.close();
}
{
  const { page, ctx } = await open();
  await page.click('#tabBpr'); await page.waitForSelector('#bprBodyRows tr[data-oid]');
  await rowOf(page, '#54860').locator('[data-bpro]').click(); await page.waitForSelector('#bprMeter');
  is(/رجعت \(Returned\)/.test(await modalText(page)), 'تحذير Returned في النافذة');
  await page.close(); await ctx.close();
}

console.log('══ ④ ردود الرفض والانقطاع ══');
{
  // stale: الـ Worker بيرفض لأن الأرقام اتغيّرت — النافذة بتفضل مفتوحة، الفحص بيتعاد، والمبالغ بتتصفّر
  const { page, calls, ctx } = await open({ payRes: { success: false, status: 'error', stale: true, actions: [], error: 'الأرقام اتغيّرت من وقت الفحص (المستحق 2300.00 · الباقي 300.00 · S2 In-Return) — أعد الفحص وراجع' } });
  await page.click('#tabBpr'); await page.waitForSelector('#bprBodyRows tr[data-oid]');
  await rowOf(page, '#63994').locator('[data-bpro]').click(); await page.waitForSelector('#bprMeter');
  await page.click('[data-bptog="instapay:فادي"]'); await page.waitForSelector('[data-bpin="instapay:فادي"]'); await page.click('[data-bprest="instapay:فادي"]'); await page.click('#bprAck');
  await page.click('#bprGo'); await page.waitForFunction(() => /اتغيّرت/.test(document.getElementById('bprModalBody').innerText));
  is(await page.locator('#bprOverlay.open').count() === 1, 'stale: النافذة فضلت مفتوحة');
  is(calls.filter(c => c.action === 'bostaPartialCheck').length === 2, 'stale: الفحص اتعاد');
  is(await page.locator('#bprGo').isDisabled() && await page.inputValue('[data-bpin="instapay:فادي"]').catch(() => '') === '', 'stale: المبالغ والإقرار اتصفّروا (لازم يراجع من جديد)');
  is(await page.evaluate(() => !window.__bxBusy), 'stale: علم «مشغول» اتفك');
  await page.close(); await ctx.close();
}
{
  // رفض عادي (مثلاً شوبيفاي رفضت) — النافذة مفتوحة والرسالة ظاهرة والمبالغ محفوظة
  const { page, ctx } = await open({ payRes: { success: false, status: 'error', actions: [], error: 'شوبيفاي رفضت الاسترداد: Refund amount exceeds — مفيش حاجة اتكتبت (لا شوبيفاي ولا السجل)' } });
  await page.click('#tabBpr'); await page.waitForSelector('#bprBodyRows tr[data-oid]');
  await rowOf(page, '#63994').locator('[data-bpro]').click(); await page.waitForSelector('#bprMeter');
  await page.click('[data-bptog="instapay:فادي"]'); await page.waitForSelector('[data-bpin="instapay:فادي"]'); await page.click('[data-bprest="instapay:فادي"]'); await page.click('#bprAck');
  await page.click('#bprGo'); await page.waitForFunction(() => /شوبيفاي رفضت/.test(document.getElementById('bprModalBody').innerText));
  is(await page.inputValue('[data-bpin="instapay:فادي"]') === '-500' && await page.locator('#bprGo').isEnabled(), 'الرفض: المبالغ محفوظة ويقدر يعيد');
  await page.close(); await ctx.close();
}
{
  // refundCreated (D1 وقعت بعد نجاح شوبيفاي) — لازم الفحص يتعاد والرسالة تتعرض
  const { page, calls, ctx } = await open({ payRes: { success: false, status: 'error', refundCreated: true, refundId: 'gid://shopify/Refund/9001', actions: [], error: 'الاسترداد اتعمل على شوبيفاي (500.00 ج · gid://shopify/Refund/9001) لكن السجل فشل (D1 down) — أعد المحاولة: الاسترداد هيتعرف ومش هيتكرر وهيتكتب السجل بس' } });
  await page.click('#tabBpr'); await page.waitForSelector('#bprBodyRows tr[data-oid]');
  await rowOf(page, '#63994').locator('[data-bpro]').click(); await page.waitForSelector('#bprMeter');
  await page.click('[data-bptog="instapay:فادي"]'); await page.waitForSelector('[data-bpin="instapay:فادي"]'); await page.click('[data-bprest="instapay:فادي"]'); await page.click('#bprAck');
  await page.click('#bprGo'); await page.waitForFunction(() => /لكن السجل فشل/.test(document.getElementById('bprModalBody').innerText));
  is(calls.filter(c => c.action === 'bostaPartialList').length === 2 && calls.filter(c => c.action === 'bostaPartialCheck').length === 2, 'refundCreated: الطابور والفحص اتعادوا (عشان الحالة الفعلية تظهر)');
  await page.close(); await ctx.close();
}
{
  // انقطاع بعد الإرسال = «ما اتأكدناش» مش «فشل»
  const { page, calls, ctx } = await open({ payAbort: true });
  await page.click('#tabBpr'); await page.waitForSelector('#bprBodyRows tr[data-oid]');
  await rowOf(page, '#63994').locator('[data-bpro]').click(); await page.waitForSelector('#bprMeter');
  await page.click('[data-bptog="instapay:فادي"]'); await page.waitForSelector('[data-bpin="instapay:فادي"]'); await page.click('[data-bprest="instapay:فادي"]'); await page.click('#bprAck');
  await page.click('#bprGo'); await page.waitForFunction(() => /ما اتأكدناش/.test(document.getElementById('bprModalBody').innerText), null, { timeout: 15000 });
  is(calls.filter(c => c.action === 'bostaPartialList').length === 2, 'الانقطاع: الطابور اتعاد (الحالة الفعلية بتحسم)');
  is(await page.evaluate(() => !window.__bxBusy), 'الانقطاع: علم «مشغول» اتفك');
  await page.close(); await ctx.close();
}

console.log('══ ⑥ الجدول على المعيار الموحّد (v8.7.0): فلاتر رأس العمود · ترتيب · chips · نتائج ══');
{
  const { page, ctx, errs } = await open();
  await page.click('#tabBpr'); await page.waitForSelector('#bprBodyRows tr[data-oid]');
  const rowsN = () => page.locator('#bprBodyRows tr[data-oid]').count();
  is(await page.locator('#bprSection').count() === 1 && await page.locator('#bprSection #bpBar').count() === 1 && await page.locator('#bprSection #bpChips').count() === 1 && await page.locator('#bprSection #bprTable').count() === 1, 'كارت واحد: صف النتائج ← chips ← الجدول');
  is(await page.locator('#bprBody').count() === 0 && await page.locator('#bprSearch').count() === 0, 'مفيش مربع بحث/شرايح قديمة — الفلترة من رأس العمود');
  is(await page.locator('#bprTable th[data-fk]').count() === 9, 'كل عمود فيه فلتر/ترتيب عدا «إجراء» (9 قمعات)');
  is(await page.locator('#bprTable th[data-col="act"] .bp-flt').count() === 0, '«إجراء» بلا قمع');
  is((await page.locator('#bpCount').innerText()) === '4' && (await page.locator('#bpClearAll').getAttribute('class')).includes('inactive'), '«النتائج: 6» و«مسح كل الفلاتر» باهت');
  is(await page.evaluate(() => getComputedStyle(document.querySelector('#bprTable thead th')).position) === 'sticky' && await page.evaluate(() => getComputedStyle(document.getElementById('bpScroll')).maxHeight !== 'none'), 'العناوين sticky جوّه سكرول داخلي');
  is(await page.evaluate(() => { const th = getComputedStyle(document.querySelector('#bprTable thead th')); return th.fontSize === '12px' && th.fontWeight === '700'; }), 'خط العنوان 12px/700');
  is(!(await page.locator('.bt-tip').count()), 'مفيش tooltip من غير فلتر مفعّل');
  // قمع قيم (S2) — القايمة بتفضل مفتوحة بعد اختيار قيمتين (بند 32)
  await page.click('[data-bpflt="s2"]'); await page.waitForSelector('.bt-pop');
  const items = await page.locator('.bt-pop .bt-item').allInnerTexts();
  is(items.some(x => /In-Return/.test(x)) && items.some(x => /Returned/.test(x)), 'قايمة S2 فيها القيم بعدّاداتها', items.join('|'));
  await page.click('.bt-pop [data-bpms="Returned"]'); is(await page.locator('.bt-pop').count() === 1, 'القايمة فضلت مفتوحة بعد أول اختيار');
  is(await rowsN() === 1, 'فلتر S2=Returned: صف واحد (#54860)');
  await page.click('.bt-pop [data-bpms="In-Return"]'); is(await page.locator('.bt-pop').count() === 1 && await rowsN() === 4, 'اختيار تاني: القايمة مفتوحة والصفوف 6');
  is(await page.locator('#bprChips .bt-chips-row, #bpChips .bt-chips-row').count() === 1 && /S2/.test(await page.locator('#bpChips').innerText()), 'chips: سطر لكل فلتر باسمه مرة واحدة');
  await page.mouse.click(5, 5); is(await page.locator('.bt-pop').count() === 0, 'ضغطة برّه بتقفل القايمة والفلتر يفضل');
  await page.hover('[data-bpflt="s2"]'); await page.waitForSelector('.bt-tip'); is(/Returned/.test(await page.locator('.bt-tip').innerText()), 'tooltip بقيم الفلتر المفعّل');
  await page.click('[data-bpclear]'); is(await rowsN() === 4 && (await page.locator('#bpClearAll').getAttribute('class')).includes('inactive'), '«مسح كل الفلاتر»');
  // قمع الأوردر (توكنز + اقتراحات) — Enter بيضيف وبيقفل الفلتر يفضل
  await page.click('[data-bpflt="order"]'); await page.fill('#bpQ', '٦٣٩٩'); await page.waitForSelector('#bpSugg [data-bpsg]');
  is(await page.locator('#bpSugg [data-bpsg]').count() >= 1 && /63994/.test(await page.locator('#bpSugg').innerText()), 'اقتراحات لايف بالأرقام العربي');
  await page.press('#bpQ', 'Enter'); await page.waitForSelector('.bt-toks .bt-chip');
  is(await rowsN() === 1 && /63994/.test(await page.locator('#bprBodyRows').innerText()), 'Enter ضاف توكن والجدول اتفلتر');
  await page.mouse.click(5, 5); await page.click('[data-bpclear]');
  // نطاق رقمي
  await page.click('[data-bpflt="rem"]'); await page.fill('#bpRf', '1000'); is(await rowsN() === 1, 'نطاق الباقي ≥ 1000 → #57634 بس');
  await page.click('.bt-pop [data-bpact="clear"]'); is(await rowsN() === 4, '«مسح الاختيار» في القايمة'); await page.mouse.click(5, 5);
  // ترتيب 3 حالات
  const firstName = () => page.locator('#bprBodyRows tr[data-oid]').first().locator('td').first().innerText();
  await page.click('[data-bpsort="order"]'); const asc = (await firstName()).replace(/\D/g, '');
  is(await page.locator('#bprTable th[data-fk="order"] .bt-sort').innerText() === '▲' && asc === '54860', 'ترتيب تصاعدي بالرقم (أصغر أوردر أول)', asc);
  await page.click('[data-bpsort="order"]'); is((await firstName()).replace(/\D/g, '') === '63994' && await page.locator('#bprTable th[data-fk="order"] .bt-sort').innerText() === '▼', 'تنازلي');
  await page.click('[data-bpsort="order"]'); is(await page.locator('#bprTable th[data-fk="order"] .bt-sort').innerText() === '', 'الضغطة التالتة: بلا ترتيب والأيقونة اختفت');
  // طي الجدول
  await page.click('#bpBar'); is(await page.locator('#bpWrap.collapsed').count() === 1, 'صف النتائج بيطوي الجدول'); await page.click('#bpBar');
  is(errs.length === 0, 'صفر خطأ في الكونسول', errs.join(' | '));
  await ctx.close();
}

console.log('══ ⑦ إضافة أوردر يدويًا من خارج الطابور ══');
{
  const { page, calls, ctx, errs } = await open({ listAfterPay: { '#70001': { state: 'done', registered: { at: '2026-11-16 12:00' } } } });
  await page.click('#tabBpr'); await page.waitForSelector('#bprBodyRows tr[data-oid]');
  const inp = page.locator('#bprAddIn');
  is(await inp.getAttribute('placeholder') === null && await inp.getAttribute('aria-label') === 'رقم الأوردر' && await page.locator('label[for="bprAddIn"]').count() === 0, 'مربع الإدخال: بلا placeholder وبلا label ظاهر (aria-label بس)');
  is(await page.locator('#bprEntryBar.entry-bar .entry-chip.is-on').count() === 1 && await page.locator('#bprEntryBar .entry-hint').count() === 1 && await page.locator('#bprEntryBar .btn-entry').innerText() === 'إضافة', 'مربع إدخال موحّد: شريط + chip رقم الأوردر + pill + زرار «إضافة»');
  is(await page.locator('.bpr-title, .bpr-sub, .bpr-add-l, #bprCapTxt').count() === 0, 'العنوان والشرح وسطر «إضافة أوردر من خارج الطابور» اتشالوا');
  const add = async v => { await inp.fill(v); await inp.press('Enter'); };
  // مدخلات مش رقم أوردر → الصندوق الأحمر (مش الجدول) وبلا نداء
  const n0 = calls.filter(c => c.action === 'bostaPartialCheck').length;
  await add('abc'); await page.waitForSelector('#bprAddFail:not([hidden])');
  is(/حروف/.test(await page.locator('#bprAddFailTxt').innerText()), 'حروف → صندوق أحمر بسبب قصير');
  await add('12345678'); is(/8 خانة/.test(await page.locator('#bprAddFailTxt').innerText()), 'طول 8 → رفض بالطول');
  await add('6959895839042'); is(/Order ID/.test(await page.locator('#bprAddFailTxt').innerText()), 'باركود فاتورة شوبيفاي → رفض بسببه');
  await add('70001 70002'); is(/واحد في المرة/.test(await page.locator('#bprAddFailTxt').innerText()), 'أكتر من رقم → رفض');
  is(calls.filter(c => c.action === 'bostaPartialCheck').length === n0 && await page.locator('#bprBodyRows tr[data-oid]').count() === 4, 'الرفض المحلي: صفر نداء وصفر صف في الجدول');
  await page.click('#bprAddFailX'); is(await page.locator('#bprAddFail').isHidden(), '✕ بيقفل الصندوق');
  // غير موجود/بلا تتبع → صندوق أحمر
  await add('70002'); await page.waitForSelector('#bprAddFail:not([hidden])');
  is(/bosta_tracking_number_s2/.test(await page.locator('#bprAddFailTxt').innerText()) && await page.locator('#bprBodyRows tr[data-oid]').count() === 4, 'أوردر بلا تتبع S2 → صندوق أحمر بسببه ومش بيتضاف');
  // نجاح
  await add('٧٠٠٠١'); await page.waitForSelector('#bprBodyRows tr[data-oid="70001"]');
  const ck = calls.filter(c => c.action === 'bostaPartialCheck').pop();
  is(ck.body.orderRef === '70001' && ck.body.manual === true, 'الفحص اتبعت بـ manual:true والأرقام العربي اتحوّلت', JSON.stringify(ck.body));
  is(await page.locator('#bprAddFail').isHidden() && await inp.inputValue() === '', 'الصندوق الأحمر اتقفل والمربع اتفضّى');
  const r = page.locator('#bprBodyRows tr[data-oid="70001"]');
  is(await page.locator('#bprBodyRows tr[data-oid]').count() === 5 && await page.locator('#bprBodyRows tr[data-oid]').first().getAttribute('data-oid') === '70001', 'الصف اتضاف في أول الجدول');
  is(/يدوي/.test(await r.innerText()) && /9090909090/.test(await r.innerText()) && /مضاف يدويًا/.test(await r.innerText()) && /جاهز للتسجيل/.test(await r.innerText()), 'الصف: شارة «يدوي» · التتبع · النوع · الحالة');
  is(await page.locator('#bpCount').innerText() === '5' && await page.locator('#tabBadgeBpr').innerText() === '5', '«النتائج» وبادج التاب اتحدّثوا');
  is(await page.locator('#bprToast, .toast-success').count() >= 1, 'توست نجاح');
  // مكرر
  const nDup = calls.filter(c => c.action === 'bostaPartialCheck').length;
  await add('70001'); await sleep(150);
  is(calls.filter(c => c.action === 'bostaPartialCheck').length === nDup && await page.locator('.toast-dup').count() >= 1 && await page.locator('#bprBodyRows tr[data-oid]').count() === 5, 'مكرر: توست أصفر وصفر نداء وصفر صف جديد');
  await add('63994'); await sleep(150);
  is(await page.locator('#bprBodyRows tr[data-oid]').count() === 5, 'أوردر موجود في الطابور: ما اتكررش');
  // موقوف = مش بيتضاف للجدول، سببه في الصندوق الأحمر بسطر قصير
  await add('70003'); await page.waitForSelector('#bprAddFail:not([hidden])');
  is(/70003/.test(await page.locator('#bprAddFailLbl').innerText()) && /S1 = «Shipped»/.test(await page.locator('#bprAddFailTxt').innerText()) && await page.locator('#bprBodyRows tr[data-oid="70003"]').count() === 0 && await page.locator('#bprBodyRows tr[data-oid]').count() === 5, 'الموقوف: سببه في الصندوق الأحمر ومش بيتضاف للجدول');
  await add('59971'); await sleep(150);
  is(await page.locator('#bprAddFail').isHidden() && await page.locator('.toast-dup').count() >= 1 && await page.locator('#bprBodyRows tr[data-oid]').count() === 5, 'اتسجّل قبل كده (#59971): تنبيه محايد (مكرر) مش أحمر ومش بيتضاف');
  // تسجيل المضاف → manual:true في الفحص والتسجيل
  await r.locator('[data-bpro]').click(); await page.waitForSelector('#bprMeter');
  const ck2 = calls.filter(c => c.action === 'bostaPartialCheck').pop();
  is(ck2.body.manual === true && ck2.body.trackingNumber === '9090909090', 'فحص النافذة بيبعت manual:true + رقم التتبع', JSON.stringify(ck2.body));
  is(/مضاف يدويًا/.test(await modalText(page)), 'تحذير «مضاف يدويًا» في النافذة');
  await page.click('[data-bptog="instapay:فادي"]'); await page.waitForSelector('[data-bpin="instapay:فادي"]'); await page.click('[data-bprest="instapay:فادي"]'); await page.click('#bprAck');
  await page.click('#bprGo'); await page.waitForFunction(() => !document.getElementById('bprOverlay').classList.contains('open'));
  await page.waitForSelector('#bprResOverlay.open');
  { const rt = await page.locator('#bprResBody').innerText();
    is(/-500/.test(rt) && /70001/.test(rt) && /9090909090/.test(rt) && /الخزنة/.test(rt), 'نافذة نتيجة بدل التوست: المبلغ بالسالب والأوردر والتتبع والخزنة', rt.slice(0, 200));
    is(!/اتسجّل استرداد جزئي/.test(await page.locator('.toast-container').innerText().catch(() => '')), 'مفيش توست لنتيجة التسجيل (النافذة هي اللي بتعرضها)');
    await page.keyboard.press('Escape'); is(!(await page.locator('#bprResOverlay.open').count()), 'Esc بيقفل نافذة النتيجة'); }
  const pay = calls.find(c => c.action === 'bostaPartialPay').body;
  is(pay.manual === true && pay.orderRef === '#70001' && pay.trackingNumber === '9090909090' && pay.expected.remainder === '500.00' && pay.reason === undefined, 'التسجيل بيبعت manual:true وبلا سبب (مفيش codRemainder)', JSON.stringify(pay));
  await sleep(300);
  is(await page.locator('#bprBodyRows tr[data-oid="70001"]').count() === 0 && await page.locator('#bprBodyRows tr[data-oid]').count() === 4, 'المضاف بعد التسجيل بقى «تم» ← اختفى من الجدول (للجاهز بس)');
  is(errs.length === 0, 'صفر خطأ في الكونسول', errs.join(' | '));
  await ctx.close();
}

console.log('══ ⑤ موبايل 390 ══');
{
  const { page, ctx } = await open();
  await page.setViewportSize({ width: 390, height: 800 });
  await page.click('#tabBpr'); await page.waitForSelector('#bprBodyRows tr[data-oid]');
  is(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth + 1), 'بلا سكرول أفقي للصفحة على 390px');
  await rowOf(page, '#63994').locator('[data-bpro]').click(); await page.waitForSelector('#bprMeter');
  is(await page.evaluate(() => { const m = document.querySelector('#bprOverlay .eco-modal'); return m.getBoundingClientRect().width <= window.innerWidth + 1; }), 'النافذة جوّه الشاشة على 390px');
  await ctx.close();
}

await browser.close(); server.close();
console.log(`\n${fail ? '❌' : '✅'} ${pass} عدّى · ${fail} فشل`);
process.exit(fail ? 1 : 0);
