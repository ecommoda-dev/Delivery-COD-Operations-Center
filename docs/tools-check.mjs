// ══════════════════════════════════════════════════════════════
// docs/tools-check.mjs — فحص **عقد الدمج** للأداتين (v1.5.0)
//
// 🔴 **ليه ملف رابع؟** التلاتة اللي قبله بيقيسوا حاجات تانية خالص:
//    · `rules-check.mjs`  → منطق الطوابير والجرد على مدخلات باظة.
//    · `queues-check.mjs` → الطابورين والشاشة الرئيسية على بيانات كاملة.
//    · `css-check.js`     → التوكنز بالـ parser.
//    الملف ده بيقيس حاجة واحدة بس: **إن الأداتين المدموجتين بقوا فعلاً
//    جوّه الهب** — جلسة واحدة · سر واحد · شِل واحد · وصفر بقايا من شاشة
//    الدخول والسر القديم.
//
// ⛔ **وهو مش بديل عن فحص الأداتين نفسهم.** منطق التحصيل ومنطق تحديث
//    الحالة **ما اتلمسوش** في الدمج، فحصهم في ريبوهاتهم. البنود هنا كلها
//    عن **الإطار**.
//
// 🔴 **وكل بند بيقرا الشاشة الفعلية مش الكود** — ما عدا القسم ⓪ (تصادم
//    الأسماء والتولّد)، وده بالطبيعة فحص ملفات.
//
// التشغيل:  npm i playwright --no-save && node docs/tools-check.mjs
//           PW_CHROMIUM=/path/to/chrome node docs/tools-check.mjs
// ══════════════════════════════════════════════════════════════
import { chromium } from 'playwright';
import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import { execFileSync } from 'node:child_process';

const ROOT = path.resolve(path.dirname(new URL(import.meta.url).pathname), '..');
const read = f => fs.readFileSync(path.join(ROOT, f), 'utf8');

// نسخة الهب — مصدر واحد (#24)
const SHELL_JS = read('shared/shell.js');
const HUB_VERSION = (SHELL_JS.match(/const TOOL_VERSION\s*=\s*'([^']+)'/) || [])[1];
if (!HUB_VERSION) { console.error('🔴 مقدرناش نقرا TOOL_VERSION من shared/shell.js'); process.exit(1); }

// 🔴 **الأداتين والعقد المتوقّع لكل واحدة.** القايمة دي هي اللي البنود
//    بتمشي عليها — إضافة أداة تالتة للمركز معناها سطر هنا، مش نسخ كتلة.
const TOOLS = [
  {
    page:      'order-status.html',
    title:     'تحديث حالة الأوردرات',
    workerKey: 'orderStatus',
    host:      'order-status-updater-worker.ecommoda-dev.workers.dev',
    oldSecret: 'order_status_worker_secret',
    tabs:      2,
    source:    'Order-Status-Updater',
  },
  {
    page:      'cod-payment.html',
    title:     'تحصيل الأوردرات COD',
    workerKey: 'codPayment',
    host:      'cod-payment-center-worker.ecommoda-dev.workers.dev',
    oldSecret: 'cod_payment_center_worker_secret',
    tabs:      2,
    source:    'COD-Payment-Center',
  },
];

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
const ok  = (m) => { pass++; console.log('  ✅', m); };
const bad = (m, d='') => { fail++; console.log('  ❌', m, d ? `\n       ${d}` : ''); };
const is  = (cond, m, d='') => cond ? ok(m) : bad(m, d);
const sec = (t) => console.log(`\n══ ${t} ══`);

const launchOpts = { args: ['--no-sandbox'] };
if (process.env.PW_CHROMIUM) launchOpts.executablePath = process.env.PW_CHROMIUM;
const browser = await chromium.launch(launchOpts);

// ── Worker وهمي: بيرد على كل حاجة، وبيسجّل كل نداء ──────────────
// ⚠️ **النسخة اللي بيرجّعها أعلى من أي حد أدنى عن قصد** — من غير كده
//    حارس النسخة بيولّع «Worker نسخة قديمة» في **كل** بند، فالبنود تفشل
//    لسبب مالوش علاقة باللي بتقيسه.
function mockWorker(page, calls) {
  return page.route('**/*.workers.dev/**', async route => {
    const req = route.request();
    let body = null;
    try { body = req.postData() ? JSON.parse(req.postData()) : null; } catch {}
    calls.push({
      // 🔴 **مين بعت النداء.** بعد التحويل للرئيسية الصفحة دي بتنادي
      //    `get_employees` و`get_config` للخمس Workers — والبند اللي
      //    بيعدّ النداءات بلا تفرقة كان بيحسبها على صفحة الأداة.
      from: (() => { try { return req.frame().url(); } catch { return ''; } })(),
      url: req.url(), method: req.method(),
      auth: req.headers()['authorization'] || '',
      action: new URL(req.url()).searchParams.get('action') || (body && body.action) || '',
      body,
    });
    await route.fulfill({
      status: 200, contentType: 'application/json',
      headers: { 'Access-Control-Allow-Origin': '*' },
      body: JSON.stringify({ ok: true, success: true, version: '99.0.0', WORKER_VERSION: '99.0.0',
                             checks: [], entries: [], logs: [], orders: [], employees: [],
                             couriers: [], values: [], results: [], total: 0 }),
    });
  });
}

const SESSION = { v: 1, username: 'Ahmed_Ibraheem', displayName: 'Ahmed Ibraheem', loginAt: '2026-09-16T08:00:00.000Z' };
const HUB_SECRET = 'HUB_SECRET_VALUE';
const OLD_SECRET = 'OLD_TOOL_SECRET_VALUE';

async function freshPage({ session = true, secret = true } = {}) {
  const ctx = await browser.newContext();
  const page = await ctx.newPage();
  const errs = [];
  page.on('pageerror', e => errs.push('pageerror: ' + e.message));
  page.on('console', m => { if (m.type() === 'error') errs.push('console: ' + m.text()); });
  await page.addInitScript(([s, sess, hub, old, useSess, useSec]) => {
    try {
      if (useSess) sessionStorage.setItem(s, JSON.stringify(sess));
      if (useSec)  localStorage.setItem('delivery_cod_ops_worker_secret', hub);
      // 🔴 **السرّين القدام بيتزرعوا عن قصد** — عشان لو الصفحة لسه بتقرا
      //    واحد منهم البند يمسكها. الوجود لوحده مش مشكلة (المفتاح ما
      //    اتمسحش من متصفحات الموظفين)، القراءة هي المشكلة.
      localStorage.setItem('order_status_worker_secret', old);
      localStorage.setItem('cod_payment_center_worker_secret', old);
    } catch {}
  }, ['dco_session', SESSION, HUB_SECRET, OLD_SECRET, session, secret]);
  return { ctx, page, errs };
}

// ══════════════════════════════════════════════════════════════
sec('⓪ فحص ملفات — تصادم الأسماء والتولّد');
// ══════════════════════════════════════════════════════════════

// 🔴 **أخطر بند في الملف.** `shell.js` والصفحة سكربتين منفصلين بس في
//    **نفس النطاق العام**. إعادة تعريف `const`/`let` بنفس الاسم بترمي
//    «Identifier has already been declared» و**بتقتل سكربت الصفحة كله**:
//    الصفحة بتفتح، الشِل شغّال، وكل زرار في الأداة مابيعملش حاجة.
// ⚠️ **عمود صفر بالظبط — بلا `\s*` في أول النمط.** `const` جوّه دالة
//    نطاقها الدالة، فمافيش تصادم منها؛ ونمط متساهل بيطلّع عشرات
//    الأسماء الوهمية (`d` · `rows` · `btn`) والبند يبقى ضوضاء بيتتجاهل.
const topDecls = (src) => {
  const out = new Set();
  for (const m of src.matchAll(/^(?:const|let)\s+([A-Za-z_$][\w$]*)/gm)) out.add(m[1]);
  for (const m of src.matchAll(/^(?:const|let)\s*\{([^}]*)\}\s*=/gm))
    for (const part of m[1].split(',')) {
      const n = part.split(':').pop().trim();
      if (n) out.add(n);
    }
  return out;
};
const shellDecls = topDecls(SHELL_JS);
for (const t of TOOLS) {
  const html = read(t.page);
  const inline = [...html.matchAll(/<script>([\s\S]*?)<\/script>/g)].map(m => m[1]).join('\n');
  const clash = [...topDecls(inline)].filter(n => shellDecls.has(n));
  is(clash.length === 0,
     `🔴 ${t.page}: صفر تصادم \`const\`/\`let\` مع \`shared/shell.js\` — التصادم بيقتل سكربت الصفحة كله`,
     clash.join(' · '));
}

// كتلة توكنز في الصفحة — مسموح `--container-max` **بس** (Tier M)
for (const t of TOOLS) {
  const html = read(t.page);
  const roots = [...html.matchAll(/:root\s*\{([^}]*)\}/g)].map(m => m[1]);
  const vars  = roots.flatMap(b => [...b.matchAll(/--[a-z0-9-]+/g)].map(m => m[0]));
  const extra = vars.filter(v => v !== '--container-max');
  is(extra.length === 0,
     `${t.page}: مفيش كتلة توكنز في الصفحة — \`--container-max\` بس (استثناء Tier M الموثّق)`,
     extra.join(' · '));
}

// الصفحة متولّدة — تشغيل المولّد تاني لازم يدّي **نفس البايتات**
// ⚠️ بيتخطّى لو الريبوهات الأصلية مش جنب بعض (مش كل بيئة فيها التلاتة).
const sourcesPresent = TOOLS.every(t => fs.existsSync(path.join(ROOT, '..', t.source, 'index.html')));
if (!sourcesPresent) {
  console.log('  ⏭️  الريبوهات الأصلية مش جنب الهب — بند «الصفحة متولّدة» اتخطّى');
} else {
  const before = TOOLS.map(t => read(t.page));
  try {
    execFileSync('python3', [path.join(ROOT, 'docs', 'port-standalone.py')], { stdio: 'pipe' });
    const same = TOOLS.every((t, i) => read(t.page) === before[i]);
    is(same, '🔴 الصفحتان **متولّدتان فعلاً** — تشغيل `docs/port-standalone.py` بيدّي نفس البايتات',
       'فيه تعديل يدوي في الملف المتولّد — هيضيع مع أول تشغيل');
  } catch (e) {
    bad('المولّد `docs/port-standalone.py` بيشتغل من غير خطأ', String(e.stderr || e).slice(0, 300));
  }
}

// ══════════════════════════════════════════════════════════════
sec('① بوابة الجلسة — دخول واحد للمركز كله');
// ══════════════════════════════════════════════════════════════
for (const t of TOOLS) {
  const { ctx, page } = await freshPage({ session: false });
  const calls = []; await mockWorker(page, calls);
  await page.goto(`${BASE}/${t.page}`);
  await page.waitForTimeout(700);
  const u = new URL(page.url());
  is(u.pathname.endsWith('/index.html') && u.searchParams.get('next') === t.page,
     `🔴 ${t.page}: بلا جلسة → تحويل للرئيسية ومعاه \`?next=\``, page.url());
  // 🔴 **وصفر نداء قبل التحويل** — من غير الرمي في `requireSession` باقي
  //    السكربت بيكمّل وبينادي الـ Worker **أثناء** ما التحويل شغّال.
  // ⚠️ **المقارنة على المسار مش على الرابط كله** — رابط التحويل نفسه
  //    فيه اسم الصفحة في `?next=`، فـ`includes` كانت بتحسب نداءات
  //    الرئيسية على صفحة الأداة.
  const fromTool = calls.filter(c => { try { return new URL(c.from).pathname.endsWith('/' + t.page); } catch { return false; } });
  is(fromTool.length === 0, `⛔ ${t.page}: صفر نداء Worker قبل التحويل — نداء ضايع ووميض شاشة`,
     fromTool.map(c => c.action).join(' · '));
  await ctx.close();
}

for (const t of TOOLS) {
  const { ctx, page } = await freshPage();
  await mockWorker(page, []);
  await page.goto(`${BASE}/${t.page}`);
  await page.waitForTimeout(900);
  is(await page.$('#loginOverlay') === null, `⛔ ${t.page}: مفيش شاشة دخول في الصفحة`);
  is(await page.$('.pin-key') === null,      `⛔ ${t.page}: ولا كيباد PIN`);
  is(await page.$('#loginSettingsBtn') === null, `⛔ ${t.page}: ولا زرار إعدادات جوّه كارت دخول`);
  await ctx.close();
}

// ══════════════════════════════════════════════════════════════
sec('② السر — قيمة واحدة لمجموعة `delivery_cod_ops`');
// ══════════════════════════════════════════════════════════════
for (const t of TOOLS) {
  const { ctx, page } = await freshPage();
  const calls = []; await mockWorker(page, calls);
  await page.goto(`${BASE}/${t.page}`);
  await page.waitForTimeout(1200);
  is(calls.length > 0, `${t.page}: الصفحة بتنادي الـ Worker فعلاً بعد الدخول`, 'صفر نداء');
  const bad1 = calls.filter(c => c.auth !== `Bearer ${HUB_SECRET}`);
  is(bad1.length === 0, `🔴 ${t.page}: كل نداء بيحمل **سر الهب** مش السر القديم`,
     bad1.map(c => c.auth).join(' · '));
  const wrongHost = calls.filter(c => !c.url.includes(t.host));
  is(wrongHost.length === 0, `${t.page}: وكل النداءات على Worker الأداة نفسها (\`${t.host}\`)`,
     wrongHost.map(c => c.url).join(' · '));
  await ctx.close();
}

// بلا سر → شاشة الإعدادات بتفتح، ومفيش نداء بسر فاضي
{
  const t = TOOLS[0];
  const { ctx, page } = await freshPage({ secret: false });
  const calls = []; await mockWorker(page, calls);
  await page.goto(`${BASE}/${t.page}`);
  await page.waitForTimeout(900);
  is(calls.length === 0, `⛔ ${t.page}: بلا سر → **صفر نداء** (مش نداء بـ\`Bearer \` فاضي)`,
     calls.map(c => c.auth).join(' · '));
  await ctx.close();
}

// ══════════════════════════════════════════════════════════════
sec('③ الشِل — هيدر واحد ونسخة واحدة');
// ══════════════════════════════════════════════════════════════
for (const t of TOOLS) {
  const { ctx, page, errs } = await freshPage();
  await mockWorker(page, []);
  await page.goto(`${BASE}/${t.page}`);
  await page.waitForTimeout(1200);

  is((await page.textContent('.app-title-text h1')).trim() === t.title,
     `${t.page}: الهيدر الموحّد بعنوان الأداة`, await page.textContent('.app-title-text h1'));
  is(await page.isVisible('.hbtn-home'), `${t.page}: زرار 🏠 الرئيسية موجود — المخرج للمركز`);
  is((await page.textContent('#activeUserBtn')).includes(SESSION.displayName),
     `${t.page}: زرار الموظف باسم **جلسة الهب**`);
  is(await page.getAttribute('#activeUserBtn', 'aria-label') === 'تسجيل الخروج',
     `${t.page}: وعليه \`aria-label="تسجيل الخروج"\` — الـ ✕ لوحده مايتقريش`);

  const ver = (await page.textContent('#verBtn')).trim();
  const cl  = (await page.textContent('#clLatestVerBadge')).trim();
  is(ver.startsWith(HUB_VERSION), `${t.page}: زرار النسخة بيقول **نسخة الهب**`, `${ver} ≠ ${HUB_VERSION}`);
  is(cl === HUB_VERSION, `${t.page}: وبادج سجل التحديثات مطابق له (مصدر واحد · #24)`, `${cl} ≠ ${HUB_VERSION}`);

  // مودال الإعدادات والتوست **بيتحقنوا من الـ shell** — نسخة تانية في
  // الصفحة معناها مودالين بنفس الـ id، والتاني بيفوز في صمت.
  is(await page.$$eval('#settingsOverlay', n => n.length) === 1,
     `${t.page}: مودال إعدادات **واحد** — متحقون من \`dcoSharedModals()\``);
  is(await page.$$eval('#toastContainer', n => n.length) === 1,
     `${t.page}: وحاوية توست واحدة`);
  is((await page.textContent('#settingsOverlay')).includes('delivery_cod_ops'),
     `${t.page}: ونص الإعدادات بيسمّي مجموعة السر`);

  is((await page.$$('.main-tab-btn')).length === t.tabs, `${t.page}: تابات الأداة زي ما هي`);
  is(errs.filter(e => !/ERR_|net::/.test(e)).length === 0,
     `${t.page}: صفر خطأ في الكونسول`, errs.join('\n       '));
  await ctx.close();
}

// ══════════════════════════════════════════════════════════════
sec('④ الشاشة الرئيسية — قسم «أدوات»');
// ══════════════════════════════════════════════════════════════
{
  const { ctx, page } = await freshPage();
  await mockWorker(page, []);
  await page.goto(`${BASE}/index.html`);
  await page.waitForTimeout(1200);
  const cards = await page.$$eval('.dco-tools-grid .dco-tool',
    els => els.map(e => ({ href: e.getAttribute('href'),
                           name: e.querySelector('.dco-card-name')?.textContent.trim(),
                           hasCount: !!e.querySelector('.dco-count, .dco-num'),
                           target: e.getAttribute('target') })));
  is(cards.length === TOOLS.length, `قسم «أدوات» فيه ${TOOLS.length} كارت`, JSON.stringify(cards));
  for (const t of TOOLS) {
    const c = cards.find(x => x.href === t.page);
    is(!!c, `كارت «${t.title}» بيفتح \`${t.page}\``, JSON.stringify(cards));
    is(c && c.name === t.title, `واسمه مطابق لعنوان الصفحة — اسمين لنفس الأداة بيتعلّموا مرتين`, c && c.name);
    // 🔴 **بلا عدّاد عن قصد** (`shell.css` §DCO-HOME): عدّاد حيّ = جلب
    //    تقيل عند كل دخول وكل تحديث تلقائي، والأداتين دول مالهمش طابور.
    is(c && !c.hasCount, `⛔ وبلا عدّاد — الأدوات شغل مش طابور`);
    // ⛔ **مش رابط خارجي** — `target` معناه إن الكارت بيودّي على النسخة
    //    القديمة في ريبوها: دخول تاني وسر تاني.
    is(c && !c.target, `⛔ وبيفتح في نفس التاب — مش رابط للنسخة القديمة`);
  }
  await ctx.close();
}

// ══════════════════════════════════════════════════════════════
sec('⑤ منطق الأداة ما اتلمسش — البنود اللي الدمج كان ممكن يكسرها');
// ══════════════════════════════════════════════════════════════

// 🔴 **الراوتينج المختلط بتاع أداة التحصيل.** الـ Worker بيقرا `action` من
//    **جسم** الطلب في `pay`/`refund`/`preview`/`getCourierOrders`. لو
//    الدمج حوّلهم لـ`?action=` الـ Worker بيرجّع «action غير معروف» على
//    **فعل مالي**.
{
  const { ctx, page } = await freshPage();
  const calls = []; await mockWorker(page, calls);
  await page.goto(`${BASE}/cod-payment.html`);
  await page.waitForTimeout(900);
  const res = await page.evaluate(async () => {
    try { await apiPostLegacy('preview', { orderNumber: '#55001' }); } catch {}
    return typeof apiPostLegacy === 'function' && typeof apiGet === 'function' && typeof apiPost === 'function';
  });
  is(res, 'cod-payment.html: التلات أشكال (\`apiGet\` · \`apiPost\` · \`apiPostLegacy\`) لسه موجودة');
  const legacy = calls.find(c => c.body && c.body.action === 'preview');
  is(!!legacy, '🔴 و`apiPostLegacy` لسه بيبعت `action` في **جسم** الطلب',
     JSON.stringify(calls.slice(-1)));
  is(legacy && !new URL(legacy.url).searchParams.get('action'),
     '⛔ ومفيش `?action=` في الـ URL — الـ Worker بيقرا من الجسم في المسار ده');
  is(legacy && legacy.method === 'POST', 'و`POST` مش `GET`');
  await ctx.close();
}

// 🔴 **التوقيت في أداة التحصيل — كان إزاحة ثابتة (+٣)، وده كاسر.**
//    مصر بترجع UTC+2 يوم 29-10-2026، والإزاحة الثابتة معناها إن كل وقت
//    معروض وكل حدود «فترة سريعة» تغلط **بساعة** والأداة مابتشتكيش.
{
  const { ctx, page } = await freshPage();
  await mockWorker(page, []);
  await page.goto(`${BASE}/cod-payment.html`);
  await page.waitForTimeout(900);
  const offs = await page.evaluate(() => {
    const off = iso => (toCairo(iso).getTime() - new Date(iso).getTime()) / 3600000;
    return { summer: off('2026-09-01T12:00:00Z'), winter: off('2026-11-01T12:00:00Z') };
  });
  is(offs.summer === 3, 'cod-payment.html: قبل التحويل الشتوي الإزاحة +٣', String(offs.summer));
  is(offs.winter === 2, '🔴 وبعد 29-10-2026 بتبقى **+٢ لوحدها** — الصفحة خرجت من نطاق البند ده',
     String(offs.winter));
  // والرمز جوّه الدالة مش في الـ HTML — وإلا بيطلع 📅 مرتين
  const fmts = await page.evaluate(() => ({ d: formatDate('2026-09-16T10:00:00Z'),
                                            t: formatTimeOnly('2026-09-16T10:00:00Z') }));
  is(fmts.d.startsWith('📅') && (fmts.d.match(/📅/g) || []).length === 1,
     'وصيغة التاريخ فيها 📅 **مرة واحدة**', fmts.d);
  is(fmts.t.startsWith('🕐') && (fmts.t.match(/🕐/g) || []).length === 1,
     'وصيغة الوقت فيها 🕐 مرة واحدة', fmts.t);
  await ctx.close();
}

// 🔴 **حارس `Invalid Date`** — الصفحتين بقوا على نسخة الـ shell، وهي
//    بترجّع `—` بدل ما ترمي `RangeError` يوقّع رسم الجدول كله.
for (const t of TOOLS) {
  const { ctx, page } = await freshPage();
  await mockWorker(page, []);
  await page.goto(`${BASE}/${t.page}`);
  await page.waitForTimeout(900);
  const r = await page.evaluate(() => {
    try { return { n: formatDate(null), b: formatDate('مش تاريخ'), threw: false }; }
    catch (e) { return { threw: true, msg: e.message }; }
  });
  is(!r.threw && r.n === '—' && r.b === '—',
     `${t.page}: تاريخ باظ أو \`null\` بيدّي \`—\` **من غير رمي**`, JSON.stringify(r));
  await ctx.close();
}

// ══════════════════════════════════════════════════════════════
sec('⑥ رسايل الفشل بتسمّي الأداة');
// ══════════════════════════════════════════════════════════════
// ⚠️ الهب بينادي **خمس** Workers. رسالة «تعذّر الوصول» بلا اسم بتخلّي
//    الموظف يدوّر في الخمسة.
for (const t of TOOLS) {
  const { ctx, page } = await freshPage();
  await page.route('**/*.workers.dev/**', r => r.abort('failed'));
  await page.goto(`${BASE}/${t.page}`);
  await page.waitForTimeout(700);
  const msg = await page.evaluate(async () => {
    try { await apiGet('get_config'); return '(ما رماش)'; } catch (e) { return e.message; }
  });
  const label = JSON.parse(JSON.stringify(
    { orderStatus: 'تحديث حالة الأوردرات', codPayment: 'تحصيل الأوردرات COD' }))[t.workerKey];
  is(msg.includes(label), `${t.page}: رسالة الفشل بتسمّي الأداة («${label}»)`, msg);
  await ctx.close();
}

// ══════════════════════════════════════════════════════════════
await browser.close();
server.close();
console.log(`\n${fail ? '❌' : '✅'} النتيجة: ${pass} عدّى · ${fail} فشل`);
process.exit(fail ? 1 : 0);
