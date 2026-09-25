// ══════════════════════════════════════════════════════════════
// docs/tools-check.mjs — فحص **عقد الدمج** للأدوات (v1.5.0 · وسّعت v1.10.0)
//
// 🔴 **ليه ملف رابع؟** التلاتة اللي قبله بيقيسوا حاجات تانية خالص:
//    · `rules-check.mjs`  → منطق الطوابير والجرد على مدخلات باظة.
//    · `queues-check.mjs` → الطابورين والشاشة الرئيسية على بيانات كاملة.
//    · `css-check.js`     → التوكنز بالـ parser.
//    الملف ده بيقيس حاجة واحدة بس: **إن الأدوات المدموجة بقت فعلاً
//    جوّه الهب** — جلسة واحدة · سر واحد · شِل واحد · وصفر بقايا من شاشة
//    الدخول والسر القديم.
//
// 🔴 **من v1.10.0 بقى فيه تلات أدوات في `TOOLS`** (`Order-Status-Updater.html` ·
//    `COD-Payment-Center.html` · `Partial-Delivery.html`) — مش اتنين. البنود
//    الجينيريك (⓪ عدا بند البايتات · ① · ② · ③ · ④ · ⑥) بتمشي على
//    التلاتة تلقائيًا لأنها بتلف على `TOOLS`. البنود الخاصة بمنطق كل أداة
//    (⑤ · بعض بنود ⑦) لسه مكتوبة يدوي لكل أداة — أضيف بند `partial-delivery`
//    لو منطقها اتغيّر يومًا بطريقة تستاهل فحص مخصّص.
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
// ⚠️ **`source` اختياري من v1.10.0.** الأداتين الأولانيين ليهم نسخة
//    مستقلة شغّالة في ريبو تاني (`source`)، والصفحة هنا **متولّدة** منه —
//    فيه بند تحت (⓪) بيشغّل `port-standalone.py` ويقارن البايتات، وده
//    محتاج المصدر يكون موجود جنب الهب. `Partial-Delivery.html` **مش
//    متولّدة** (الريبو المستقل بتاعها بقى Worker وبس، مفيش HTML يتولّد
//    منه)، فبند البايتات ده بيتخطّاها — راجع الفلترة على `t.source` تحت.
const TOOLS = [
  {
    page:      'Order-Status-Updater.html',
    title:     'تحديث حالة الأوردرات',
    workerKey: 'orderStatus',
    host:      'order-status-updater-worker.ecommoda-dev.workers.dev',
    oldSecret: 'order_status_worker_secret',
    tabs:      2,
    source:    'Order-Status-Updater',
  },
  {
    page:      'COD-Payment-Center.html',
    title:     'تحصيل الأوردرات COD',
    workerKey: 'codPayment',
    host:      'cod-payment-center-worker.ecommoda-dev.workers.dev',
    oldSecret: 'cod_payment_center_worker_secret',
    tabs:      2,
    source:    'COD-Payment-Center',
  },
  {
    page:      'Partial-Delivery.html',
    title:     'التسليم الجزئي',
    workerKey: 'partialDelivery',
    host:      'partial-delivery-worker.ecommoda-dev.workers.dev',
    oldSecret: 'partial_delivery_worker_secret',
    tabs:      2,
    // ⛔ صفر `source` عن قصد — راجع الشرح فوق.
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
// 🔴 **وبيمشي على الأداتين اللي ليهم `source` بس** — `Partial-Delivery.html`
//    مالهاش (مفيش HTML في ريبوها تتولّد منه)، فتضمينها هنا كان هيخلّي
//    `sourcesPresent` ترجع `false` **دايمًا** ويتخطّى بند البايتات حتى
//    للأداتين اللي فعلاً متولّدتين.
const GENERATED_TOOLS = TOOLS.filter(t => t.source);
const sourcesPresent = GENERATED_TOOLS.every(t => fs.existsSync(path.join(ROOT, '..', t.source, 'index.html')));
if (!sourcesPresent) {
  console.log('  ⏭️  الريبوهات الأصلية مش جنب الهب — بند «الصفحة متولّدة» اتخطّى');
} else {
  const before = GENERATED_TOOLS.map(t => read(t.page));
  try {
    execFileSync('python3', [path.join(ROOT, 'docs', 'port-standalone.py')], { stdio: 'pipe' });
    const same = GENERATED_TOOLS.every((t, i) => read(t.page) === before[i]);
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

// 🔴 **`.mtb-badge` — كلاس عاش في كتلة CSS شالها المولّد.** الكتلة اتشالت
//    على أساس «الـ shell بيملكها»، والـ shell بيملك `.main-tab-btn` فعلاً
//    **لكن مش `.mtb-badge`**. فالبادجين على تاب السجل كانوا بيترسموا **نص
//    عاري** بلا خلفية ولا إطار — وصفر خطأ في أي مكان.
// ⚠️ **والبند بيقرا الستايل المحسوب من العنصر نفسه** مش وجود اسم الكلاس في
//    الكود: كلاس موجود في الماركب من غير أي قاعدة CSS وراه بيعدّي على أي grep.
{
  const { ctx, page } = await freshPage();
  await mockWorker(page, []);
  await page.goto(`${BASE}/COD-Payment-Center.html`);
  await page.waitForTimeout(800);
  const st = await page.evaluate(() => {
    const el = document.querySelector('.mtb-badge');
    if (!el) return null;
    el.style.display = 'inline-block';           // مخفي افتراضيًا لحد ما يبقى فيه رقم
    const c = getComputedStyle(el);
    return { radius: parseFloat(c.borderRadius), bg: c.backgroundColor, size: parseFloat(c.fontSize) };
  });
  is(!!st, 'COD-Payment-Center.html: بادج التاب `.mtb-badge` موجود في الماركب', String(st));
  is(st && st.radius > 0 && st.bg !== 'rgba(0, 0, 0, 0)' && st.size > 0,
     '🔴 وليه ستايل محسوب فعلاً — مش نص عاري بعد ما المولّد شال كتلة التابات',
     JSON.stringify(st));
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
  await page.goto(`${BASE}/COD-Payment-Center.html`);
  await page.waitForTimeout(900);
  const res = await page.evaluate(async () => {
    try { await apiPostLegacy('preview', { orderNumber: '#55001' }); } catch {}
    return typeof apiPostLegacy === 'function' && typeof apiGet === 'function' && typeof apiPost === 'function';
  });
  is(res, 'COD-Payment-Center.html: التلات أشكال (\`apiGet\` · \`apiPost\` · \`apiPostLegacy\`) لسه موجودة');
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
  await page.goto(`${BASE}/COD-Payment-Center.html`);
  await page.waitForTimeout(900);
  const offs = await page.evaluate(() => {
    const off = iso => (toCairo(iso).getTime() - new Date(iso).getTime()) / 3600000;
    return { summer: off('2026-09-01T12:00:00Z'), winter: off('2026-11-01T12:00:00Z') };
  });
  is(offs.summer === 3, 'COD-Payment-Center.html: قبل التحويل الشتوي الإزاحة +٣', String(offs.summer));
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

// 🔴 **الشِل مابيقطعش مسار الأداة — وده بند اتكتب بعد عطل حقيقي.**
//    `focusScan()` كانت لسه بتسأل عن `#loginOverlay`، وهو عنصر شاشة
//    الدخول اللي الدمج شالها. `getElementById` بترجّع `null`،
//    و`.classList` بترمي **وتقطع الدالة اللي نادتها** — وأخطرها
//    `selectTargetLabel()`: بترسم الجدول الأول (فكل صف بياخد «⏳ جاري
//    تحميل الأسباب...» و`disabled`)، وبترمي **قبل سطر واحد** من
//    `ensureReasonValues()`. فنداء `reason_values` عمره ما بيتبعت،
//    والكاش بيفضل `null` **للأبد** (دي نقطة النداء الوحيدة في الصفحة)،
//    وعمود السبب بيفضل معطّل — **والسبب إلزامي**، يعني `Cancelled`
//    و`Returned` مقفولين بالكامل. وكل ده **بلا أي رسالة للموظف**.
// ⚠️ **والبند بيضغط الزرار فعلاً** — بند «صفر خطأ في الكونسول» بيقيس
//    **التحميل** بس، والرمي ده بيحصل عند أول اختيار حالة. فحص على
//    الصفحة الساكنة كان بيعدّي عليه، وعدّى فعلاً.
{
  const { ctx, page, errs } = await freshPage();
  const calls = []; await mockWorker(page, calls);
  await page.goto(`${BASE}/Order-Status-Updater.html`);
  await page.waitForTimeout(900);
  const before = calls.length;
  await page.evaluate(() => {
    const b = [...document.querySelectorAll('.status-btn')].find(x => x.dataset.label === 'Returned');
    if (b) b.click();
  });
  await page.waitForTimeout(900);
  const after = calls.slice(before);
  is(errs.filter(e => !/ERR_|net::/.test(e)).length === 0,
     '🔴 Order-Status-Updater.html: اختيار حالة `Returned` **بلا أي خطأ** — الرمي بيقطع باقي الدالة في صمت',
     errs.join('\n       '));
  is(after.some(c => c.action === 'reason_values'),
     '🔴 و`reason_values` **اتنادى فعلاً** — النداء ده آخر سطر في `selectTargetLabel()`',
     JSON.stringify(after.map(c => c.action)));
  const cache = await page.evaluate(() => reasonValuesCache);
  is(cache !== null,
     '⛔ و`reasonValuesCache` مابقاش `null` — «⏳ جاري تحميل الأسباب» بتتقري من الحالة دي',
     JSON.stringify(cache));
  await ctx.close();
}

// ══════════════════════════════════════════════════════════════
sec('⑥ رسايل الفشل بتسمّي الأداة');
// ══════════════════════════════════════════════════════════════
// ⚠️ الهب بينادي **ستة** Workers. رسالة «تعذّر الوصول» بلا اسم بتخلّي
//    الموظف يدوّر في الستة.
for (const t of TOOLS) {
  const { ctx, page } = await freshPage();
  await page.route('**/*.workers.dev/**', r => r.abort('failed'));
  await page.goto(`${BASE}/${t.page}`);
  await page.waitForTimeout(700);
  const msg = await page.evaluate(async () => {
    try { await apiGet('get_config'); return '(ما رماش)'; } catch (e) { return e.message; }
  });
  const label = JSON.parse(JSON.stringify(
    { orderStatus: 'تحديث حالة الأوردرات', codPayment: 'تحصيل الأوردرات COD', partialDelivery: 'التسليم الجزئي' }))[t.workerKey];
  is(msg.includes(label), `${t.page}: رسالة الفشل بتسمّي الأداة («${label}»)`, msg);
  await ctx.close();
}

// ══════════════════════════════════════════════════════════════
sec('⑦ التصدير — حارس المكتبة الخارجية (CDN محجوب)');
// ══════════════════════════════════════════════════════════════
//
// 🔴 **ExcelJS بتتحمّل من CDN، وشبكة المحطة بتحجبه** (بند مفتوح مسجّل في
//    `CLAUDE.md`). من غير حارس، `new ExcelJS.Workbook()` بيرمي
//    `ReferenceError` **عند الضغطة** — والدوال دي `async` ومتندّهة من
//    `onclick`، فالرمي بيتحوّل **رفض غير ممسوك**: الموظف مايشوفش أي حاجة.
// ⛔ **وتلاتة من أربع أزرار كانوا كده فعلاً** (مقيس 17-09-2026): اتنين
//    بصمت تام، وواحد آخر رسالة شافها الموظف «⏳ جاري تجهيز التصدير...»
//    وبعدها سكوت — يعني **ادعاء شغل شغّال** على تصدير مات.
// ⚠️ **والبند بيحجب الـ CDN فعلاً** مش بيقرا الكود — الحارس ممكن يتكتب صح
//    ويتحط بعد سطر بيرمي قبله.
// ⚠️ **والمقياس هو الرسالة لوحدها عن قصد.** بند «صفر رفض غير ممسوك» اتجرّب
//    واتشال: `page.evaluate` بيلفّ النداء في `try/catch` بتاعه، فالرفض
//    مابيوصلش لـ`unhandledrejection` أصلاً — البند كان **بيعدّي حتى على
//    الكود المكسور**، وبند مايقدرش يفشل ضوضاء بتتتجاهل.
//    ✅ والرسالة بتغطّي التلات حالات اللي اتقاست: الصمت التام · «⏳» معلّقة
//       · ورسالة إنجليزي تقنية — كلهم **مش** النص المطلوب.
{
  const EXPORTS = [
    { page: 'Order-Status-Updater.html', fn: 'exportLogXLSX',         label: 'تصدير الكل' },
    { page: 'Order-Status-Updater.html', fn: 'exportSelectedLogXLSX', label: 'تصدير المحدد' },
    { page: 'COD-Payment-Center.html',  fn: 'exportXLSX', arg: false, label: 'تصدير الكل' },
    { page: 'COD-Payment-Center.html',  fn: 'exportXLSX', arg: true,  label: 'تصدير المحدد' },
    // Partial-Delivery.html عندها زرار واحد بس (بلا تصدير محدد/select rows)
    { page: 'Partial-Delivery.html', fn: 'exportLogXLSX', label: 'تصدير XLSX' },
  ];
  for (const e of EXPORTS) {
    const { ctx, page } = await freshPage();
    await mockWorker(page, []);
    // ⚠️ **الـ Worker الوهمي لازم يرجّع صفوف هنا** — `buildAndDownloadWorkbook`
    //    بتفحص «مفيش بيانات» **قبل** الحارس، وده الترتيب الصح: «لا توجد
    //    بيانات للتصدير» أدقّ من «المكتبة ما اتحمّلتش» على سجل فاضي.
    //    فسجل فاضي هنا كان بيخلّي البند يقيس المسار الغلط.
    await page.route('**/*.workers.dev/**', r => r.fulfill({
      status: 200, contentType: 'application/json', headers: { 'Access-Control-Allow-Origin': '*' },
      body: JSON.stringify({ ok: true, success: true, version: '99.0.0', total: 1, cap: 5000, truncated: false,
        entries: [{ id: 1, timestamp: '2026-09-16T10:00:00Z', tool: 'order_status', type: 'update',
                    employee: 'A', order_id: '1', order_number: '#55001',
                    extra: { result: 'success', courier: 'C', targetLabel: 'Returned' } }] }) }));
    // 🔴 الحجب ده هو البند
    await page.route('**cdnjs.cloudflare.com/**', r => r.abort('failed'));
    await page.goto(`${BASE}/${e.page}`);
    await page.waitForTimeout(800);
    const out = await page.evaluate(async ([fn, arg]) => {
      const seen = [];
      new MutationObserver(ms => ms.forEach(m => m.addedNodes.forEach(n => seen.push(n.textContent))))
        .observe(document.getElementById('toastContainer'), { childList: true });
      // الحارس لازم يسبق أي شرط «مفيش بيانات» — فبنجهّز اختيار حقيقي
      window.__logGroups = [{ key: 'k', rows: [{ entry: { id: 1, timestamp: '2026-09-16T10:00:00Z',
        type: 'update', employee: 'A', order_number: '#55001', order_id: '1', extra: { result: 'success' } } }] }];
      try { selectedLogBatches.add('k'); } catch {}
      try { await window[fn](arg); } catch (err) { seen.push('THREW: ' + err.message); }
      await new Promise(r => setTimeout(r, 400));
      return { toasts: seen, excel: typeof ExcelJS !== 'undefined' };
    }, [e.fn, e.arg]);
    const tag = `${e.page} «${e.label}»`;
    is(out.excel === false, `${tag}: الـ CDN محجوب فعلاً في البند ده`, String(out.excel));
    is(out.toasts.some(t => (t || '').includes('مكتبة التصدير ما اتحمّلتش')),
       `🔴 ${tag}: الموظف بيشوف «مكتبة التصدير ما اتحمّلتش» — مش صمت ولا «⏳» معلّقة`,
       JSON.stringify(out.toasts));
    await ctx.close();
  }
}

// ══════════════════════════════════════════════════════════════
await browser.close();
server.close();
console.log(`\n${fail ? '❌' : '✅'} النتيجة: ${pass} عدّى · ${fail} فشل`);
process.exit(fail ? 1 : 0);
