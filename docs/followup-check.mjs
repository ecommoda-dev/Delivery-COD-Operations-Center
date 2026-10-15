// ══════════════════════════════════════════════════════════════
// docs/followup-check.mjs — فحص صفحة «متابعة التأجيلات» (v1.44.0)
//
// بيشغّل الصفحة الفعلية على Worker وهمي ببيانات معروفة، ويقيس **الشاشة**:
//   · التابات والعدّ == الرقم اللي الرئيسية بتقراه (الكاش) · «النتائج» · الفلاتر.
//   · التليفون: التطبيع (`fuNormPhone`) · أولوية رقم الشحن · الرقم البديل · بلا موبايل = بلا زرار.
//   · التجميع: نفس التليفون = كارت واحد والتسجيل ينزل على كل شحناته (`items[]`).
//   · رابط واتساب: `phone` صح · `text` بعد `decodeURIComponent` == النص في المربع ·
//     🔴 صفر حرف خارج BMP (حارس ضد رجوع الإيموجي).
//   · التسجيل: `eventId` الصح · ضغطتين = نداء واحد · 409 = رسالة + إعادة تحميل.
//   · «علّم متشيلش»: أوردر ملغي · بلا أوردر · بلا موبايل — بيفضلوا بعلامة.
//   · تاريخ `deliveryPromiseDate` غريب مايوقّعش الصفحة.
// ⛔ مش بديل عن فحص الـ Worker (في ريبو الأداة) — هنا الواجهة بس.
// التشغيل: npm i playwright --no-save && node docs/followup-check.mjs
// ══════════════════════════════════════════════════════════════
import { chromium } from 'playwright';
import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';

const ROOT = path.resolve(path.dirname(new URL(import.meta.url).pathname), '..');
const PAGE = 'Bosta-Delivery-Follow-Up.html';
const MIME = { '.html':'text/html; charset=utf-8', '.js':'text/javascript; charset=utf-8', '.css':'text/css; charset=utf-8' };
const server = http.createServer((req, res) => {
  const f = path.join(ROOT, decodeURIComponent(req.url.split('?')[0]).replace(/^\/+/, ''));
  if (!f.startsWith(ROOT) || !fs.existsSync(f) || fs.statSync(f).isDirectory()) { res.writeHead(404); return res.end('nf'); }
  res.writeHead(200, { 'Content-Type': MIME[path.extname(f)] || 'application/octet-stream' });
  res.end(fs.readFileSync(f));
});
await new Promise(r => server.listen(0, '127.0.0.1', r));
const BASE = `http://127.0.0.1:${server.address().port}`;

let pass = 0, fail = 0;
const is = (c, m, d = '') => { c ? (pass++, console.log('  ✅', m)) : (fail++, console.log('  ❌', m, d ? `\n       ${d}` : '')); };
const sec = t => console.log(`\n══ ${t} ══`);

const launchOpts = { args: ['--no-sandbox'] };
if (process.env.PW_CHROMIUM) launchOpts.executablePath = process.env.PW_CHROMIUM;
const browser = await chromium.launch(launchOpts);

// ── بيانات معروفة ──────────────────────────────────────────────
const fu = (status = 'pending', extra = {}) => ({ status, result: null, note: null, sentBy: null, sentAt: null, resultBy: null, resultAt: null, ...extra });
const cust = (o) => ({ firstName: 'Ali', fullName: 'Ali Hassan', shipPhone: null, orderPhone: null, custPhone: null, city: 'Nasr City', province: 'Cairo', ...o });
const base = (n, o) => ({ trackingNumber: 'T' + n, eventId: 10 + n, order: '#600' + n, slot: 's1', bostaType: 'SEND', state: 41, stateDesc: 'Out for delivery',
  promiseDate: '17-10-2026', attempts: 1, lastPostponedAt: new Date(Date.now() - n * 3600e3).toISOString(), postponeCount: 1,
  shopifyOrderId: '9000' + n, orderId: '9000' + n, hasOrder: true, total: 1500, financial: 'PENDING', cancelled: false, items: [['منتج', 1]], followUp: fu(), ...o });
const ROWS = () => [
  base(1, { customer: cust({ shipPhone: '01012345678', orderPhone: '+201112345678' }) }),                       // ← مجموعة مع 2 (نفس الرقم بصيغة تانية)
  base(2, { customer: cust({ shipPhone: '0101 234 5678' }), postponeCount: 2, state: 24 }),
  base(3, { customer: cust({ firstName: '', fullName: 'Sara', shipPhone: '01234567890' }), slot: 's2', cancelled: true }),   // ملغي + S2 + اسم أول فاضي
  base(4, { customer: null, hasOrder: false, orderId: null, shopifyOrderId: null }),                              // مالوش أوردر
  base(5, { customer: cust({ firstName: 'Omar', shipPhone: '0123' }) }),                                          // رقم مقطوع
  base(6, { customer: cust({ firstName: 'Mona', shipPhone: '00201551234567' }), promiseDate: 'garbage', followUp: fu('sent', { sentBy: 'Ahmed_Ibraheem', sentAt: new Date().toISOString() }) }),
  base(7, { customer: cust({ firstName: 'Nour', shipPhone: '01099887766' }), promiseDate: '99-99-9999', followUp: fu('replied', { result: 'other_day', note: 'السبت' }) }),
  base(8, { customer: cust({ firstName: 'Hana', shipPhone: '01188776655' }), promiseDate: null, followUp: fu('closed', { result: 'ok' }) }),
];

const SESSION = { v: 1, username: 'Ahmed_Ibraheem', displayName: 'Ahmed Ibraheem', loginAt: '2026-10-15T08:00:00.000Z' };
const state = { rows: ROWS(), calls: [], stale: false, shopifyError: null, truncated: false, recordFail: false };

async function newPage() {
  const ctx = await browser.newContext();
  const page = await ctx.newPage();
  const errs = [];
  page.on('pageerror', e => errs.push('pageerror: ' + e.message));
  page.on('console', m => { if (m.type() === 'error') errs.push('console: ' + m.text()); });
  await page.addInitScript(([sess]) => {
    sessionStorage.setItem('dco_session', JSON.stringify(sess));
    localStorage.setItem('delivery_cod_ops_worker_secret', 'HUB_SECRET_VALUE');
    window.__opens = [];
    window.open = (u, t, f) => { window.__opens.push(u); return null; };
  }, [SESSION]);
  await page.route('**/*.workers.dev/**', async route => {
    const req = route.request();
    const url = new URL(req.url());
    let body = null; try { body = req.postData() ? JSON.parse(req.postData()) : null; } catch {}
    const action = url.searchParams.get('action') || '';
    state.calls.push({ action, body, auth: req.headers()['authorization'] || '', host: url.hostname });
    let status = 200, out = { ok: true, version: '99.0.0', WORKER_VERSION: '99.0.0', checks: [], entries: [], employees: [] };
    if (action === 'get_followups') {
      out = { ok: true, windowDays: Number(url.searchParams.get('days')) || 3, generatedAt: new Date().toISOString(),
              truncated: state.truncated, cap: 400, shopifyError: state.shopifyError, rows: state.rows, counts: {} };
    } else if (action === 'record') {
      if (state.recordFail) { status = 500; out = { ok: false, error: 'D1 وقعت' }; }
      else {
        const results = body.items.map(() => {
          if (state.stale) return { ok: false, status: 409, error: 'الشحنة اتقفلت أو جالها تأجيل أحدث — حدّث القايمة' };
          const st = body.action === 'opened' ? 'sent' : body.action === 'reopen' ? 'pending' : (['ok', 'skip', 'no_wa'].includes(body.result) ? 'closed' : 'replied');
          return { ok: true, status: st, logged: true };
        });
        out = { ok: results.every(r => r.ok), results };
      }
    }
    await route.fulfill({ status, contentType: 'application/json', headers: { 'Access-Control-Allow-Origin': '*' }, body: JSON.stringify(out) });
  });
  return { ctx, page, errs };
}
const recs = () => state.calls.filter(c => c.action === 'record');
const cards = (page) => page.$$eval('.fu-card', els => els.map(e => e.dataset.key));
const tabN = (page, k) => page.$eval(`[data-tab="${k}"] .n`, e => Number(e.textContent));

// ══════════════════════════════════════════════════════════════
sec('① التحميل والتابات والعدّ');
// ══════════════════════════════════════════════════════════════
{
  state.rows = ROWS(); state.calls.length = 0;
  const { page, ctx, errs } = await newPage();
  await page.goto(`${BASE}/${PAGE}`);
  await page.waitForSelector('.fu-card');
  const gf = state.calls.find(c => c.action === 'get_followups');
  is(!!gf && gf.host.startsWith('bosta-delivery-follow-up-worker') && gf.auth === 'Bearer HUB_SECRET_VALUE',
     'النداء راح لـ Worker الأداة بسر الهب', JSON.stringify(gf));
  is(state.calls.filter(c => c.action === 'get_followups').length === 1, 'نداء واحد عند الفتح (مفيش تحديث تلقائي)');
  is((await tabN(page, 'pending')) === 5 && (await tabN(page, 'sent')) === 1 && (await tabN(page, 'replied')) === 1 && (await tabN(page, 'closed')) === 1,
     'عدّاد كل تاب بالشحنات', `${await tabN(page, 'pending')},${await tabN(page, 'sent')},${await tabN(page, 'replied')},${await tabN(page, 'closed')}`);
  is((await page.textContent('#fuResults')).includes('5'), '«النتائج: 5 شحنة» في تاب محتاجين رسالة');
  const cache = await page.evaluate(() => JSON.parse(sessionStorage.getItem('dco_queue_followup') || 'null'));
  is(cache && cache.data.pending === 5 && cache.data.sent === 1 && cache.data.needsAction === 1 && cache.data.total === 8,
     '🔴 الرقم في الرئيسية (الكاش) == عدد شحنات تاب «محتاجين رسالة»', JSON.stringify(cache));
  // A+B نفس التليفون = كارت واحد، فالكروت 4 والشحنات 5
  is((await cards(page)).length === 4, 'تجميع نفس التليفون: 5 شحنات في 4 كروت', (await cards(page)).join(','));
  is(errs.length === 0, 'صفر خطأ في الكونسول', errs.join(' | '));
  await ctx.close();
}

// ══════════════════════════════════════════════════════════════
sec('② التليفون');
// ══════════════════════════════════════════════════════════════
{
  const { page, ctx } = await newPage();
  await page.goto(`${BASE}/${PAGE}`); await page.waitForSelector('.fu-card');
  const n = await page.evaluate(() => ['01012345678', '+201012345678', '201012345678', '00201012345678', '0101 234 5678', '0123', null, '', '0225551234', '01712345678', '1012345678'].map(fuNormPhone));
  is(n[0] === '201012345678' && n[1] === n[0] && n[2] === n[0] && n[3] === n[0] && n[4] === n[0], 'التطبيع: 01… · +20… · 20… · 0020… · بمسافات → 201…', JSON.stringify(n));
  is(n[5] === null && n[6] === null && n[7] === null && n[8] === null && n[9] === null,
     'رقم مقطوع / null / فاضي / أرضي / بادئة 017 → null', JSON.stringify(n));
  // رقم الشحن أولوية، والرقم المختلف بيبان كزرار بديل (كارت A+B)
  const card = page.locator('.fu-card', { hasText: '#6001' });
  const btns = await card.locator('[data-act="wa"]').evaluateAll(b => b.map(x => x.dataset.phone));
  is(btns[0] === '201012345678' && btns.length === 2 && btns[1] === '201112345678',
     'رقم الشحن أولًا + زرار بديل لرقم الأوردر المختلف', JSON.stringify(btns));
  // بلا موبايل صالح: بلا زرار + رسالة
  const no = page.locator('.fu-card', { hasText: '#6005' });
  is((await no.locator('[data-act="wa"]').count()) === 0 && (await no.textContent()).includes('مفيش موبايل صالح'),
     '🚫 رقم مقطوع = «مفيش موبايل صالح» وبلا زرار', '');
  const noOrder = page.locator('.fu-card', { hasText: '#6004' });
  is((await noOrder.textContent()).includes('مالوش أوردر متطابق') && (await noOrder.locator('[data-act="wa"]').count()) === 0,
     '«علّم متشيلش»: شحنة بلا أوردر على شوبيفاي بتفضل بعلامة وبلا زرار');
  await ctx.close();
}

// ══════════════════════════════════════════════════════════════
sec('③ الرسالة ورابط واتساب');
// ══════════════════════════════════════════════════════════════
{
  const { page, ctx } = await newPage();
  await page.goto(`${BASE}/${PAGE}`); await page.waitForSelector('.fu-card');
  const ab = page.locator('.fu-card', { hasText: '#6001' });
  const txt = await ab.locator('textarea.fu-msg').inputValue();
  is(txt.includes('أهلاً Ali') && txt.includes('#6001') && txt.includes('#6002') && txt.includes('أوردراتك'),
     'الرسالة فيها الاسم وأرقام الأوردرين (جمع)', txt);
  const s2 = page.locator('.fu-card', { hasText: '#6003' });
  const t2 = await s2.locator('textarea.fu-msg').inputValue();
  is(t2.includes('أهلاً بيك') && t2.includes('شحنة الاستبدال الخاصة بأوردرك رقم #6003'), 'اسم أول فاضي → «أهلاً بيك» · S2 → صيغة الاستبدال', t2);
  is(!(await page.evaluate(() => fuHasAstral(FU_TEMPLATE + fuBuildMessage([{ order: '#1', slot: 's1', customer: { firstName: 'X' } }])))),
     '🔴 النص الافتراضي بلا أي حرف خارج BMP (صفر إيموجي)');
  await ab.locator('[data-act="wa"]').first().click();
  await page.waitForTimeout(300);
  const opens = await page.evaluate(() => window.__opens);
  const u = new URL(opens[0]);
  is(u.hostname === 'api.whatsapp.com' && u.pathname === '/send' && u.searchParams.get('phone') === '201012345678',
     'الرابط api.whatsapp.com/send و`phone` صح', opens[0]);
  is(u.searchParams.get('text') === txt && decodeURIComponent(opens[0].split('text=')[1]) === txt,
     '`text` بعد decode == النص اللي في المربع بالحرف');
  is(![...opens[0]].some(ch => ch.codePointAt(0) > 0xFFFF) && ![...decodeURIComponent(opens[0])].some(ch => ch.codePointAt(0) > 0xFFFF), 'مفيش حرف خارج BMP في الرابط');
  await ctx.close();
}

// ══════════════════════════════════════════════════════════════
sec('④ التسجيل');
// ══════════════════════════════════════════════════════════════
{
  state.rows = ROWS(); state.calls.length = 0;
  const { page, ctx } = await newPage();
  await page.goto(`${BASE}/${PAGE}`); await page.waitForSelector('.fu-card');
  const ab = page.locator('.fu-card', { hasText: '#6001' });
  const btn = ab.locator('[data-act="wa"]').first();
  // ضغطتين سريعتين
  await btn.dblclick();
  await page.waitForTimeout(500);
  is(recs().length === 1, '🔴 ضغطتين على «فتح واتساب» = نداء `record` واحد', String(recs().length));
  const r = recs()[0]?.body;
  is(r && r.action === 'opened' && r.employee === 'Ahmed_Ibraheem' && r.items.length === 2
       && r.items.every(i => [11, 12].includes(i.eventId)) && r.items.map(i => i.trackingNumber).sort().join() === 'T1,T2',
     '`opened` بالـ eventId الصح ونزل على شحنتي المجموعة (items[])', JSON.stringify(r));
  is((await tabN(page, 'pending')) === 3 && (await tabN(page, 'sent')) === 3, 'الشحنتين انتقلوا لـ «مستنيين رد»', `${await tabN(page, 'pending')}/${await tabN(page, 'sent')}`);
  let cache = await page.evaluate(() => JSON.parse(sessionStorage.getItem('dco_queue_followup')).data);
  is(cache.pending === 3 && cache.sent === 3, 'كاش الرئيسية اتحدّث بعد التسجيل', JSON.stringify(cache));
  // النتيجة
  await page.click('[data-tab="sent"]');
  const c2 = page.locator('.fu-card', { hasText: '#6001' });
  await c2.locator('[data-act="result"]').click();
  is(recs().length === 1, 'حفظ نتيجة بلا اختيار = مفيش نداء');
  await c2.locator('[data-res]').selectOption('other_day');
  await c2.locator('[data-note]').fill('يوم السبت');
  await c2.locator('[data-act="result"]').click();
  await page.waitForTimeout(400);
  const rr = recs()[1]?.body;
  is(rr && rr.action === 'result' && rr.result === 'other_day' && rr.note === 'يوم السبت' && rr.items.length === 2, '`result` بالنتيجة والملاحظة على المجموعة', JSON.stringify(rr));
  is((await tabN(page, 'replied')) === 3, 'نتيجة «ميعاد تاني» → «محتاجين تصرّف»', String(await tabN(page, 'replied')));
  await page.click('[data-tab="replied"]');
  await page.locator('.fu-card', { hasText: '#6001' }).locator('[data-res]').selectOption('ok');
  await page.locator('.fu-card', { hasText: '#6001' }).locator('[data-act="result"]').click();
  await page.waitForTimeout(400);
  is((await tabN(page, 'closed')) === 3, '«الميعاد مناسب» → بتتقفل', String(await tabN(page, 'closed')));
  await page.click('[data-tab="closed"]');
  await page.locator('.fu-card', { hasText: '#6001' }).locator('[data-act="reopen"]').click();
  await page.waitForTimeout(400);
  is(recs()[recs().length - 1].body.action === 'reopen' && (await tabN(page, 'pending')) === 5, 'إعادة فتح غلطة التسجيل → رجعت لمحتاجين رسالة');
  await ctx.close();
}
{
  // 409 → رسالة + إعادة تحميل
  state.rows = ROWS(); state.calls.length = 0; state.stale = true;
  const { page, ctx } = await newPage();
  await page.goto(`${BASE}/${PAGE}`); await page.waitForSelector('.fu-card');
  await page.locator('.fu-card', { hasText: '#6003' }).locator('[data-act="wa"]').click();
  await page.waitForTimeout(800);
  const toast = await page.evaluate(() => document.querySelector('.toast-container')?.textContent || '');
  is(toast.includes('حدّث') || toast.includes('بحدّث'), '409 → رسالة «الشحنة اتقفلت… حدّث القايمة»', toast);
  is(state.calls.filter(c => c.action === 'get_followups').length === 2, '409 → القايمة اتحمّلت تاني');
  state.stale = false;
  await ctx.close();
}
{
  // فشل التسجيل: الواتساب اتفتح والموظف عارف إن التسجيل فشل
  state.rows = ROWS(); state.calls.length = 0; state.recordFail = true;
  const { page, ctx } = await newPage();
  await page.goto(`${BASE}/${PAGE}`); await page.waitForSelector('.fu-card');
  await page.locator('.fu-card', { hasText: '#6003' }).locator('[data-act="wa"]').click();
  await page.waitForTimeout(600);
  const toast = await page.evaluate(() => document.querySelector('.toast-container')?.textContent || '');
  is((await page.evaluate(() => window.__opens.length)) === 1 && toast.includes('التسجيل فشل'),
     '🔴 فشل `record`: الواتساب اتفتح والرسالة بتقول إن التسجيل فشل (مش صمت)', toast);
  is((await tabN(page, 'pending')) === 5, 'والشحنة ماتنقلتش لـ «مستنيين رد» (الحالة ما اتغيّرتش)');
  state.recordFail = false;
  await ctx.close();
}

// ══════════════════════════════════════════════════════════════
sec('⑤ علّم متشيلش · تاريخ غريب · الفلاتر · البانرات');
// ══════════════════════════════════════════════════════════════
{
  state.rows = ROWS(); state.calls.length = 0;
  const { page, ctx, errs } = await newPage();
  await page.goto(`${BASE}/${PAGE}`); await page.waitForSelector('.fu-card');
  const cancelled = page.locator('.fu-card', { hasText: '#6003' });
  is((await cancelled.textContent()).includes('ملغي على شوبيفاي'), 'الأوردر الملغي بيفضل بعلامة (مش بيختفي)');
  // تواريخ غريبة في تابات تانية مايوقّعوش الصفحة
  for (const t of ['sent', 'replied', 'closed']) { await page.click(`[data-tab="${t}"]`); }
  is((await page.$$('.fu-card')).length === 1 && errs.length === 0, 'تاريخ ميعاد `garbage` / `99-99-9999` / null مايوقّعش العرض', errs.join(' | '));
  await page.click('[data-tab="pending"]');
  // فلتر الحالة
  await page.selectOption('#fuState', '24');
  is((await page.textContent('#fuResults')).includes('1 ') && (await cards(page)).length === 1, 'فلتر حالة الشحنة (في المخزن) → شحنة واحدة');
  is((await tabN(page, 'pending')) === 5, '🔴 عدّاد التاب من القايمة الكاملة مش المفلترة');
  await page.selectOption('#fuState', '');
  await page.fill('#fuSearch', 'sara');
  is((await cards(page)).length === 1, 'البحث باسم العميل');
  await page.fill('#fuSearch', 'zzz');
  is((await page.textContent('#fuList')).includes('مفيش نتيجة للفلتر'), '«مفيش نتيجة للفلتر» ≠ «التاب فاضي»');
  await page.fill('#fuSearch', '');
  await page.check('#fuMulti');
  is((await page.textContent('#fuResults')).includes('1 '), 'اتأجلت أكتر من مرة → شحنة #6002 بس');
  await page.uncheck('#fuMulti');
  await ctx.close();
}
{
  state.rows = ROWS(); state.shopifyError = 'THROTTLED'; state.truncated = true;
  const { page, ctx } = await newPage();
  await page.goto(`${BASE}/${PAGE}`); await page.waitForSelector('.fu-card');
  const b = await page.textContent('#fuBanners');
  is(b.includes('غايبة') && b.includes('THROTTLED') && b.includes('اتقصّت'), 'فشل شوبيفاي واقتطاع القايمة بيبانوا بانر (مش صمت)', b);
  state.shopifyError = null; state.truncated = false;
  await ctx.close();
}

console.log(`\n${fail ? '❌' : '✅'} النتيجة: ${pass} عدّى · ${fail} فشل`);
await browser.close(); server.close();
process.exit(fail ? 1 : 0);
