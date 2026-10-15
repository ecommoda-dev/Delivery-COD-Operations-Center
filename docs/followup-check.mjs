// ══════════════════════════════════════════════════════════════
// docs/followup-check.mjs — فحص صفحة «متابعة التأجيلات» (v1.45.0)
//
// بيشغّل الصفحة الفعلية على Worker وهمي ببيانات معروفة، ويقيس **الشاشة**:
//   · الجدول بدل الكروت والتابات: الأعمدة · «النتائج» · الرقم في الرئيسية (الكاش) == صفوف الجدول.
//   · فلاتر رأس العمود (قايمة مفتوحة بعد أكتر من اختيار · chips · مسح الكل) والترتيب 3 حالات
//     والعناوين الثابتة وعرض الأعمدة بالسحب (محفوظ).
//   · التليفون: التطبيع (`fuNormPhone`) · أولوية رقم الشحن · الرقم البديل · بلا موبايل = زرار مقفول.
//   · نافذة الإرسال: النص (صيغة التأجيل ≠ صيغة المحاولة) · التجميع بالتليفون · رابط واتساب:
//     `phone` صح · `text` بعد `decodeURIComponent` == النص في المربع · 🔴 صفر حرف خارج BMP.
//   · التسجيل: `items[]` · 🔴 النص بيتبعت باسم العميل مستبدل بـ{name} · ضغطتين = نداء واحد ·
//     فشل التسجيل بيتقال (مش صمت) · نتيجة 404 لعنصر ماتوقّفش التاني.
//   · عمود «مرات الإرسال» ولوحة السجل (`get_sends`) بنص الرسالة والاسم راجع من شوبيفاي.
//   · «علّم متشيلك»: أوردر ملغي · بلا أوردر · بلا موبايل — بيفضلوا في الجدول بعلامة.
//   · ⛔ مفيش تابات ولا نتيجة رد ولا «إعادة فتح» (اتشالوا v1.45.0).
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
const iso = (h) => new Date(Date.now() - h * 3600e3).toISOString();
const cust = (o) => ({ firstName: 'Ali', fullName: 'Ali Hassan', shipPhone: null, orderPhone: null, custPhone: null, city: 'Nasr City', province: 'Cairo', ...o });
const base = (n, o) => ({ trackingNumber: 'T' + n, order: '#600' + n, slot: 's1', bostaType: 'SEND', state: 41, stateDesc: 'Out for delivery',
  promiseDate: '17-10-2026', attempts: 1, lastEventAt: iso(n), lastReason: null, lastExcCode: null, codBosta: 100,
  shopifyOrderId: '9000' + n, orderId: '9000' + n, hasOrder: true, total: 1500, financial: 'PENDING', cancelled: false, items: [['منتج', 1]],
  sends: { count: 0, lastBy: null, lastAt: null }, ...o });
const PP = 'Postponed - the customer requested postponement for another day.';
const ROWS = () => [
  base(1, { customer: cust({ shipPhone: '01012345678', orderPhone: '+201112345678' }), lastExcCode: '3', lastReason: PP }),               // ← مجموعة مع 2 (نفس الرقم بصيغة تانية)
  base(2, { customer: cust({ shipPhone: '0101 234 5678' }), attempts: 2, state: 24, stateDesc: 'Received at warehouse', lastExcCode: '7', lastReason: 'Customer is not answering.' }),
  base(3, { customer: cust({ firstName: '', fullName: 'Sara', shipPhone: '01234567890' }), slot: 's2', cancelled: true, attempts: 3 }),   // ملغي + S2 + اسم أول فاضي
  base(4, { customer: null, hasOrder: false, orderId: null, shopifyOrderId: null }),                                                       // مالوش أوردر
  base(5, { customer: cust({ firstName: 'Omar', fullName: 'Omar Said', shipPhone: '0123' }) }),                                            // رقم مقطوع
  base(6, { customer: cust({ firstName: 'Mona', fullName: 'Mona Adel', shipPhone: '00201551234567' }), promiseDate: 'garbage',
            sends: { count: 2, lastBy: 'Ahmed_Ibraheem', lastAt: iso(3) } }),
  base(7, { customer: cust({ firstName: 'Nour', fullName: 'Nour Samy', shipPhone: '01099887766', province: 'Giza', city: 'Dokki' }), promiseDate: '99-99-9999',
            lastExcCode: '3', lastReason: PP, sends: { count: 1, lastBy: 'Sara_Ali', lastAt: iso(20) } }),
  base(8, { customer: cust({ firstName: 'Hana', fullName: 'Hana Gamal', shipPhone: '01188776655', province: 'Alexandria', city: 'Smouha' }), promiseDate: null, attempts: 2, lastEventAt: iso(24 * 12) }),
];
const SENDS = {
  T6: [
    { id: 12, order: '#6006', attempts: 1, state: 41, sentBy: 'Ahmed_Ibraheem', sentAt: iso(3), message: 'أهلاً {name}\nرسالة تانية' },
    { id: 11, order: '#6006', attempts: 1, state: 41, sentBy: 'Sara_Ali', sentAt: iso(30), message: 'أهلاً {name}\nرسالة أولى' },
  ],
};

const SESSION = { v: 1, username: 'Ahmed_Ibraheem', displayName: 'Ahmed Ibraheem', loginAt: '2026-10-15T08:00:00.000Z' };
const state = { rows: ROWS(), calls: [], shopifyError: null, truncated: false, recordFail: false, loadFail: false, recordMode: 'ok', sendCounts: {} };

async function newPage() {
  const ctx = await browser.newContext({ viewport: { width: 1500, height: 900 } });
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
    state.calls.push({ action, body, qs: url.search, auth: req.headers()['authorization'] || '', host: url.hostname });
    let status = 200, out = { ok: true, version: '99.0.0', WORKER_VERSION: '99.0.0', checks: [], entries: [], employees: [] };
    if (action === 'get_followups') {
      if (state.loadFail) { status = 500; out = { ok: false, error: 'D1 وقعت' }; }
      else {
        const sent = state.rows.filter(r => r.sends.count > 0).length;
        out = { ok: true, windowDays: 60, minAttempts: 1, generatedAt: new Date().toISOString(),
                truncated: state.truncated, cap: 600, shopifyError: state.shopifyError, rows: state.rows,
                counts: { total: state.rows.length, unsent: state.rows.length - sent, sent } };
      }
    } else if (action === 'record') {
      if (state.recordFail) { status = 500; out = { ok: false, error: 'D1 وقعت' }; }
      else {
        const results = body.items.map(it => {
          if (state.recordMode === '404' && it.trackingNumber === 'T2') return { ok: false, status: 404, error: 'رقم التتبع مش موجود في أحداث بوسطة' };
          if (state.recordMode === 'dedupe') return { ok: true, deduped: true, count: 1, logged: true };
          const row = state.rows.find(r => r.trackingNumber === it.trackingNumber);
          if (row) { row.sends = { count: row.sends.count + 1, lastBy: body.employee, lastAt: new Date().toISOString() }; }   // الـ Worker بيعدّ فعلاً
          return { ok: true, count: row ? row.sends.count : 1, logged: true };
        });
        out = { ok: results.every(r => r.ok), results };
      }
    } else if (action === 'get_sends') {
      out = { ok: true, trackingNumber: url.searchParams.get('trackingNumber'), sends: SENDS[url.searchParams.get('trackingNumber')] || [] };
    }
    await route.fulfill({ status, contentType: 'application/json', headers: { 'Access-Control-Allow-Origin': '*' }, body: JSON.stringify(out) });
  });
  return { ctx, page, errs };
}
const recs = () => state.calls.filter(c => c.action === 'record');
const rowTn = (page) => page.$$eval('#fuBody tr[data-tn]', els => els.map(e => e.dataset.tn));
const tr = (page, t) => page.locator('#fuBody tr', { hasText: t });
const openPop = (page, k) => page.click(`th[data-fk="${k}"] .th-flt`);
async function load(page) { await page.goto(`${BASE}/${PAGE}`); await page.waitForSelector('#fuBody tr[data-tn]'); }
const resetState = () => { state.rows = ROWS(); state.calls.length = 0; state.shopifyError = null; state.truncated = false; state.recordFail = false; state.loadFail = false; state.recordMode = 'ok'; };

// ══════════════════════════════════════════════════════════════
sec('① التحميل والجدول والعدّ');
// ══════════════════════════════════════════════════════════════
{
  resetState();
  const { page, ctx, errs } = await newPage();
  await load(page);
  const gf = state.calls.filter(c => c.action === 'get_followups');
  is(gf.length === 1 && gf[0].host.startsWith('bosta-delivery-follow-up-worker') && gf[0].auth === 'Bearer HUB_SECRET_VALUE',
     'نداء واحد لـ Worker الأداة بسر الهب (مفيش تحديث تلقائي)', JSON.stringify(gf));
  is(!gf[0].qs.includes('days'), 'بلا باراميتر `days` (مفيش نافذة بيختارها الموظف)', gf[0].qs);
  is((await rowTn(page)).length === 8 && (await page.textContent('#fuCount')).trim() === '8', 'الجدول فيه 8 صفوف و«النتائج: 8»');
  const heads = await page.$$eval('#fuTbl thead th', els => els.map(e => e.querySelector('.th-in').textContent.replace(/\s+/g, ' ').trim()));
  is(JSON.stringify(heads) === JSON.stringify(['الأوردر', 'العميل', 'رقم التتبع', 'المحافظة', 'الحالة عند بوسطة', 'آخر سبب', 'موعد التسليم المتوقع', 'عدد المحاولات', 'وقت آخر تحديث', 'التحصيل', 'مرات الإرسال', 'إجراء']),
     'أعمدة الجدول بترتيبها', JSON.stringify(heads));
  is((await page.$$('#fuTbl thead .th-flt')).length === 9, 'قمع في رأس 9 أعمدة (فلتر) — والباقي (الميعاد · التحصيل · الإجراء) بلا فلتر');
  is((await page.$$('.fu-tab, .fu-card, .main-tab-btn, [data-tab]')).length === 0, '⛔ مفيش تابات ولا كروت');
  is((await page.$$('[data-res], [data-note], [data-act="reopen"], [data-act="result"]')).length === 0, '⛔ مفيش «نتيجة رد» ولا ملاحظة ولا «إعادة فتح»');
  const cache = await page.evaluate(() => JSON.parse(sessionStorage.getItem('dco_queue_followup') || 'null'));
  is(cache && cache.data.total === 8 && cache.data.unsent === 6 && cache.data.sent === 2,
     '🔴 الرقم في الرئيسية (الكاش) == صفوف الجدول: محتاجين رسالة 6 · اتبعتلهم 2 · إجمالي 8', JSON.stringify(cache));
  is((await page.textContent('#fuBanners')).includes('60') && (await page.textContent('#fuBanners')).includes('محاولة توصيل'),
     'سطر النطاق معلن: «محاولة توصيل أو أكتر · آخر 60 يوم»');
  // الأقدم/الأحدث: الترتيب الافتراضي = ترتيب الـ Worker (الأحدث فوق)
  is((await rowTn(page))[0] === 'T1', 'الترتيب الافتراضي بلا ترتيب = زي ما الـ Worker رجّعه');
  // العناوين ثابتة
  const pos = await page.$eval('#fuTbl thead th', e => getComputedStyle(e).position);
  const ovf = await page.$eval('.tbl-scroll', e => getComputedStyle(e).overflowY);
  is(pos === 'sticky' && ovf === 'auto', 'عناوين الجدول sticky والسكرول داخلي (#49)', `${pos}/${ovf}`);
  is((await page.$$eval('#fuBody tr[data-tn] td', tds => tds.length)) === 8 * 12, 'خلايا كل صف == عدد الأعمدة (12)');
  const ov = await page.$eval('.tbl-scroll', e => ({ sw: e.scrollWidth, cw: e.clientWidth }));
  is(ov.sw <= ov.cw + 12, '🔴 أول قياس بيحط الـ 12 عمود في عرض الكارت — مفيش سكرول أفقي بيخبّي أعمدة الإرسال', JSON.stringify(ov));
  is(errs.length === 0, 'صفر خطأ في الكونسول', errs.join(' | '));
  await ctx.close();
}

// ══════════════════════════════════════════════════════════════
sec('② محتوى الصفوف · علّم متشيلش · تواريخ غريبة');
// ══════════════════════════════════════════════════════════════
{
  resetState();
  const { page, ctx, errs } = await newPage();
  await load(page);
  const r3 = tr(page, '#6003');
  is((await r3.textContent()).includes('ملغي على شوبيفاي') && (await r3.textContent()).includes('S2'), 'الأوردر الملغي S2 بيفضل في الجدول بعلامتين (مش بيختفي)');
  const r4 = tr(page, '#6004');
  is((await r4.textContent()).includes('مالوش أوردر على شوبيفاي') && (await r4.locator('[data-act="send"]').count()) === 0 && (await r4.locator('.fu-send-btn[disabled]').count()) === 1,
     '«علّم متشيلش»: شحنة بلا أوردر بتفضل بعلامة وزرار إرسالها مقفول');
  const r5 = tr(page, '#6005');
  is((await r5.textContent()).includes('بلا موبايل صالح') && (await r5.locator('[data-act="send"]').count()) === 0, '🚫 رقم مقطوع = «بلا موبايل صالح» وزرار مقفول');
  const r1 = tr(page, '#6001');
  is((await r1.textContent()).includes('2 شحنات لنفس العميل'), 'علامة «شحنتين لنفس العميل» على مجموعة التليفون');
  is((await r1.textContent()).includes('01012345678'), 'رقم الشحن معروض بصيغة 01…');
  const t1 = await r1.textContent();
  is(t1.includes('تأجيل بطلب من العميل'), 'آخر سبب متعرّب (تأجيل بطلب من العميل)');
  is((await tr(page, '#6002').textContent()).includes('العميل لا يرد'), 'آخر سبب متعرّب (العميل لا يرد)');
  is((await tr(page, '#6008').textContent()).includes('—'), 'بلا آخر سبب = —');
  is((await tr(page, '#6006').textContent()).includes('garbage') === false && (await tr(page, '#6007').textContent()).includes('99-99-9999') === false,
     'تاريخ ميعاد `garbage` / `99-99-9999` مايتعرضش خام ومايوقّعش العرض', errs.join(' | '));
  is((await tr(page, '#6001').textContent()).includes('17/10/2026'), 'ميعاد سليم بيتعرض DD/MM/YYYY');
  const att2 = await tr(page, '#6002').locator('.att-chip.static').getAttribute('class');
  is(att2.includes('att-2'), 'مربع عدد المحاولات ملوّن (2 = أحمر)');
  is(errs.length === 0, 'صفر خطأ في الكونسول', errs.join(' | '));
  await ctx.close();
}

// ══════════════════════════════════════════════════════════════
sec('③ فلاتر رأس العمود · chips · ترتيب');
// ══════════════════════════════════════════════════════════════
{
  resetState();
  const { page, ctx } = await newPage();
  await load(page);
  // اختيار متعدد: القايمة تفضل مفتوحة بعد أول اختيار (Standards #32)
  await openPop(page, 'province');
  const items = await page.$$eval('.pop .ms-item .ms-lbl', els => els.map(e => e.textContent));
  is(items.length === 3 && items.includes('Cairo') && items.includes('Giza') && items.includes('Alexandria') || items.includes('— (بلا محافظة)'), 'قايمة المحافظات من القايمة الكاملة', JSON.stringify(items));
  await page.click('.pop .ms-item:has-text("Giza")');
  is(await page.isVisible('.pop'), '🔴 القايمة بتفضل مفتوحة بعد الاختيار (حارس document.contains)');
  is((await rowTn(page)).join() === 'T7', 'فلتر المحافظة = Giza → T7 بس');
  await page.click('.pop .ms-item:has-text("Alexandria")');
  is((await rowTn(page)).sort().join() === 'T7,T8', 'اختيار تاني في نفس القايمة → T7 + T8 (متعدد)');
  is((await page.textContent('#fuChips')).includes('المحافظة') && (await page.textContent('#fuChips')).includes('Giza'), 'chips سطر للفلتر باسمه');
  is((await page.textContent('#fuCount')).trim() === '2', '«النتائج» = المعروض');
  is(await page.$eval('th[data-fk="province"]', e => e.classList.contains('flt-on')), 'القمع مولّع (!!value مش !== null)');
  is(!(await page.$eval('[data-clearall]', e => e.classList.contains('inactive'))), 'زرار «مسح كل الفلاتر» اتفعّل');
  await page.keyboard.press('Escape');
  is(!(await page.isVisible('.pop').catch(() => false)), 'Escape بيقفل القايمة');
  // مربعات المحاولات: بتكتب في نفس الفلتر والعدّ من الكامل
  const chipsBefore = await page.$$eval('#fuChipsBar [data-att]', els => els.map(e => e.textContent.replace(/\s+/g, ' ').trim()));
  is(chipsBefore.length === 3 && chipsBefore[0].startsWith('3 محاولات') && chipsBefore[1].startsWith('محاولتين') && chipsBefore[2].startsWith('محاولة واحدة'), 'مربعات المحاولات: 3 قيم بترتيب تنازلي (3 · 2 · 1)', JSON.stringify(chipsBefore));
  const n1 = chipsBefore.find(x => x.startsWith('محاولة واحدة'));
  is(n1 && n1.endsWith('5'), '🔴 عدد «محاولة واحدة» من القايمة الكاملة (5) مش المفلترة', n1);
  await page.click('[data-att="2"]');
  is((await rowTn(page)).join() === 'T8', 'مربع «محاولتين» + فلتر المحافظة = T8 (بيكتبوا في نفس الحالة)');
  is(await page.$eval('th[data-fk="attempts"]', e => e.classList.contains('flt-on')), 'والقمع بتاع «عدد المحاولات» اتولّع من المربع (الاتجاه العكسي)');
  // مسح كل الفلاتر
  await page.click('[data-clearall]');
  is((await rowTn(page)).length === 8 && (await page.$eval('[data-clearall]', e => e.classList.contains('inactive'))), 'مسح كل الفلاتر → 8 صفوف وزرار المسح رجع باهت');
  is((await page.$$('#fuChips .ms-chip')).length === 0, 'والـ chips اتمسحت');
  // مربعات الإرسال
  await page.click('[data-snd="0"]');
  is((await rowTn(page)).length === 6, 'مربع «لم يُرسل» = 6 شحنات (== رقم الرئيسية)');
  await page.click('[data-snd="0"]');
  await page.click('[data-snd="2+"]');
  is((await rowTn(page)).join() === 'T6', 'مربع «مرتين فأكتر» = T6');
  await page.click('[data-clearall]');
  // بحث
  await openPop(page, 'order');
  await page.fill('.pop input[data-q="order"]', '#6003');
  is((await rowTn(page)).join() === 'T3', 'بحث برقم الأوردر (بـ#)');
  await page.keyboard.press('Enter');
  is(!(await page.isVisible('.pop').catch(() => false)) && (await rowTn(page)).join() === 'T3', 'Enter بيقفل القايمة والفلتر بيفضل');
  await page.click('[data-clearall]');
  await openPop(page, 'customer');
  await page.fill('.pop input[data-q="customer"]', '01099887766');
  is((await rowTn(page)).join() === 'T7', 'بحث العميل بالتليفون المحلي');
  await page.fill('.pop input[data-q="customer"]', 'sara');
  is((await rowTn(page)).join() === 'T3', 'بحث العميل بالاسم');
  await page.fill('.pop input[data-q="customer"]', 'zzz');
  const empt = await page.textContent('#fuBody');
  is(empt.includes('مفيش نتيجة للفلتر') && !empt.includes('مفيش شحنات تحت التوصيل'), '«مفيش نتيجة للفلتر» ≠ «القايمة فاضية» والجدول وعناوينه ظاهرين');
  is(await page.isVisible('#fuTbl thead'), 'العناوين ظاهرة على صفر نتائج');
  await page.click('[data-clearall]');
  // التاريخ
  await openPop(page, 'date');
  await page.click('.pop [data-preset="last7"]');
  is((await rowTn(page)).length === 7 && !(await rowTn(page)).includes('T8'), 'فلتر الفترة «آخر 7 أيام» بيشيل T8 (عمره 12 يوم)', (await rowTn(page)).join());
  await page.click('.pop [data-act="dclear"]');
  is((await rowTn(page)).length === 8, '«✕ مسح الاختيار» في الفترة بيرجّع الكل (بلا فترة افتراضية)');
  await page.keyboard.press('Escape');
  // ترتيب 3 حالات
  await page.click('th[data-col="attempts"] .th-label');
  const asc = await rowTn(page);
  is(asc[0] === 'T1' || asc[0] === 'T4' || asc[0] === 'T5' || asc[0] === 'T6' || asc[0] === 'T7', 'ترتيب تصاعدي على عدد المحاولات (الأقل فوق)', asc.join());
  is(asc.slice(-1)[0] === 'T3', 'الأكتر محاولات (3) آخر الصفوف في التصاعدي', asc.join());
  is((await page.textContent('th[data-col="attempts"] .sort-icon')).trim() === '▲', 'سهم الترتيب على العمود المرتَّب بس');
  await page.click('th[data-col="attempts"] .th-label');
  const desc = await rowTn(page);
  is(desc[0] === 'T3' && JSON.stringify(desc.map(t => ({ T3: 3, T2: 2, T8: 2 }[t] || 1))) === JSON.stringify([...desc.map(t => ({ T3: 3, T2: 2, T8: 2 }[t] || 1))].sort((a, b) => b - a)), 'تنازلي', desc.join());
  await page.click('th[data-col="attempts"] .th-label');
  is((await rowTn(page))[0] === 'T1' && (await page.textContent('th[data-col="attempts"] .sort-icon')).trim() === '', 'الضغطة التالتة = رجوع للافتراضي وبلا سهم');
  await page.click('th[data-col="attempts"] .th-label');
  await openPop(page, 'province');
  await page.click('.pop .ms-item:has-text("Giza")');
  await page.keyboard.press('Escape');
  await page.click('[data-clearall]');
  is((await page.textContent('th[data-col="attempts"] .sort-icon')).trim() === '▲', '🔴 الترتيب بيفضل بعد «مسح كل الفلاتر» (مستقل عن الفلاتر)');
  // القمع مابيرتّبش
  await page.click('th[data-col="attempts"] .th-label'); await page.click('th[data-col="attempts"] .th-label');
  await openPop(page, 'state');
  is(await page.isVisible('.pop') && (await page.textContent('th[data-col="state"] .sort-icon')).trim() === '', 'ضغطة القمع بتفتح القايمة ومابترتّبش');
  await ctx.close();
}

// ══════════════════════════════════════════════════════════════
sec('④ عرض الأعمدة بالسحب (#51)');
// ══════════════════════════════════════════════════════════════
{
  resetState();
  const { page, ctx } = await newPage();
  await load(page);
  const w = async (k) => Math.round(await page.$eval(`#fuTbl th[data-col="${k}"]`, e => e.getBoundingClientRect().width));
  const before = await w('reason');
  const hb = await page.$eval('#fuTbl th[data-col="reason"] .col-rz', e => { const r = e.getBoundingClientRect(); return { x: r.x + r.width / 2, y: r.y + r.height / 2 }; });
  await page.mouse.move(hb.x, hb.y); await page.mouse.down(); await page.mouse.move(hb.x - 80, hb.y, { steps: 6 }); await page.mouse.up();
  is((await w('reason')) - before === 80, 'السحب لليسار (RTL) +80px بالظبط', `${before} → ${await w('reason')}`);
  const saved = await page.evaluate(() => JSON.parse(localStorage.getItem('dco_col_widths_v1_Bosta-Delivery-Follow-Up.html') || 'null'));
  is(saved && saved.reason === before + 80 && Object.keys(saved).length === 12, 'العرض محفوظ في `dco_col_widths_v1_Bosta-Delivery-Follow-Up.html` (كل الأعمدة)');
  await page.reload(); await page.waitForSelector('#fuBody tr[data-tn]');
  is((await w('reason')) === before + 80, 'العرض بيفضل بعد refresh');
  const keys = await page.evaluate(() => Object.keys(localStorage).sort());
  is(keys.filter(k => k.startsWith('dco_col_widths')).length === 1, 'مفتاح عرض واحد بس');
  await page.dblclick('#fuTbl th[data-col="reason"] .col-rz');
  is((await w('reason')) < before + 80, 'دبل كليك = ضبط تلقائي على المحتوى (بيصغّر كمان)', String(await w('reason')));
  await ctx.close();
}

// ══════════════════════════════════════════════════════════════
sec('⑤ التليفون والرسالة ورابط واتساب');
// ══════════════════════════════════════════════════════════════
{
  resetState();
  const { page, ctx } = await newPage();
  await load(page);
  const n = await page.evaluate(() => ['01012345678', '+201012345678', '201012345678', '00201012345678', '0101 234 5678', '0123', null, '', '0225551234', '01712345678', '1012345678'].map(fuNormPhone));
  is(n[0] === '201012345678' && n[1] === n[0] && n[2] === n[0] && n[3] === n[0] && n[4] === n[0], 'التطبيع: 01… · +20… · 20… · 0020… · بمسافات → 201…', JSON.stringify(n));
  is(n[5] === null && n[6] === null && n[7] === null && n[8] === null && n[9] === null, 'رقم مقطوع / null / فاضي / أرضي / بادئة 017 → null', JSON.stringify(n));
  // مجموعة T1+T2: نافذة الإرسال فيها الاتنين + رقم بديل
  await tr(page, '#6001').locator('[data-act="send"]').click();
  is(await page.isVisible('#fuSendOverlay'), 'زرار «إرسال» بيفتح نافذة الإرسال');
  const body = await page.textContent('#fuSendBody');
  is(body.includes('#6001') && body.includes('#6002') && body.includes('2 شحنات لنفس العميل'), 'النافذة بتعرض شحنتين نفس العميل');
  const txt = await page.inputValue('#fuMsgText');
  is(txt.includes('أهلاً Ali') && txt.includes('#6001') && txt.includes('#6002') && txt.includes('أوردراتك'), 'الرسالة فيها الاسم وأرقام الأوردرين (جمع)', txt);
  is(txt.includes('حاولت توصّلك') && !txt.includes('طلبت تأجيل'), '🔴 مجموعة مختلطة (تأجيل + سبب تاني) = صيغة المحاولة العامة', txt);
  const btns = await page.$$eval('#fuSendBody [data-send-phone]', b => b.map(x => x.dataset.sendPhone));
  is(btns[0] === '201012345678' && btns.length === 2 && btns[1] === '201112345678', 'رقم الشحن أولًا + زرار بديل لرقم الأوردر المختلف', JSON.stringify(btns));
  await page.click('#fuSendOverlay .modal-close-x');
  is(!(await page.isVisible('#fuSendOverlay')) && recs().length === 0, 'إغلاق النافذة بلا إرسال = صفر نداء `record`');
  // صيغة التأجيل لشحنة واحدة كل سببها تأجيل
  await tr(page, '#6007').locator('[data-act="send"]').click();
  const t7 = await page.inputValue('#fuMsgText');
  is(t7.includes('أهلاً Nour') && t7.includes('طلبت تأجيل') && t7.includes('أوردرك رقم #6007'), 'شحنة كل سببها تأجيل بطلب العميل = صيغة التأجيل', t7);
  await page.keyboard.press('Escape');
  // S2 + اسم أول فاضي
  await tr(page, '#6003').locator('[data-act="send"]').click();
  const t3 = await page.inputValue('#fuMsgText');
  is(t3.includes('أهلاً بيك') && t3.includes('شحنة الاستبدال/الاسترجاع الخاصة بأوردرك رقم #6003'), 'اسم أول فاضي → «أهلاً بيك» · S2 → صيغة الاستبدال/الاسترجاع', t3);
  is(await page.textContent('#fuSendBody').then(x => x.includes('فيه أوردر ملغي')), 'الأوردر الملغي بيظهر تحذير في النافذة');
  is(!(await page.evaluate(() => fuHasAstral(FU_TPL_POSTPONED + FU_TPL_ATTEMPT + fuBuildMessage([{ order: '#1', slot: 's1', customer: { firstName: 'X' } }])))),
     '🔴 النصّين الافتراضيين بلا أي حرف خارج BMP (صفر إيموجي)');
  await page.keyboard.press('Escape');
  await ctx.close();
}

// ══════════════════════════════════════════════════════════════
sec('⑥ الإرسال والتسجيل');
// ══════════════════════════════════════════════════════════════
{
  resetState();
  const { page, ctx } = await newPage();
  await load(page);
  await tr(page, '#6001').locator('[data-act="send"]').click();
  const txt = await page.inputValue('#fuMsgText');
  // ضغطتين سريعتين على «فتح واتساب»
  await page.locator('#fuWaBtn').dblclick();
  await page.waitForTimeout(500);
  is(recs().length === 1, '🔴 ضغطتين على «فتح واتساب» = نداء `record` واحد', String(recs().length));
  const opens = await page.evaluate(() => window.__opens);
  is(opens.length === 1, 'والواتساب اتفتح مرة واحدة', String(opens.length));
  const u = new URL(opens[0]);
  is(u.hostname === 'api.whatsapp.com' && u.pathname === '/send' && u.searchParams.get('phone') === '201012345678', 'الرابط api.whatsapp.com/send و`phone` صح', opens[0]);
  is(u.searchParams.get('text') === txt && decodeURIComponent(opens[0].split('text=')[1]) === txt, '`text` بعد decode == النص اللي في المربع بالحرف');
  is(![...opens[0]].some(ch => ch.codePointAt(0) > 0xFFFF) && ![...decodeURIComponent(opens[0])].some(ch => ch.codePointAt(0) > 0xFFFF), 'مفيش حرف خارج BMP في الرابط');
  const r = recs()[0]?.body;
  is(r && r.employee === 'Ahmed_Ibraheem' && r.items.length === 2 && r.items.map(i => i.trackingNumber).sort().join() === 'T1,T2',
     '`record` بالموظف وشحنتي المجموعة (items[])', JSON.stringify(r));
  is(r && !('action' in r) && !('result' in r) && !('eventId' in r.items[0]), 'بلا `action`/`result`/`eventId` (مفيش نتيجة رد)');
  is(r && r.message.includes('{name}') && !r.message.includes('Ali') && !r.message.includes('Hassan'), '🔴 النص المتبعت للتخزين باسم العميل مستبدل بـ{name} (مفيش اسم)', r?.message);
  is(r && r.message.includes('#6001') && r.message.includes('أوردراتك'), 'وباقي النص زي ما هو');
  is(!(await page.isVisible('#fuSendOverlay')), 'النافذة اتقفلت بعد التسجيل');
  const s1 = await tr(page, '#6001').textContent();
  is(s1.includes('مرة واحدة') && s1.includes('Ahmed_Ibraheem') && (await tr(page, '#6002').textContent()).includes('مرة واحدة'), 'عمود «مرات الإرسال» اتحدّث للشحنتين: مرة واحدة + آخر مرسِل');
  const cache = await page.evaluate(() => JSON.parse(sessionStorage.getItem('dco_queue_followup')).data);
  is(cache.unsent === 4 && cache.sent === 4 && cache.total === 8, 'كاش الرئيسية اتحدّث بعد التسجيل (محتاجين رسالة 4)', JSON.stringify(cache));
  is((await page.textContent('#fuChipsBar')).includes('لم يُرسل') && await page.$eval('[data-snd="0"] .att-chip-n', e => e.textContent) === '4', 'مربع «لم يُرسل» بقى 4');
  is(!(await tr(page, '#6001').locator('[data-act="hist"]').isDisabled()), 'زرار «السجل» اتفعّل بعد أول إرسال');
  // إرسال تاني على نفس الشحنة = مرتين
  await tr(page, '#6001').locator('[data-act="send"]').click();
  await page.locator('#fuWaBtn').click();
  await page.waitForTimeout(400);
  is(recs().length === 2 && (await tr(page, '#6001').textContent()).includes('مرتين'), 'إرسال تاني = «مرتين» (مفيش قفل بعد أول إرسال)');
  await ctx.close();
}
{
  // فشل التسجيل: الواتساب اتفتح والموظف عارف إن التسجيل فشل
  resetState(); state.recordFail = true;
  const { page, ctx } = await newPage();
  await load(page);
  await tr(page, '#6003').locator('[data-act="send"]').click();
  await page.locator('#fuWaBtn').click();
  await page.waitForTimeout(600);
  const toast = await page.evaluate(() => document.querySelector('.toast-container')?.textContent || '');
  is((await page.evaluate(() => window.__opens.length)) === 1 && toast.includes('التسجيل فشل'), '🔴 فشل `record`: الواتساب اتفتح والرسالة بتقول إن التسجيل فشل (مش صمت)', toast);
  is((await tr(page, '#6003').textContent()).includes('لم يُرسل'), 'والعدّاد ماتحرّكش');
  is(await page.isVisible('#fuSendOverlay') && !(await page.locator('#fuWaBtn').isDisabled()), 'والنافذة فاضلة مفتوحة وزرارها رجع يشتغل (إعادة محاولة)');
  await ctx.close();
}
{
  // نتيجة 404 لعنصر واحد من المجموعة ماتوقّفش التاني
  resetState(); state.recordMode = '404';
  const { page, ctx } = await newPage();
  await load(page);
  await tr(page, '#6001').locator('[data-act="send"]').click();
  await page.locator('#fuWaBtn').click();
  await page.waitForTimeout(600);
  const toast = await page.evaluate(() => document.querySelector('.toast-container')?.textContent || '');
  is(toast.includes('مش موجود') || toast.includes('التسجيل فشل'), 'عنصر فشل (404) في الدفعة = رسالة خطأ', toast);
  is((await tr(page, '#6001').textContent()).includes('مرة واحدة') && (await tr(page, '#6002').textContent()).includes('لم يُرسل'),
     '🔴 اللي نجح اتحسب (T1) واللي فشل (T2) لأ — مفيش دفعة كلها بتضيع');
  await ctx.close();
}
{
  // نتيجة deduped
  resetState(); state.recordMode = 'dedupe';
  const { page, ctx } = await newPage();
  await load(page);
  await tr(page, '#6003').locator('[data-act="send"]').click();
  await page.locator('#fuWaBtn').click();
  await page.waitForTimeout(500);
  const toast = await page.evaluate(() => document.querySelector('.toast-container')?.textContent || '');
  is(toast.includes('اتسجّل من لحظات'), 'نتيجة `deduped` = رسالة «اتسجّل من لحظات — مش هيتكرر»', toast);
  await ctx.close();
}

// ══════════════════════════════════════════════════════════════
sec('⑦ لوحة سجل الإرسال');
// ══════════════════════════════════════════════════════════════
{
  resetState();
  const { page, ctx } = await newPage();
  await load(page);
  is(await tr(page, '#6003').locator('[data-act="hist"]').isDisabled(), 'زرار «السجل» مقفول لشحنة ما اتبعتلهاش');
  is((await tr(page, '#6006').textContent()).includes('مرتين'), 'عمود مرات الإرسال: «مرتين» للشحنة اللي اتبعتلها مرتين');
  await tr(page, '#6006').locator('[data-act="hist"]').click();
  await page.waitForSelector('#histBody .tl-item');
  const gs = state.calls.filter(c => c.action === 'get_sends');
  is(gs.length === 1 && gs[0].qs.includes('trackingNumber=T6'), '`get_sends` اتنادى برقم التتبع', JSON.stringify(gs));
  const items = await page.$$eval('#histBody .tl-item', els => els.map(e => ({ d: e.querySelector('.tl-desc').textContent, m: e.querySelector('pre').textContent })));
  is(items.length === 2 && items[0].d.includes('المرة 2') && items[0].d.includes('Ahmed_Ibraheem') && items[1].d.includes('المرة 1') && items[1].d.includes('Sara_Ali'),
     'المرتين والأحدث فوق (المرة 2 ثم 1) بالموظف', JSON.stringify(items.map(i => i.d)));
  is(items[0].m.includes('أهلاً Mona') && !items[0].m.includes('{name}'), '🔴 النص المعروض بيرجّع اسم العميل من شوبيفاي مكان {name}', items[0].m);
  is((await page.textContent('#histTitle')).includes('#6006') && (await page.textContent('#histTitle')).includes('2 مرة'), 'عنوان اللوحة فيه الأوردر والعدد');
  is(await page.$eval('#histDrawer', e => e.classList.contains('open')), 'اللوحة مفتوحة');
  await page.keyboard.press('Escape');
  is(!(await page.$eval('#histDrawer', e => e.classList.contains('open'))), 'Escape بيقفل اللوحة');
  await ctx.close();
}

// ══════════════════════════════════════════════════════════════
sec('⑧ البانرات · الفشل · الخروج التلقائي');
// ══════════════════════════════════════════════════════════════
{
  resetState(); state.shopifyError = 'THROTTLED'; state.truncated = true;
  const { page, ctx } = await newPage();
  await load(page);
  const b = await page.textContent('#fuBanners');
  is(b.includes('غايبة') && b.includes('THROTTLED') && b.includes('اتقصّت'), 'فشل شوبيفاي واقتطاع القايمة بيبانوا بانر (مش صمت)', b);
  const cache = await page.evaluate(() => JSON.parse(sessionStorage.getItem('dco_queue_followup') || 'null'));
  is(cache === null, '🔴 قايمة مقطوعة = مابنكتبش كاش الرئيسية (الرقم هيبقى أقل من الحقيقي)');
  await ctx.close();
}
{
  resetState(); state.loadFail = true;
  const { page, ctx } = await newPage();
  await page.goto(`${BASE}/${PAGE}`);
  await page.waitForTimeout(900);
  const b = await page.textContent('#fuBanners');
  is(b.includes('تعذّر تحميل القايمة') && (await page.textContent('#fuBody')).includes('تعذّر'), '🔴 فشل التحميل = «تعذّر» مش «مفيش شغل»', b);
  state.loadFail = false;
  await page.click('#refreshBtn');
  await page.waitForSelector('#fuBody tr[data-tn]');
  is((await rowTn(page)).length === 8 && !(await page.textContent('#fuBanners')).includes('تعذّر تحميل'), 'زرار «تحديث» بيجيب القايمة وبيشيل البانر');
  await ctx.close();
}
{
  resetState(); state.rows = [];
  const { page, ctx } = await newPage();
  await page.goto(`${BASE}/${PAGE}`);
  await page.waitForTimeout(900);
  is((await page.textContent('#fuBody')).includes('مفيش شحنات تحت التوصيل') && (await page.textContent('#fuCount')).trim() === '0', 'قايمة فاضية = رسالة صريحة و«النتائج: 0»');
  await ctx.close();
}
{
  resetState();
  const { page, ctx } = await newPage();
  await load(page);
  is(await page.evaluate(() => typeof window.shellIsBusy === 'function' && window.shellIsBusy() === false), '`shellIsBusy` معرّفة وبترجّع false وقت الراحة (حارس الخروج التلقائي)');
  await ctx.close();
}

console.log(`\n${fail ? '❌' : '✅'} النتيجة: ${pass} عدّى · ${fail} فشل`);
await browser.close(); server.close();
process.exit(fail ? 1 : 0);
