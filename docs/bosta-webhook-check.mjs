// ══════════════════════════════════════════════════════════════
// docs/bosta-webhook-check.mjs — فحص صفحة «مستقبل حالة شحنات بوسطة» (v1.35.0 · وتاب In-Return v1.36.0)
//
// بيشغّل الصفحة الفعلية على Worker وهمي بأحداث معروفة، ويقيس **الشاشة**:
//   · الدمج: الجلسة والسر من الهب · صفر شاشة دخول · النداءات بسر الهب على
//     Worker الأداة · صفر كونسول إيرور.
//   · المنطق اللي اتنقل: صف واحد لكل رقم تتبع · الحالات النهائية بتشيل الرقم من
//     «تحت التوصيل» · أسباب الفشل التاريخية · هايبرلينك الأوردر · الفلتر
//     في رأس العمود بيفضل مفتوح · سجل الشحنة · الخروج.
// ⛔ مش بديل عن فحص الـ Worker نفسه (في ريبو الأداة) — هنا الواجهة بس.
// التشغيل: npm i playwright --no-save && node docs/bosta-webhook-check.mjs
// ══════════════════════════════════════════════════════════════
import { chromium } from 'playwright';
import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';

const ROOT = path.resolve(path.dirname(new URL(import.meta.url).pathname), '..');
const PAGE = 'Bosta-Webhook-Status-Receiver.html';
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

// ── أحداث معروفة ───────────────────────────────────────────────
let id = 0;
const ts = (h) => Date.now() - h * 3600e3;
const ev = (o) => ({
  id: ++id, bosta_id: 'b' + id, state: 21, bosta_timestamp: ts(10), tracking_number: 'T000', business_reference: '#1000',
  order_number: '1000', bosta_type: 'SEND', description: 'Out for delivery', number_of_attempts: 0, matched_slot: 'S1',
  match_method: 'tracking_number', write_status: 'written', shopify_order_id: '9000',
  received_at: new Date(ts(10)).toISOString(), delivery_promise_date: null, exception_reason: null, ...o,
});
const EVENTS = [
  // T1: ما زالت تحت التوصيل — حدثان (استثناء ثم Out for delivery)
  ev({ tracking_number: 'T1', business_reference: '#1001', state: 47, description: 'Exception', exception_reason: 'Customer not answering', bosta_timestamp: ts(30), received_at: new Date(ts(30)).toISOString() }),
  ev({ tracking_number: 'T1', business_reference: '#1001', state: 21, description: 'Out for delivery', bosta_timestamp: ts(5), received_at: new Date(ts(5)).toISOString() }),
  // T2: وصلت Delivered — لازم تتشال من تحت التوصيل
  ev({ tracking_number: 'T2', business_reference: '#1002', state: 21, bosta_timestamp: ts(40), received_at: new Date(ts(40)).toISOString() }),
  ev({ tracking_number: 'T2', business_reference: '#1002', state: 45, description: 'Delivered', bosta_timestamp: ts(20), received_at: new Date(ts(20)).toISOString() }),
  // T3: Returned
  ev({ tracking_number: 'T3', business_reference: '#1003', state: 46, description: 'Returned to business', bosta_timestamp: ts(8), received_at: new Date(ts(8)).toISOString() }),
  // T4: Terminated + بلا shopify_order_id
  ev({ tracking_number: 'T4', business_reference: '#1004', state: 48, description: 'Terminated', shopify_order_id: null, write_status: 'match_failed', bosta_timestamp: ts(7), received_at: new Date(ts(7)).toISOString() }),
  // T6: اتحوّلت RTO ولسه في الطريق — لازم تتنقل لتاب In-Return وتتشال من تحت التوصيل (v1.36.0)
  ev({ tracking_number: 'T6', business_reference: '#1006', state: 21, bosta_timestamp: ts(50), received_at: new Date(ts(50)).toISOString() }),
  ev({ tracking_number: 'T6', business_reference: '#1006', state: 30, description: 'In transit between Hubs', bosta_type: 'RTO', bosta_timestamp: ts(2), received_at: new Date(ts(2)).toISOString() }),
  // T7: RTO ووصلت Returned to business (46) — لازم تروح Returned مش In-Return
  ev({ tracking_number: 'T7', business_reference: '#1007', state: 30, bosta_type: 'RTO', bosta_timestamp: ts(60), received_at: new Date(ts(60)).toISOString() }),
  ev({ tracking_number: 'T7', business_reference: '#1007', state: 46, description: 'Returned to business', bosta_type: 'RTO', bosta_timestamp: ts(9), received_at: new Date(ts(9)).toISOString() }),
  // T8: استبدال (EXCHANGE) — 41 قبل 23 (خروج عادي) ثم 23 ثم 41 تاني بعد 23 → In-Return و«Out for Return» (v1.55.0)
  ev({ tracking_number: 'T8', business_reference: '#1008', state: 41, description: 'Out for exchange', bosta_type: 'EXCHANGE', matched_slot: 'S2', bosta_timestamp: ts(80), received_at: new Date(ts(80)).toISOString() }),
  ev({ tracking_number: 'T8', business_reference: '#1008', state: 23, description: 'Picked up from consignee', bosta_type: 'EXCHANGE', matched_slot: 'S2', bosta_timestamp: ts(40), received_at: new Date(ts(40)).toISOString() }),
  ev({ tracking_number: 'T8', business_reference: '#1008', state: 41, description: 'Out for exchange', bosta_type: 'EXCHANGE', matched_slot: 'S2', bosta_timestamp: ts(2), received_at: new Date(ts(2)).toISOString() }),
  // T9: استبدال لسه ماوصلهاش 23 — تفضل في «تحت التوصيل» بوصفها العادي
  ev({ tracking_number: 'T9', business_reference: '#1009', state: 41, description: 'Out for exchange', bosta_type: 'EXCHANGE', matched_slot: 'S2', bosta_timestamp: ts(4), received_at: new Date(ts(4)).toISOString() }),
  // تاريخ باظ (الحارس): لازم ما يوقّفش رسم الجدول
  ev({ tracking_number: 'T5', business_reference: '#1005', state: 21, delivery_promise_date: '25-09-2026', bosta_timestamp: ts(3), received_at: new Date(ts(3)).toISOString() }),
];

function mockWorker(page, calls) {
  return page.route('**/*.workers.dev/**', async route => {
    const req = route.request();
    const u = new URL(req.url());
    const action = u.searchParams.get('action') || '';
    calls.push({ from: (() => { try { return req.frame().url(); } catch { return ''; } })(), host: u.host, action, auth: req.headers()['authorization'] || '', method: req.method() });
    let body = { ok: true };
    if (action === 'get_config') body = { version: '1.11.0' };
    else if (action === 'list_events') body = { events: EVENTS, maxId: id, updated: [] };   // v1.10.0: بلا raw_payload
    else if (action === 'get_event_payload') body = { id: Number(u.searchParams.get('id')), raw_payload: '{"a":1,"id":' + u.searchParams.get('id') + '}' };
    else if (action === 'diag') body = { checks: [], lastEvent: { business_reference: '#1005', received_at: new Date().toISOString() }, count24h: 7, dup24h: 0, matchFailed24h: 1, eventsTableOk: true, silenceThresholdHours: 3 };
    await route.fulfill({ status: 200, contentType: 'application/json', headers: { 'Access-Control-Allow-Origin': '*' }, body: JSON.stringify(body) });
  });
}

const SESSION = { v: 1, username: 'Ahmed_Ibraheem', displayName: 'Ahmed Ibraheem', loginAt: '2026-10-12T08:00:00.000Z' };
async function open({ session = true } = {}) {
  const ctx = await browser.newContext();
  const page = await ctx.newPage();
  const errs = [], calls = [];
  page.on('pageerror', e => errs.push('pageerror: ' + e.message));
  page.on('console', m => { if (m.type() === 'error') errs.push('console: ' + m.text()); });
  await page.addInitScript(([sess, useSess]) => {
    try {
      if (useSess) sessionStorage.setItem('dco_session', JSON.stringify(sess));
      localStorage.setItem('delivery_cod_ops_worker_secret', 'HUB_SECRET');
      localStorage.setItem('bosta_webhook_status_worker_secret', 'OLD_SECRET');
    } catch {}
  }, [SESSION, session]);
  await mockWorker(page, calls);
  return { ctx, page, errs, calls };
}
const rowsOf = (page, tab) => page.$$eval(`#eventsBody-${tab} tr`, trs => trs.map(t => t.textContent.replace(/\s+/g, ' ').trim()));

// ══════════════════════════════════════════════════════════════
sec('① الدمج — الجلسة والسر والنداءات');
{
  const { ctx, page, errs, calls } = await open({ session: false });
  await page.goto(`${BASE}/${PAGE}`);
  await page.waitForURL(/index\.html/, { timeout: 4000 }).catch(() => {});
  is(/index\.html\?next=/.test(page.url()), 'بلا جلسة → تحويل للرئيسية بـ ?next=', page.url());
  is(calls.filter(c => c.from.split('?')[0].endsWith('/' + PAGE)).length === 0, '⛔ وصفر نداء للـ Worker من صفحة الأداة قبل التحويل');
  await ctx.close();
}
{
  const { ctx, page, errs, calls } = await open();
  await page.goto(`${BASE}/${PAGE}`);
  await page.waitForSelector('#eventsBody-main tr', { timeout: 5000 });
  is(await page.$('#loginOverlay') === null, 'صفر شاشة دخول في الصفحة');
  is((await page.textContent('.app-header')).includes('Ahmed Ibraheem'), 'الهيدر باسم جلسة الهب');
  const mine = calls.filter(c => c.host.startsWith('bosta-webhook-status-receiver-worker'));
  is(mine.length > 0 && mine.every(c => c.auth === 'Bearer HUB_SECRET'), 'كل النداءات على Worker الأداة بسر الهب (مش السر القديم)');
  is(mine.some(c => c.action === 'list_events') && mine.some(c => c.action === 'diag') && mine.some(c => c.action === 'get_config'), 'list_events + diag + get_config اتنادوا');
  is(mine.every(c => !['verify_employee', 'check_employee', 'get_employees', 'register_pin'].includes(c.action)), '⛔ ومفيش أي نداء دخول (الدخول من الرئيسية)');
  is(errs.length === 0, 'صفر خطأ في الكونسول', errs.join(' | '));
  await ctx.close();
}

// ══════════════════════════════════════════════════════════════
sec('② المنطق — صف لكل رقم تتبع والحالات النهائية');
{
  const { ctx, page, errs } = await open();
  await page.goto(`${BASE}/${PAGE}`);
  await page.waitForSelector('#eventsBody-main tr');
  const main = await rowsOf(page, 'main');
  const txt = main.join('\n');
  is(main.length === 3, 'تحت التوصيل: T1 · T5 · T9 بس — صف واحد لكل رقم', main.join(' || '));
  is(txt.includes('T1') && txt.includes('T5'), 'T1 وT5 ظاهرين');
  is(!txt.includes('T6') && !txt.includes('T7'), '⛔ T6 (RTO) اتنقلت من «تحت التوصيل» لتاب In-Return')
  is(!txt.includes('T2') && !txt.includes('T3') && !txt.includes('T4'), '⛔ T2 (Delivered) وT3 (Returned) وT4 (Terminated) اتشالوا من «تحت التوصيل»');
  is(txt.includes('Customer not answering'), '🔴 سبب فشل الاستثناء القديم لسه معروض على T1 رغم إن آخر حالتها Out for delivery');
  is(await page.$('#eventsBody-main a.order-link[href*="9000"]') !== null, 'رقم الأوردر هايبرلينك لشوبيفاي');
  is(await page.$('#eventsBody-main a.tracking-link[href*="business.bosta.co/orders/T1"]') !== null, 'ورقم التتبع هايبرلينك لبوسطة');
  is(txt.includes('—'), 'التاريخ الباظ بيعرض — والجدول اتحمّل (الحارس شغّال)');
  {
    await page.click('#tab-inreturn');
    const r = await rowsOf(page, 'inreturn');
    is(r.length === 2 && r.some(x => x.includes('T6')) && r.some(x => x.includes('T8')) && !r.some(x => x.includes('T9')), '🔁 تاب In-Return: T6 (RTO) وT8 (استبدال بعد 23) — وT7 (RTO ووصلت 46) وT9 (استبدال قبل 23) مش هنا', r.join(' || '));
    const t8 = r.find(x => x.includes('T8')) || '';
    is(t8.includes('Out for Return') && !t8.includes('Out for exchange'), '🔁 T8: آخر حالة 41 بعد 23 بتتعرض «Out for Return» (مش Out for exchange)', t8);
    await page.click('#tab-main');
    const m = (await rowsOf(page, 'main')).find(x => x.includes('T9')) || '';
    is(m.includes('Out for exchange') && !m.includes('Out for Return'), '🔁 T9: 41 على استبدال قبل 23 بيفضل «Out for exchange»', m);
    await page.click('#tab-inreturn');
  }
  for (const [tab, tn] of [['returned', 'T3'], ['delivered', 'T2'], ['terminated', 'T4']]) {
    await page.click(`#tab-${tab}`);
    const r = await rowsOf(page, tab);
    // T7 (RTO ووصلت 46) بتروح Returned مش In-Return
    const want = tab === 'returned' ? 2 : 1;
    is(r.length === want && r.some(x => x.includes(tn)) && (tab !== 'returned' || r.some(x => x.includes('T7'))), `تاب ${tab}: ${want === 2 ? 'T3 وT7' : 'صف واحد ' + tn}`, r.join(' || '));
  }
  const t4 = (await rowsOf(page, 'terminated'))[0] || '';
  is(await page.$('#eventsBody-terminated a.order-link') === null && t4.includes('1004'), 'T4 بلا shopify_order_id → رقم الأوردر نص عادي بلا لينك');
  is(errs.length === 0, 'صفر خطأ في الكونسول', errs.join(' | '));
  await ctx.close();
}

// ══════════════════════════════════════════════════════════════
sec('③ الفلاتر والسجل');
{
  const { ctx, page, errs, calls } = await open();
  await page.goto(`${BASE}/${PAGE}`);
  await page.waitForSelector('#eventsBody-main tr');
  const fltBtns = await page.$$('#tabRoot-main [data-flt]');
  is(fltBtns.length >= 5, `قمع الفلتر في رؤوس الأعمدة (${fltBtns.length})`);
  is(await page.$('#tabRoot-main .flt-body') === null, 'ومفيش لوحة فلاتر فوق الجدول');
  await fltBtns[0].click();
  is(await page.$('.pop') !== null, 'القمع بيفتح قايمة عائمة');
  await page.keyboard.press('Escape');
  const hist = await page.$('#eventsBody-main tr:has-text("T1") .hist-btn');
  is(hist !== null, 'زرار «عرض السجل» موجود');
  if (hist) {
    await hist.click();
    await page.waitForTimeout(200);
    is(await page.$eval('#histDrawer', e => e.classList.contains('open')), 'الدرج بيفتح');
    const items = await page.$$('#histBody .tl-item');
    is(items.length === 2, 'وفيه حدثا T1 (الأحدث فوق)', String(items.length));
    // 🔴 v1.41.0 — list_events بلا raw_payload، والـ payload بيتجاب لحدث واحد وقت الضغط
    is(!calls.some(c => c.action === 'get_event_payload'), '⛔ مفيش get_event_payload قبل الضغط على Raw Payload');
    is((await page.$eval('#histBody .raw-body pre', e => e.textContent)) === '', 'الـ payload فاضي قبل الضغط');
    await page.click('#histBody .tl-item.latest .raw-toggle');
    await page.waitForFunction(() => document.querySelector('#histBody .tl-item .raw-body pre').textContent.includes('"a": 1'), null, { timeout: 3000 }).catch(() => {});
    const pl = calls.filter(c => c.action === 'get_event_payload');
    is(pl.length === 1, 'الضغط نادى get_event_payload مرة واحدة', String(pl.length));
    is((await page.$eval('#histBody .tl-item.latest .raw-body pre', e => e.textContent)).includes('"a": 1'), 'الـ payload اتعرض منسّق');
    await page.click('#histBody .tl-item.latest .raw-toggle');
    await page.click('#histBody .tl-item.latest .raw-toggle');
    is(calls.filter(c => c.action === 'get_event_payload').length === 1, 'فتحه تاني من الكاش بلا نداء جديد');
  }
  is(errs.length === 0, 'صفر خطأ في الكونسول', errs.join(' | '));
  await ctx.close();
}

// ══════════════════════════════════════════════════════════════
sec('④ الخروج');
{
  const { ctx, page } = await open();
  await page.goto(`${BASE}/${PAGE}`);
  await page.waitForSelector('#eventsBody-main tr');
  await page.click('#activeUserBtn');
  await page.waitForURL(/index\.html/, { timeout: 4000 }).catch(() => {});
  is(/index\.html/.test(page.url()), 'الخروج اليدوي فوري بلا تأكيد ويرجّع للرئيسية', page.url());
  await ctx.close();
}

await browser.close(); server.close();
console.log(`\n${fail ? '❌' : '✅'} النتيجة: ${pass} عدّى · ${fail} فشل`);
process.exit(fail ? 1 : 0);
