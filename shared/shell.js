// ══════════════════════════════════════════════════════════════
// shared/shell.js — مركز عمليات الشحن والتحصيل (Delivery-COD-Operations-Center)
// skills: html-builder v6.6.0 · worker-builder v3.3.0 · constants v2.6.0
//         · order-lifecycle v1.8.0 — 15-09-2026
// ══════════════════════════════════════════════════════════════
//
// 🔴 **نسخة واحدة مضمّنة — ممنوع الملف ده يتنسخ في أي صفحة.**
//    نسخة تانية معناها إن الصفحتين هيفترقوا مع أول تعديل، وده بالظبط
//    الوضع اللي أنتج باج R1 في الستاك ده (منطق واحد في ملفين، اتصلح في
//    واحد وفضل مكسور في التاني **لشهور**).
//
// 🔴 **والملف ده مالوش نسخة في هب المخزن والعكس.** الهبين ريبوهين منفصلين
//    وكل واحد على GitHub Pages بتاعه، فالنسخ حتمي — واللي بيقلل الخطر إن
//    **الـ chrome هو المشترك** (هيدر · توست · مودالات · لوحة «آخر تحديث»)
//    وأي تعديل عليه يتعمل في الاتنين في نفس التمريرة. أما §QUEUE-RULES تحت
//    **فمالهاش أي مقابل هناك** — قواعد الأداتين دول عايشة هنا بس.
//
// 🔴 **القايمة السودا — الدوال دي ممنوع تدخل هنا:**
//
//      switchMainTab · finishLogin · runDiag · renderTable · applySort
//      sortConfig · msState · msToggle · anyFilterActive · clearAllFilters
//
//    منطقهم بيفرق من صفحة للتانية فعلاً، مش مجرد تنسيق. حطّهم هنا =
//    تكسر صفحة أو اتنين **بصمت**. كل واحد فيهم يفضل في صفحته.
//
// ══════════════════════════════════════════════════════════════

// ══════════════════════════════════════════════════════════════
// §CONFIG — الـ Workers في مكان واحد
// ══════════════════════════════════════════════════════════════
//
// ⚠️ الروابط **مش أسرار** (Standards #28) — الحماية في السر + CORS
//    allowlist. مالهاش مكان في شاشة الإعدادات ولا في التخزين المحلي.
//
// كل Worker ومعاه **أقل نسخة** الهب بيشتغل معاها، والحد لكل Worker لوحده —
// مالهمش أي علاقة ببعض ولا بـ `TOOL_VERSION`.
// ⚠️ `min` مايترفعش إلا لما الهب **يعتمد فعلاً** على حاجة جديدة في الـ
//    Worker ده (Standards #29). ترفيعه بلا سبب = تحذير كاذب على أي
//    rollback مشروع.
const DCO_WORKERS = {
  // `1.0.0` = أول نسخة، ومفيش أي نسخة أقدم منشورة — فالحارس هنا **مش**
  // بيمنع rollback، هو بيمسك الحالة الوحيدة الممكنة: الـ Worker ما اتنشرش
  // أصلاً أو الـ Promote ناقص، فـ`get_config` بيرجّع 404/401 والحارس
  // بيسمّي الأداة بالاسم بدل ما الموظف يدوّر.
  ready:   { url: 'https://ready-orders-worker.ecommoda-dev.workers.dev',   min: '1.0.0', label: 'طابور الجاهز للشحن' },
  shipped: { url: 'https://shipped-orders-worker.ecommoda-dev.workers.dev', min: '1.0.0', label: 'طابور المشحون' },
  // 🔴 **Worker التغليف — للدخول بس.** الهب ده مالوش Worker خاص بيه
  //    (زي هب المخزن بالظبط)، والدخول الموحّد بيحصل عبر
  //    `orders-packing-checker-worker`: `get_employees` · `check_employee`
  //    · `verify_employee` · `log_logout`.
  // ⚠️ **و`min` هنا `2.5.0` مش `2.6.0`** — الهب ده **مش** معتمد على
  //    `eligibility`/`profile` (دول بتوع شاشة التغليف في هب المخزن).
  //    اللي الهب ده معتمد عليه فعلاً هو باراميتر `appId` (أول نسخة فيها
  //    `2.5.0`) — من غيره الدخول بيتسجّل تحت `pack_checker` **في صمت**.
  //    ترفيعه لـ`2.6.0` كان هيولّع تحذير كاذب على rollback مشروع
  //    (Standards #29).
  // 🔴 **بند حاجز مفتوح:** `delivery_cod_ops_center` لازم تتضاف لـ`AUTH_APPS`
  //    في Worker التغليف — القايمة **بيضا مقفولة**، والقيمة اللي مش فيها
  //    بترجع للاسم الافتراضي **بدون خطأ**. يعني الدخول هيشتغل والصف هيتكتب
  //    `pack_checker`. لما تتضاف، `pack.min` يترفع في **نفس التسليم**
  //    (`worker-builder` §appId قاعدة ٤).
  pack:    { url: 'https://orders-packing-checker-worker.ecommoda-dev.workers.dev', min: '2.5.0', label: 'التغليف (الدخول)' },
};

const TOOL_VERSION = 'v1.0.0';                       // الهب كله — مصدر واحد (#24)

// 🔴 **مفتاح سر مجموعة `warehouse_ops` — مش مفتاح جديد، والقرار ده متعمّد.**
//    الهب ده بينادي `orders-packing-checker-worker` للدخول، وهو **عضو في
//    المجموعة دي** — يعني الهب محتاج سرها غصب عنه. لو الأداتين الجديدتين
//    أخدوا مجموعة تانية، شاشة الإعدادات كان لازم يبقى فيها **حقلين سر**،
//    والموظف يلزق قيمتين على كل جهاز — وده بالظبط البديل اللي **اتّرفض**
//    في هب المخزن (Standards #39: سر واحد للمحطة).
// ✅ **والمكسب:** الهبين على **نفس الـ origin**
//    (`https://ecommoda-dev.github.io`)، و`localStorage` مشترك بين المسارات
//    — فأي جهاز مضبوط على هب المخزن بيبقى **مضبوط هنا من غير أي خطوة**.
// ⛔ **والثمن مكتوب:** الأداتين الجديدتين بينضموا لمجموعة `warehouse_ops`،
//    والانضمام **لازم يتسجّل** في `ecommoda-constants` →
//    `references/secret-groups.md` (قاعدة ٢). عضو غير مسجّل = إجراء
//    التدوير بيتكسر **بصمت**: تغيّر ٧ وتنسى التامن، والنتيجة `401` في أداة
//    محدش هيعرف سببها.
const LS_SECRET    = 'warehouse_ops_worker_secret';

// 🔴 قيمة `tool` في D1 — **للدخول والخروج بس**. الأداتين دول **قراءة بحتة**
//    ومابيكتبوش ولا صف، فمفيش أي قيمة `type` تشغيلية هنا.
// ⚠️ والقيمة دي لازم تتسجّل في `ecommoda-constants` §7 **قبل أول
//    `writeLog`** (Rule 7) — والقاعدة دي اتخرقت **ست مرات** في الستاك ده،
//    وكل مرة الادعاء كان مكتوب في `CLAUDE.md`. التحقق الوحيد المقبول
//    `grep` على المهارة نفسها.
const DCO_APP_ID   = 'delivery_cod_ops_center';
const SHOP_HANDLE  = '6c7e1a-53';

// 🔴 السر (`LS_SECRET`) هو **الحاجة الوحيدة** في التخزين المحلي في الريبو
//    كله (#28 · #39). الهوية في sessionStorage، والروابط ثوابت في الكود.
function getSecret()      { try { return localStorage.getItem(LS_SECRET) || ''; } catch { return ''; } }
function setSecret(v)     { try { localStorage.setItem(LS_SECRET, v); } catch {} }
function isConfigured()   { return getSecret().trim().length > 0; }

// ══════════════════════════════════════════════════════════════
// §SESSION — الهوية في sessionStorage (استثناء موثّق من بند ٥)
// ══════════════════════════════════════════════════════════════
//
// ⚠️ `sessionStorage` **مش** تخزين دائم — بيموت مع قفل التاب، ولكل تاب
//    لوحده، ومابيديش أي صلاحية جديدة (`employee` بيتبعت من العميل في كل
//    كتابة — الـ Worker بيتحقق من السر مش من هوية الموظف). ده استثناء
//    موثّق من `ecommoda-html-builder` بند ٥، سببه إن الهب متعدد الصفحات
//    فالذاكرة مابتعيشش عبر التنقل.
//
// 🔴 **المفتاح `dco_session` مش `woc_session` — والفرق مقصود.** الهبين على
//    **نفس الـ origin**، يعني `sessionStorage` مشترك بينهم حرفيًا. مفتاح
//    موحّد كان معناه إن الموظف اللي دخل محطة المخزن يلاقي نفسه **داخل هنا
//    من غير ما يدخل** — والنتيجة إن صف الدخول بتاع المركز ده **مايتكتبش
//    خالص**، فسؤال «مين فتح مركز الشحن النهاردة؟» يفضل بلا إجابة.
//    ⚠️ الثمن: الموظف بيدخل مرتين لو فتح الاتنين. ده **مقبول ومقصود** —
//       دي محطتان مختلفتان، والدخول هو الأثر الوحيد اللي بيقول مين كان فين.
//
// ⚠️ كل قراءة/كتابة جوّه try/catch — المتصفح في وضع خاص أو بحظر التخزين
//    بيرمي على **مجرد الوصول**، والرمي ده كان هيمنع فتح الصفحة أصلاً.
const DCO_SESSION_KEY   = 'dco_session';
const DCO_CACHE_READY   = 'dco_queue_ready';
const DCO_CACHE_SHIPPED = 'dco_queue_shipped';
const DCO_CACHE_TTL_MS  = 15 * 60 * 1000;      // ١٥ دقيقة

function getSession() {
  try {
    const raw = sessionStorage.getItem(DCO_SESSION_KEY);
    if (!raw) return null;
    const s = JSON.parse(raw);
    // `v` نسخة العقد — لو الشكل اتغيّر، القديم بيترفض بدل ما يتقري غلط
    if (s?.v !== 1 || !s.username || !s.displayName) return null;
    return s;
  } catch { return null; }
}

function setSession(username, displayName) {
  try {
    sessionStorage.setItem(DCO_SESSION_KEY, JSON.stringify({
      v: 1, username, displayName, loginAt: new Date().toISOString(),
    }));
  } catch {}
}

function clearSession() {
  try {
    sessionStorage.removeItem(DCO_SESSION_KEY);
    sessionStorage.removeItem(DCO_CACHE_READY);
    sessionStorage.removeItem(DCO_CACHE_SHIPPED);
  } catch {}
}

// الحارس — بيتنادى في **أول سطر** في كل صفحة غير `index.html`.
//
// 🔴 **بيرمي عن قصد.** من غير الرمي، باقي سكربت الصفحة بيكمّل تنفيذ
//    وبينادي الـ Worker وبيرسم جدول **أثناء** ما التحويل شغّال — نداءات
//    ضايعة ووميض شاشة. الرمي بيوقف السكربت فورًا.
//
// ⚠️ `location.replace` مش `location.href` — عشان صفحة محمية مايتسجّلش
//    لها مدخل في تاريخ المتصفح. زرار الرجوع بعد الخروج مايرجعش لشاشة فاضية.
function requireSession() {
  const s = getSession();
  if (!s) {
    const next = location.pathname.split('/').pop() + location.search;
    location.replace(`index.html?next=${encodeURIComponent(next)}`);
    throw new Error('no session');
  }
  return s;
}

// ── كاش الطوابير ──────────────────────────────────────────────
// الشاشة الفاضية أسوأ من شاشة قديمة **مختومة بوقتها**.
function cacheGet(key) {
  try {
    const raw = sessionStorage.getItem(key);
    if (!raw) return null;
    const c = JSON.parse(raw);
    if (!c?.at || !c?.data) return null;
    return { ...c, ageMs: Date.now() - new Date(c.at).getTime() };
  } catch { return null; }
}

function cacheSet(key, data) {
  // ⚠️ QuotaExceededError ممكن يحصل — الكاش **تحسين مش شرط**، فالفشل
  //    بيتبلع بصمت والصفحة بتشتغل عادي بجلب جديد.
  try { sessionStorage.setItem(key, JSON.stringify({ at: new Date().toISOString(), data })); }
  catch {}
}

// ══════════════════════════════════════════════════════════════
// §API — مصنع بدل دوال عامة
// ══════════════════════════════════════════════════════════════
//
// ⚠️ بتفرّق بين تلات حالات كانوا بيدّوا نفس الرسالة الغامضة:
//    «الـ Worker رد بخطأ» · «مقدرناش نوصله أصلاً» (CORS/واقع) · «رد مش JSON».
//    والرسالة بتسمّي **الأداة** — الهب بينادي تلات Workers، ورسالة بلا
//    اسم بتخلّي الموظف يدوّر في التلاتة.
//
// 🔴 **مهلة صريحة على كل نداء.** من غيرها الـ Worker الواقف بيسيب الزرار
//    معطّل والـ spinner بيلف **للأبد** (المتصفح ممكن يستنى دقايق)، والموظف
//    بيفتكر إن الأداة اتعلّقت فبيعمل refresh. ودي مش حالة نظرية — هي عيلة
//    الفشل اللي أنتجت ٥٩ صف فشل كذّاب في سجل سكانر المرتجعات.
// ⚠️ الرقم طويل عن قصد — طابور بمئات الأوردرات بياخد عشرات الثواني على
//    شوبيفاي، والقطع بدري أسوأ من الانتظار.
const DCO_API_TIMEOUT_MS = 90000;

function dcoApi(worker) {
  const base = worker.url.replace(/\/$/, '');

  async function apiRequest(url, opts) {
    const secret = getSecret();
    if (!secret) { openSettings(); throw new Error('الإعدادات غير مكتملة — أدخل الـ WORKER SECRET'); }
    let resp;
    const ctrl  = new AbortController();
    const timer = setTimeout(() => ctrl.abort(), DCO_API_TIMEOUT_MS);
    try {
      resp = await fetch(url, {
        ...opts,
        signal: ctrl.signal,
        headers: {
          'Content-Type':  'application/json',
          'Authorization': `Bearer ${secret}`,
          ...(opts?.headers || {}),
        },
      });
    } catch (e) {
      if (e.name === 'AbortError')
        throw new Error(`Worker ${worker.label} ما ردّش خلال ${DCO_API_TIMEOUT_MS / 1000} ثانية — جرّب تاني، والطابور بيتجاب من أول`);
      throw new Error(`تعذّر الوصول لـ Worker ${worker.label} — راجع الاتصال أو حالة الـ Worker: ${e.message}`);
    } finally {
      clearTimeout(timer);
    }
    const text = await resp.text();
    let data;
    try { data = text ? JSON.parse(text) : null; }
    catch { throw new Error(`رد غير متوقع من Worker ${worker.label} (HTTP ${resp.status}): ${text.slice(0, 160)}`); }
    if (!resp.ok) {
      const err = new Error(data?.error || `HTTP ${resp.status}`);
      err.status  = resp.status;
      err.payload = data;
      throw err;
    }
    return data;
  }

  return {
    apiGet:  (action, params = {}) => apiRequest(`${base}/?${new URLSearchParams({ action, ...params })}`, { method: 'GET' }),
    apiPost: (action, body = {})   => apiRequest(`${base}/?action=${encodeURIComponent(action)}`, { method: 'POST', body: JSON.stringify(body) }),
  };
}

// ══════════════════════════════════════════════════════════════
// §HELPERS
// ══════════════════════════════════════════════════════════════

// تهريب HTML — **مصدر واحد للريبو كله**. أي `escapeHtml` في صفحة لازم
// يبقى اسم تاني لنفس الدالة دي، مش نسخة منها.
function esc(v) {
  return String(v ?? '').replace(/[&<>"']/g, c =>
    ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
}

// ── التوقيت — `Africa/Cairo` **يتحسب**، مايتكتبش ثابت ─────────
//
// 🔴 **ودي مش نسخة من هب المخزن — دي النسخة الصح.** الشِل هناك لسه شايل
//    `toCairo = +3 ساعات` ثابتة، وهو بالظبط النمط اللي `ecommoda-constants`
//    §13 بيسمّيه **كاسر**: مصر بترجع UTC+2 يوم **29-10-2026**، وساعتها كل
//    وقت معروض بيغلط بساعة **والأداة مابتشتكيش**. الهب ده بيبدأ صح من أول
//    يوم، فمحتاجش أي تدخل يوم التحويل.
// ⚠️ والدوال دي **نفس نسخة الـ Worker بالحرف** (`ecommoda-constants` §13).
const CAIRO_TZ = 'Africa/Cairo';
const _cairoFmt = new Intl.DateTimeFormat('en-CA', {
  timeZone: CAIRO_TZ, hourCycle: 'h23',
  year: 'numeric', month: '2-digit', day: '2-digit',
  hour: '2-digit', minute: '2-digit', second: '2-digit',
});

// 🔴 **حارس `Invalid Date` إلزامي.** `formatToParts` بترمي `RangeError` على
//    تاريخ باظ، وصف واحد بتاريخ غلط كان كفاية **يوقّع رسم الجدول كله** —
//    يعني الطابور بيختفي بالكامل عشان صف واحد. بترجّع `null` والمستدعي
//    بيعرض `—`.
function cairoParts(dateLike) {
  // 🔴 **`null` و`''` لازم يترفضوا صراحةً قبل `new Date`.**
  //    `new Date(null)` بيرجّع **1970-01-01 صالح** (مش `Invalid Date`)، يعني
  //    أوردر مالوش تاريخ كان بياخد بادج أحمر بيقول «متأخر ٢٠٬٧٠٠ يوم» بدل
  //    «—». الفحص بـ`isNaN` لوحده **مابيمسكش الحالة دي**.
  //    ⚠️ اتمسك في `docs/rules-check.mjs` — مش في مراجعة كود ولا في فحص
  //       المتصفح (البيانات الوهمية كلها كان ليها تواريخ).
  if (dateLike === null || dateLike === undefined || dateLike === '') return null;
  const d = dateLike instanceof Date ? dateLike : new Date(dateLike);
  if (isNaN(d.getTime())) return null;
  try {
    const o = {};
    for (const p of _cairoFmt.formatToParts(d)) if (p.type !== 'literal') o[p.type] = p.value;
    if (o.hour === '24') o.hour = '00';   // حارس: بعض المحركات بترجّع 24
    return o;
  } catch { return null; }
}

function _ampm(p) {
  let h = Number(p.hour);
  const ampm = h >= 12 ? 'مساءً' : 'صباحاً';
  h = h % 12 || 12;
  return `${String(h).padStart(2, '0')}:${p.minute} ${ampm}`;
}

function formatDate(iso) {
  const p = cairoParts(iso);
  return p ? `📅 ${p.day}/${p.month}/${p.year}` : '—';
}
function formatTimeOnly(iso) {
  const p = cairoParts(iso);
  return p ? `🕐 ${_ampm(p)}` : '—';
}
function formatDateTime(iso) {
  const p = cairoParts(iso);
  return p ? `📅 ${p.day}/${p.month}/${p.year} 🕐 ${_ampm(p)}` : '—';
}
function formatDateForExport(iso) {
  const p = cairoParts(iso);
  return p ? `${p.day}-${p.month}-${p.year}` : '';
}
function formatTimeForExport(iso) {
  const p = cairoParts(iso);
  return p ? _ampm(p) : '';
}

// اليوم بتوقيت القاهرة كـ YYYY-MM-DD.
// ⚠️ لازم يتحسب من `cairoParts` مش من `iso.slice(0,10)` — التانية بتقفل
//    اليوم الساعة ٢ أو ٣ صباحًا بتوقيتنا، فأوردر اتعمل ١١ مساءً بيتحسب
//    على اليوم اللي بعده.
function cairoDayStr(dateLike) {
  const p = cairoParts(dateLike);
  return p ? `${p.year}-${p.month}-${p.day}` : null;
}

// رقم اليوم التقويمي بتوقيت القاهرة — أساس كل فرق بالأيام.
function cairoDayIndex(dateLike) {
  const p = cairoParts(dateLike);
  if (!p) return null;
  return Math.floor(Date.UTC(+p.year, +p.month - 1, +p.day) / 86400000);
}

// صيغ الجمع العربية — «٢ دقيقة» و«٣ يوم» غلط لغويًا وبتقلّل الثقة في الشاشة
function arMin(n)  { return n <= 0 ? 'أقل من دقيقة' : n === 1 ? 'دقيقة' : n === 2 ? 'دقيقتين' : n <= 10 ? `${n} دقايق`  : `${n} دقيقة`; }
function arHour(n) { return n === 1 ? 'ساعة'  : n === 2 ? 'ساعتين' : n <= 10 ? `${n} ساعات` : `${n} ساعة`; }
function arDay(n)  { return n === 1 ? 'يوم'   : n === 2 ? 'يومين'  : n <= 10 ? `${n} أيام`  : `${n} يوم`; }

function sinceText(iso) {
  const t = new Date(iso).getTime();
  if (isNaN(t)) return '—';
  const mins = Math.floor((Date.now() - t) / 60000);
  if (mins < 1)  return 'الآن';
  if (mins < 60) return `منذ ${arMin(mins)}`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24)  return `منذ ${arHour(hrs)}`;
  return `منذ ${arDay(Math.floor(hrs / 24))}`;
}

// سلّم قِدَم «آخر تحديث» — **مصدر واحد للريبو كله**.
// ⚠️ `at` بيتاخد **Date أو null**، و`now` بالملّي — التوقيع ده مقصود عشان
//    النبضة تنادي الدالة بـ `Date.now()` واحدة لكل الصفوف بدل قراءة جديدة
//    للساعة مع كل صف.
function agoInfo(at, now) {
  if (!at) return { cls: '', text: 'لسه ما اتحدّثش', stale: false };
  const mins = Math.max(0, Math.floor((now - at.getTime()) / 60000));
  if (mins < 1)  return { cls: 'ago-fresh', text: '⏱ منذ لحظات', stale: false };
  if (mins < 5)  return { cls: 'ago-fresh', text: `⏱ منذ ${arMin(mins)}`, stale: false };
  if (mins < 15) return { cls: 'ago-ok',    text: `⏱ منذ ${arMin(mins)}`, stale: false };
  if (mins < 60) return { cls: 'ago-warn',  text: `⏱ منذ ${arMin(mins)} — يفضّل تحدّث`, stale: true };
  return { cls: 'ago-stale', text: `⏱ منذ ${arHour(Math.floor(mins / 60))} — الرقم قديم، حدّث`, stale: true };
}

// ── العمر بفرق **الأيام التقويمية** بتوقيت القاهرة ────────────
//
// 🔴 مش `(الآن − الوقت) / 86400000`. أوردر اتعمل ١١ مساءً بيبقى «منذ أمس»
//    الساعة ١ صباحًا، وده الصح للمخزن والشحن: «عدّى اليوم» معناها **التاريخ
//    اتغيّر**، مش إن ٢٤ ساعة عدّت. أي «تبسيط» للطرح المباشر بيكسر الدلالة.
function dcoDayDiff(iso, now) {
  const a = cairoDayIndex(now), b = cairoDayIndex(iso);
  if (a === null || b === null) return null;
  return a - b;
}

// درجة اللون من فرق الأيام — **مصدر واحد** لكل الأعمدة المحسوبة بالوقت.
// النص هو اللي بيفرق بين «عمر الأوردر» و«الوقت منذ التغليف»، مش اللون.
function dcoDayLevel(days) {
  if (days === null) return 'tb-none';
  if (days <= 0) return 'tb-d0';
  if (days === 1) return 'tb-d1';
  if (days === 2) return 'tb-d2';
  if (days <  7)  return 'tb-d3';
  return 'tb-d7';
}

// عمر الأوردر — بالأيام **بس** (بادج صغير جوّه عمود تاريخ الأوردر).
// ⚠️ بترجّع `tb-none` للأوردر اللي مالوش تاريخ — بادج رمادي بشرطة، مش
//    خانة فاضية: «مش عارفين» معلومة، و«فاضي» بيتقري عطل.
function dcoOrderAge(iso, now = new Date()) {
  const days = dcoDayDiff(iso, now);
  if (days === null) return { cls: 'tb-none', text: '—' };
  const text = days <= 0 ? 'اليوم' : days === 1 ? 'منذ أمس' : `منذ ${arDay(days)}`;
  return { cls: dcoDayLevel(days), text };
}

// «قاعد من إمتى» — نفس درجات بادج العمر، بنغمة تأخير.
// ⚠️ الدرجة من `dcoDayLevel` — نفس مصدر بادج العمر — فمستحيل يفترقوا.
function dcoWaiting(iso, now = new Date()) {
  const t = new Date(iso).getTime();
  if (isNaN(t)) return { cls: 'tb-none', text: '—' };
  const days = dcoDayDiff(iso, now);
  if (days === null) return { cls: 'tb-none', text: '—' };
  if (days <= 0) {
    const mins = Math.max(0, Math.floor((now.getTime() - t) / 60000));
    return { cls: 'tb-d0', text: mins < 60
      ? `🟢 منذ ${arMin(mins)}`
      : `🟢 منذ ${arHour(Math.floor(mins / 60))}${mins % 60 ? ` و${arMin(mins % 60)}` : ''}` };
  }
  if (days === 1) return { cls: 'tb-d1', text: '🟡 متأخر يوم — منذ أمس' };
  if (days === 2) return { cls: 'tb-d2', text: '🟠 متأخر يومين' };
  if (days <  7)  return { cls: 'tb-d3', text: `🔴 متأخر ${arDay(days)}` };
  return { cls: 'tb-d7', text: `⛔ متأخر ${arDay(days)}` };
}

// ── رابط الأوردر على شوبيفاي (قاعدة #20) ──────────────────────
function shopifyOrderUrl(orderId) {
  return `https://admin.shopify.com/store/${SHOP_HANDLE}/orders/${orderId}`;
}
// ⚠️ أوردر من غير `id` بيرجع **نص عادي** مش لينك بلا هدف — لينك رايح لـ
//    `orders/undefined` أسوأ من نص: الموظف بيفتحه ويلاقي صفحة خطأ
//    ويفتكر الأوردر اتمسح.
function orderLink(orderNumber, orderId) {
  const label = orderNumber || '—';
  if (!orderId) return `<span class="order-num">${esc(label)}</span>`;
  return `<a class="order-link" target="_blank" rel="noopener" href="${shopifyOrderUrl(orderId)}">${esc(label)}</a>`;
}

// ── حد أدنى رقمي، مش تطابق حرفي ───────────────────────────────
function cmpVersion(a, b) {
  const pa = String(a).replace(/^v/, '').split('.').map(Number);
  const pb = String(b).replace(/^v/, '').split('.').map(Number);
  for (let i = 0; i < 3; i++) {
    const d = (pa[i] || 0) - (pb[i] || 0);
    if (d) return d;
  }
  return 0;
}

// ══════════════════════════════════════════════════════════════
// §QUEUE-RULES — 🔴 **المصدر الوحيد لكل اشتقاق في الهب ده**
// ══════════════════════════════════════════════════════════════
//
// 🔴 **ليه مكانها هنا مش في الصفحة:** الشاشة الرئيسية بتعرض **رقم** كل
//    طابور، والصفحة بتعرض **قايمته**. لو القاعدة اتكتبت في الصفحة، الرقمين
//    بيفترقوا **في صمت** — وده حصل فعلاً في هب المخزن v1.11.0: الرئيسية
//    قالت «بوسطة ٦٦» والصفحة فتحت على **٦**، لأن البوابة كانت مكتوبة في
//    `print.html` لوحدها (درس R1).
//    ⛔ ممنوع أي صفحة تعرّف أي حاجة من الكتلة دي تاني. تعريف في صفحة
//       **بيغلب** الـ shell (بيتحمّل قبلها) والقاعدتين هيفترقوا في صمت.
//
// 🔴 **والقاعدة الحاكمة: علّم، متشيلش.** (`ecommoda-order-lifecycle`
//    قاعدة ١٣ و١٤.) الصف الشاذ **بيفضل في الطابور وبيتعدّ في الرقم**، وبياخد
//    علامة بسبب مكتوب وفعل مقترح. إخفاؤه بيغيّر أرقام — وده قرار أحمد مش
//    قرار الكود — وبيخلّي سؤال «الأوردر ده فين؟» بلا إجابة.

// القيم الحرفية — منسوخة من `ecommoda-order-lifecycle` Step 2 بالحرف.
// ⚠️ فرق حرف واحد = مقارنة بترجّع `false` **من غير أي خطأ**.
const DCO_S1_VALUES = [
  'New Order', 'Confirmed', 'WhatsApp-Confirmed', 'WhatsApp-CANCELLED',
  'Confirmed + Edit', 'Pending Edit', 'Ready', 'Shipped',
  'In-Return', 'Delivered', 'Returned', 'Cancelled',
];
const DCO_S2_VALUES = [
  'Confirmed + RETURN', 'Confirmed + EXCHANGE', 'Ready', 'Shipped',
  'In-Return', 'Returned',
];
// 🔴 `Cairo+Giza` فيها `+` والتانيين فيهم `_` (`ecommoda-constants` §1).
//    و`BLANK` **مش زون** — دي «لسه ما اتقررش» (قاعدة ١٦)، فبتتعلّم عليها
//    علامة مراجعة بدل ما تتحسب قناة رابعة.
const DCO_ZONES = ['Cairo+Giza', 'Other_Regions', 'Show_Room'];

// ── تجميع المندوب — بوسطة · شو روم · مناديب ───────────────────
//
// ⚠️ التطبيع بيشيل المسافات والشرطات والـ underscore: `Show_Room` و
//    `Show Room` و`showroom` و«شو روم» كلهم مربع واحد. مطابقة حرفية على
//    `Showroom` بالظبط كانت هتخلّي صف يقع في المربع الغلط.
// ⚠️ والفاضي بيقع في «مناديب» — «مفيش مندوب مسجل» **مش** بوسطة ولا شو روم،
//    وحطّه في مربع رابع كان هيدّي مربع بصفر في اليوم العادي.
function dcoCourierGroup(courier) {
  const k = String(courier || '').trim().toLowerCase().replace(/[\s_-]/g, '');
  if (k === 'bosta'    || k === 'بوسطة') return 'bosta';
  if (k === 'showroom' || k === 'شوروم') return 'showroom';
  return 'other';
}

// الترتيب **ثابت** (مش بالعدد): الترتيب بالعدد كان هيرقّص المربعات مكانها
// مع كل تحديث. ونفس الألوان ونفس الليبل في الرئيسية وفي الصفحتين.
const DCO_COURIER_GROUPS = [
  { key: 'other',    label: 'مناديب', cls: 'qc-courier'  },
  { key: 'bosta',    label: 'بوسطة',  cls: 'qc-bosta'    },
  { key: 'showroom', label: 'شو روم', cls: 'qc-showroom' },
];

// ⚠️ المفاتيح بتتبني من `DCO_COURIER_GROUPS` نفسها — مجموعة جديدة بتدخل
//    وبتطلع مربع عدّاده `undefined` لو الخريطة مكتوبة بالإيد.
function dcoCourierCounts(rows) {
  const out = Object.fromEntries(DCO_COURIER_GROUPS.map(g => [g.key, 0]));
  for (const r of rows || []) out[dcoCourierGroup(r.courier)]++;
  return out;
}

// ── الماكينة: الصف ده عن الشحنة الأصلية ولا دورة الاستبدال؟ ───
//
// 🔴 **الترتيب هو القرار:** S1 الأول. أوردر حالتَيه على نفس القيمة (مثلاً
//    `Ready` في الاتنين) بيتحسب **S1**، وبياخد علامة شذوذ — مش بيتقسم
//    لصفّين. صفّين لنفس الأوردر معناهم إن الرقم الكبير بيعدّه مرتين.
function dcoMachineOf(o, status) {
  if (o.s1 === status) return 's1';
  if (o.s2 === status) return 's2';
  return null;
}

// ── العلامات — سبب + القيمة الغلط + الفعل المطلوب ─────────────
//
// 🔴 **قاعدة ١٤: بند مراجعة لازم يقول «ليه»، مش «فيه حاجة».** بند بيقول
//    «فيه مشكلة» وبس تكلفته **فحص يدوي لكل صف**: تفتح الأوردر على شوبيفاي
//    وتقارن `cancelledAt` و S1 و S2 بإيدك. فكل علامة هنا بتحمل:
//    `code` (للتشخيص) · `label` (اللي بيتعرض) · `detail` (القيمة الغلط
//    بالحرف) · `action` (اللي المفروض يتعمل).
function dcoFlags(o, status, queue) {
  const f = [];
  const machine = dcoMachineOf(o, status);

  // ① ملغي وهو لسه في الطابور — **أول واحدة، وده مقصود**
  // القاعدة ٢ في `order-lifecycle`: الإلغاء بييجي من **حدث شوبيفاي**
  // (`cancelledAt`)، والميتافيلد مصدر ثانوي بيتقرا بس لما شوبيفاي ما سجّلتش
  // إلغاء. الاتنين بيتفحصوا هنا لأن أي واحد فيهم معناه إن الصف ده مش شغل.
  if (o.cancelledAt || o.s1 === 'Cancelled') {
    f.push({ code: 'cancelled', label: 'ملغي',
      detail: o.cancelledAt ? `اتلغى على شوبيفاي (${formatDate(o.cancelledAt)})` : 'حالة S1 = Cancelled',
      action: queue === 'shipped'
        ? 'شحنة خرجت على أوردر ملغي — راجعها مع المندوب فورًا'
        : 'اقفل الشحنة ورجّع المنتجات على الرف' });
  }

  // ② الماكينتين على نفس القيمة
  if (o.s1 === status && o.s2 === status) {
    f.push({ code: 'both_machines', label: 'الماكينتين مع بعض',
      detail: `S1 و S2 الاتنين = «${status}»`,
      action: 'الصف محسوب على الشحنة الأصلية (S1) — اتأكد إيه اللي فعلاً في الطريق' });
  }

  // ③ دورة استبدال/استرجاع والشحنة الأصلية لسه ما اتسلّمتش
  // 🔴 القاعدة: S2 مابيبدأش غير بعد `S1 = Delivered` (`order-lifecycle`
  //    Step 2 — `Delivered` نهائية في S1 وكل اللي بعدها في S2).
  if (machine === 's2' && o.s1 !== 'Delivered') {
    f.push({ code: 's2_before_delivered', label: 'دورة استبدال بدري',
      detail: `S2 = «${status}» والشحنة الأصلية S1 = «${o.s1 || 'فاضي'}» مش Delivered`,
      action: 'راجع حالة الأوردر — دورة الاستبدال المفروض تبدأ بعد التسليم' });
  }

  // ④ حالة بره قايمة الاختيار (قاعدة ١٣ — علّم، متحركهاش)
  if (o.s1 && !DCO_S1_VALUES.includes(o.s1)) {
    f.push({ code: 's1_unknown', label: 'حالة S1 مش معروفة',
      detail: `«${o.s1}» مش من القايمة المعتمدة`,
      action: 'القيمة اتكتبت غلط أو من Flow قديم — صحّحها من أدمن شوبيفاي' });
  }
  if (o.s2 && !DCO_S2_VALUES.includes(o.s2)) {
    f.push({ code: 's2_unknown', label: 'حالة S2 مش معروفة',
      detail: `«${o.s2}» مش من القايمة المعتمدة`,
      action: 'القيمة اتكتبت غلط أو من Flow قديم — صحّحها من أدمن شوبيفاي' });
  }

  // ⑤ الزون — «فاضي/BLANK» و«قيمة غريبة» **حالتين مختلفتين**
  // ⚠️ `BLANK` معناها «لسه ما اتقررش» مش زون رابع (قاعدة ١٦). وأوردر
  //    وصل `Ready`/`Shipped` وزونه لسه غير محدّد معناه إن قرار القناة
  //    ما اتاخدش وهو **بيشحن دلوقتي**.
  if (!o.zone || o.zone === 'BLANK') {
    f.push({ code: 'zone_missing', label: 'بلا قناة',
      detail: `custom.zone = «${o.zone || 'فاضي'}»`,
      action: 'حدّد القناة (قاهرة+جيزة · بوسطة · شو روم) قبل ما الشحنة تتحرّك' });
  } else if (!DCO_ZONES.includes(o.zone)) {
    f.push({ code: 'zone_unknown', label: 'قناة مش معروفة',
      detail: `custom.zone = «${o.zone}»`,
      action: 'القيمة بره قايمة الاختيار — صحّحها من أدمن شوبيفاي' });
  }

  // ⑥ خاص بكل طابور
  if (queue === 'ready') {
    // الطرد مع المندوب والحالة لسه «جاهز» — يعني اتسلّم ومحدش سجّل الشحن
    const wa = machine === 's2' ? o.whereaboutsS2 : o.whereaboutsS1;
    if (wa === 'Courier') {
      f.push({ code: 'at_courier', label: 'الطرد مع المندوب',
        detail: 'عهدة الطرد = Courier والحالة لسه Ready',
        action: 'الشحنة خرجت — لازم حالتها تتحوّل لـ Shipped' });
    }
  } else if (queue === 'shipped') {
    // 🔴 **الحارس ده على S1 بس — والقصر مقصود.** أداة الشحن بتقفل الحالة
    //    على `Shipped` **وبتعمل فلفلمنت** في نفس الخطوة، فـ`UNFULFILLED`
    //    على صف S1 معناه إن الشحنة مش مسجّلة على شوبيفاي أصلاً.
    //    ⛔ أما صفوف S2 فعُرف الفلفلمنت فيها **مش مؤكَّد عندنا** — وعلامة
    //       غلط على كل صف استبدال أسوأ من مفيش علامة: الموظف بيتعلّم
    //       يعدّي على التحذير كله (نفس درس `already` الأحمر).
    //    ⚠️ والفحص على `UNFULFILLED` **بالظبط** — `PARTIALLY_FULFILLED`
    //       حالة حقيقية على أوردر اتشحن جزئيًا، ومش شذوذ.
    if (machine === 's1' && o.fulfillment === 'UNFULFILLED') {
      f.push({ code: 'not_fulfilled', label: 'بلا فلفلمنت',
        detail: 'الحالة Shipped بس شوبيفاي مسجّلة الأوردر UNFULFILLED',
        action: 'الشحنة مش مسجّلة على شوبيفاي — راجع خطوة الشحن' });
    }
  }

  return f;
}

// ── شكل الصف المعروض ──────────────────────────────────────────
//
// ⚠️ **الاختيار بماكينة الصف مش ثابت على S1.** صف الاستبدال بياخد
//    `s2_packing_date_time` و`s2_packed_by` و`…_s2` — أخد قيمة S1 لصف S2
//    معناه **بيانات شحنة تانية** على نفس الأوردر: رقم غلط شكله سليم.
//    (نفس الفخ المقيس في `package-transfer-to-office`: ٦ من ٦ صفوف S2
//    كانت هتعدّي بفحص S1، والصح ٢.)
function dcoShapeRow(o, status, queue, now = new Date()) {
  const machine = dcoMachineOf(o, status);
  const isS2 = machine === 's2';
  const tracking = isS2 ? (o.trackingS2 || null) : (o.trackingS1 || null);
  return {
    ...o,
    machine,
    machineLabel: isS2 ? 'استبدال/استرجاع' : 'عادي',
    packedAt: isS2 ? o.packedAtS2 : o.packedAtS1,
    packedBy: isS2 ? o.packedByS2 : o.packedByS1,
    whereabouts: isS2 ? o.whereaboutsS2 : o.whereaboutsS1,
    // 🔴 الجديد أولاً، والقديم **fallback مُعلَن**: `trackingLegacy` بيقول
    //    إن الرقم جه من `custom.bosta_tracking_number` المتوقّف، عشان
    //    «الرقم ده من حقل قديم» تبقى معلومة ظاهرة مش تخمين.
    tracking: tracking || o.trackingLegacy || null,
    trackingIsLegacy: !tracking && !!o.trackingLegacy,
    courierGroup: dcoCourierGroup(o.courier),
    flags: dcoFlags(o, status, queue),
    age: dcoOrderAge(o.createdAt, now),
  };
}

// ── بناء الطابور كامل ─────────────────────────────────────────
//
// 🔴 **الترتيب: الأقدم فوق.** الأوردر اللي قاعد من أطول مدة هو اللي محتاج
//    تحرّك دلوقتي — سواء كان مستني يخرج (جاهز) أو خارج ومحدش قافله
//    (مشحون). الترتيب بالأحدث كان هيدفن بالظبط الصفوف اللي الأداة اتعملت
//    عشانها تحت صفوف النهاردة.
// ⚠️ **وصفر فلترة هنا.** كل أوردر رجع من الـ Worker بيدخل الطابور — اللي
//    عليه شذوذ بياخد علامة وبيفضل. ⛔ أي `filter` في الدالة دي بيحوّلها من
//    «عرض» لـ«حكم»، والحكم ده مش بتاعنا (قاعدة ١٣).
function dcoQueueRows(orders, status, queue, now = new Date()) {
  const rows = (orders || []).map(o => dcoShapeRow(o, status, queue, now));
  rows.sort((a, b) => String(a.createdAt || '').localeCompare(String(b.createdAt || '')));
  return rows;
}

// ── الفلوس — «مستحق التحصيل» ──────────────────────────────────
//
// 🔴 **`currentTotalPriceSet` مش `totalPriceSet`** — التاني بيمسك القيمة
//    الأصلية وبيفضل زي ما هو بعد أي تعديل أو مرتجع (`order-lifecycle`
//    قاعدة ٣)، يعني رقم أكبر من اللي المندوب هيحصّله فعلاً.
//
// 🔴 **و`PENDING` بالظبط.** الأوردر المدفوع أونلاين مش تحصيل، وجمعه في
//    الرقم بيخلّي «المستحق» أكبر من الحقيقة. والاستبعاد ده **مش صامت** —
//    بيرجع بعدده عشان الشاشة تقوله (`prepaidCount`).
// ⚠️ والقيمة بتتقرا من `displayFinancialStatus` اللي بييجي من شوبيفاي —
//    مش من ميتافيلد. صف مالوش القيمة دي بيتعدّ في `unknownCount` **ولا
//    بيتجمع ولا بيتستبعد في صمت**.
function dcoCod(rows) {
  let due = 0, dueCount = 0, prepaidCount = 0, unknownCount = 0, currency = null;
  for (const r of rows || []) {
    // 🔴 **`Number(null)` بيرجّع 0** — فأوردر `PENDING` مالوش مبلغ كان بيتعدّ
    //    **أوردر مستحق بصفر جنيه**: عدّاد الأوردرات بيكبر والمجموع مابيزيدش،
    //    فالرقم بيقلّ **من غير أي إشارة**. الفحص لازم يبقى على القيمة قبل
    //    التحويل مش بعده.
    const raw = r.total;
    const amt = (raw === null || raw === undefined || raw === '') ? NaN : Number(raw);
    if (!r.financial) { unknownCount++; continue; }
    if (r.financial === 'PENDING') {
      if (Number.isFinite(amt)) { due += amt; dueCount++; if (!currency) currency = r.currency; }
      else unknownCount++;   // ⚠️ مستحق بلا مبلغ = **مجهول**، مش صفر
    } else {
      prepaidCount++;
    }
  }
  return { due, dueCount, prepaidCount, unknownCount, currency: currency || 'EGP' };
}

// عرض الفلوس — بلا كسور لما تكون صفر، وبفواصل آلاف.
// ⚠️ `en-US` عن قصد: الأرقام في الشاشة كلها لاتينية (`direction:ltr`)،
//    وخلط الأرقام العربية-الهندية مع اللاتينية في نفس العمود بيصعّب
//    المقارنة بالعين.
function dcoMoney(n, currency = 'EGP') {
  // 🔴 **«مش معروف» ≠ «صفر»** — و`Number(null)` بيرجّع **0**، يعني خانة فلوس
  //    مالهاش قيمة كانت هتقول «0 ج» بدل «—». صفر حقيقي معناه «مفيش فلوس»،
  //    و«—» معناها «إحنا مش عارفين» — والفرق ده هو الفرق بين رقم صحيح ورقم
  //    غلط شكله سليم. (نفس قاعدة «العدّاد `—` مش `0` قبل أول جلب».)
  if (n === null || n === undefined || n === '') return '—';
  const v = Number(n);
  if (!Number.isFinite(v)) return '—';
  const s = v % 1 === 0
    ? v.toLocaleString('en-US')
    : v.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  return `${s} ${currency === 'EGP' ? 'ج' : esc(currency)}`;
}

// عدد الصفوف اللي عليها علامة — للمربع الكهرماني.
function dcoFlaggedCount(rows) {
  return (rows || []).reduce((n, r) => n + ((r.flags && r.flags.length) ? 1 : 0), 0);
}

// المربعات اللي بتتعرض تحت الرقم الكبير — **مصدر واحد للرئيسية وللصفحتين**.
// ⚠️ مربع «محتاجة مراجعة» بيظهر **بس لما يكون فيه فعلاً** — تحذير دايم
//    على الشاشة بيتحوّل لديكور والموظف بيبطّل يشوفه.
function dcoChips(rows) {
  const cn = dcoCourierCounts(rows);
  const chips = DCO_COURIER_GROUPS.map(g => ({ cls: g.cls, label: g.label, n: cn[g.key] }));
  const flagged = dcoFlaggedCount(rows);
  if (flagged) chips.push({ cls: 'qc-flag', label: '⚠️ محتاجة مراجعة', n: flagged });
  return chips;
}

// ── صفارة ─────────────────────────────────────────────────────
// ⛔ الفرع الافتراضي **لازم يفضل الفشل** (نغمة نازلة)، بس أي نوع ليه معنى
//    لازم يبقى له **فرع صريح**. الفرع الناقص هو اللي خلّى `playBeep('scan')`
//    تطلّع نغمة فشل على كل سكانة ناجحة في هب المخزن — وبصفر خطأ في الكونسول.
let dcoAudioCtx = null;
function playBeep(type) {
  try {
    if (!dcoAudioCtx) dcoAudioCtx = new (window.AudioContext || window.webkitAudioContext)();
    const ctx = dcoAudioCtx;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.connect(gain); gain.connect(ctx.destination);
    if (type === 'warn') {
      osc.frequency.setValueAtTime(660, ctx.currentTime);
      osc.frequency.setValueAtTime(520, ctx.currentTime + 0.12);
      gain.gain.setValueAtTime(0.32, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.3);
      osc.start(ctx.currentTime); osc.stop(ctx.currentTime + 0.3);
    } else if (type === 'success') {
      osc.frequency.setValueAtTime(880, ctx.currentTime);
      osc.frequency.setValueAtTime(1100, ctx.currentTime + 0.1);
      gain.gain.setValueAtTime(0.3, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.25);
      osc.start(ctx.currentTime); osc.stop(ctx.currentTime + 0.25);
    } else if (type === 'scan') {
      osc.frequency.setValueAtTime(1400, ctx.currentTime);
      gain.gain.setValueAtTime(0.18, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.08);
      osc.start(ctx.currentTime); osc.stop(ctx.currentTime + 0.08);
    } else {
      osc.frequency.setValueAtTime(300, ctx.currentTime);
      osc.frequency.setValueAtTime(200, ctx.currentTime + 0.15);
      gain.gain.setValueAtTime(0.4, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.35);
      osc.start(ctx.currentTime); osc.stop(ctx.currentTime + 0.35);
    }
  } catch {}
}

// ══════════════════════════════════════════════════════════════
// §UI — التوست · الإعدادات · النسخة · About/Changelog · الخروج
// ══════════════════════════════════════════════════════════════

function showToast(msg, type = 'neutral', duration = 3000) {
  const box = document.getElementById('toastContainer');
  if (!box) return;
  const t = document.createElement('div');
  t.className = `toast toast-${type}`;
  t.textContent = msg;
  box.appendChild(t);
  setTimeout(() => t.remove(), duration);
}

// ── الإعدادات — السر بس (الروابط ثوابت، #28) ──────────────────
function openSettings() {
  const f = document.getElementById('cfgSecret');
  if (f) f.value = getSecret();
  const dg = document.getElementById('diagResult');
  if (dg) dg.innerHTML = '';
  document.getElementById('settingsOverlay')?.classList.add('open');
}
function closeSettings()            { document.getElementById('settingsOverlay')?.classList.remove('open'); }
function closeSettingsOnBackdrop(e) { if (e.target === e.currentTarget) closeSettings(); }

function updateSettingsBtn() {
  document.getElementById('settingsBtn')?.classList.toggle('settings-configured', isConfigured());
  const lb = document.getElementById('loginSettingsBtn');
  if (lb) { const ok = isConfigured(); lb.classList.toggle('ready', ok); lb.classList.toggle('missing', !ok); }
}

// ⚠️ الصفحة اللي عندها شغل بعد الحفظ (تحميل قائمة الموظفين مثلاً) بتعرّف
//    `onSettingsSaved()` عندها — الـ shell مابيعرفش شغل الصفحة.
function saveSettings() {
  const secret = document.getElementById('cfgSecret').value.trim();
  if (!secret) { showToast('أدخل WORKER SECRET', 'error'); return; }
  setSecret(secret);
  updateSettingsBtn();
  closeSettings();
  showToast('تم حفظ الإعدادات ✓', 'success');
  if (typeof onSettingsSaved === 'function') onSettingsSaved();
}

// ── النسخة — مصدر واحد (#24) ──────────────────────────────────
function renderVersionUI() {
  const verBtn = document.getElementById('verBtn');
  if (verBtn) verBtn.textContent = `${TOOL_VERSION} 📋`;
  const clBadge = document.getElementById('clLatestVerBadge');
  if (clBadge) clBadge.textContent = TOOL_VERSION;
  const loginVer = document.getElementById('loginVersionText');
  if (loginVer) loginVer.textContent = TOOL_VERSION;
  updateSettingsBtn();
}

function openChangelog()  { document.getElementById('changelogOverlay')?.classList.add('open'); }
function closeChangelog() { document.getElementById('changelogOverlay')?.classList.remove('open'); }
function openAbout()      { document.getElementById('aboutOverlay')?.classList.add('open'); }
function closeAbout()     { document.getElementById('aboutOverlay')?.classList.remove('open'); }

// ── الفحص الذاتي — **ممنوع يعرض قيمة أي سر** ──────────────────
//
// 🔴 **الـ Workers في الستاك بيرجّعوا `checks` بتلات أشكال مختلفة**، والهب
//    بينادي أكتر من واحد فلازم يفهمهم كلهم:
//      · الجديد (والأداتين دول) → **مصفوفة** `[{ ok, label, detail, hint }]`
//      · أدوات قديمة            → **كائن** `{ d1: 'ok', oauth: 'FAILED: …' }`
//      · وشكل تالت              → كائن بندوده **كائنات** فيها `ok` صريحة
//    نسخة بتعمل `for…of` على الكائن بترمي «object is not iterable»
//    و**بتوقّف الفحص كله** عند أول Worker بالشكل ده.
//
// ⚠️ `hint` بيتعرض **بس لو الفحص فشل** — سطر «إزاي تصلّحها» تحت فحص ناجح
//    ضوضاء، وتحت فحص فاشل هو الحاجة الوحيدة المفيدة.
function diagRows(checks, labels = {}) {
  if (!checks) return [];
  const line = (icon, label, detail, hint) =>
    `<div class="diag-line"><span>${icon}</span><span>${esc(label)}`
    + (detail ? ' — <span class="diag-detail">' + esc(detail) + '</span>' : '')
    + (hint ? '<div class="diag-hint">↳ ' + esc(hint) + '</div>' : '')
    + `</span></div>`;

  if (Array.isArray(checks)) {
    return checks.map(c => line(c.ok ? '✅' : '❌', c.label || c.name || '', c.detail || '', c.ok ? '' : (c.hint || '')));
  }
  if (typeof checks !== 'object') return [line('ℹ️', String(checks), '', '')];

  return Object.entries(checks).map(([k, v]) => {
    if (v && typeof v === 'object' && !Array.isArray(v) && typeof v.ok === 'boolean') {
      const rest = Object.entries(v).filter(([kk]) => kk !== 'ok' && kk !== 'hint');
      const detail = rest.map(([kk, vv]) =>
        `${kk}: ${(vv && typeof vv === 'object') ? JSON.stringify(vv) : String(vv)}`).join(' · ');
      return line(v.ok ? '✅' : '❌', labels[k] || k, detail, v.ok ? '' : (v.hint || ''));
    }
    const txt = (v && typeof v === 'object') ? JSON.stringify(v) : String(v);
    let icon = 'ℹ️';
    if (/(Error|Warning)$/.test(k))      icon = '⚠️';
    else if (/^FAILED/i.test(txt))       icon = '❌';
    else if (txt === 'ok' || v === true) icon = '✅';
    else if (v === false)                icon = '❌';
    return line(icon, labels[k] || k, txt, '');
  });
}

// الصفحة بتعرّف `PAGE_WORKERS` (المفاتيح اللي بتناديها)، والفحص بيمشي
// عليها واحد واحد **ويسمّي كل Worker باسمه**.
async function dcoRunDiag() {
  const box = document.getElementById('diagResult');
  const btn = document.getElementById('diagBtn');
  if (!box) return;
  const keys = (typeof PAGE_WORKERS !== 'undefined' && PAGE_WORKERS.length)
    ? PAGE_WORKERS : Object.keys(DCO_WORKERS);
  box.innerHTML = 'جارٍ الفحص...';
  if (btn) btn.disabled = true;
  const out = [];
  for (const k of keys) {
    const w = DCO_WORKERS[k];
    try {
      const d = await dcoApi(w).apiGet('diag');
      const ver = d.version || d.WORKER_VERSION || '—';
      const behind = cmpVersion(ver, w.min) < 0;
      out.push(`<div class="diag-line"><span>${behind ? '⚠️' : 'ℹ️'}</span><span><b>${esc(w.label)}</b> — نسخة <code>${esc(ver)}</code> (الحد الأدنى <code>${esc(w.min)}</code>)</span></div>`);
      const labels = (typeof PAGE_DIAG_LABELS !== 'undefined') ? PAGE_DIAG_LABELS : {};
      out.push(...diagRows(d.checks, labels));
    } catch (e) {
      out.push(`<div class="diag-line"><span>❌</span><span><b>${esc(w.label)}</b> — ${esc(e.message)}</span></div>`);
    }
  }
  box.innerHTML = out.join('');
  if (btn) btn.disabled = false;
}

// ── حارس النسخة — **لازم يسمّي الـ Worker** ────────────────────
// رسالة «الـ Worker نسخة قديمة» من غير اسم الأداة بتخلّي الموظف يدوّر في
// التلاتة.
let dcoStaleMsgs = [];
async function checkWorkerVersion(keys) {
  // ⚠️ بلا سر مفيش فحص نسخة **أصلاً**. من غير الحارس ده أول نداء بيقع في
  //    `apiRequest` اللي بيفتح شاشة الإعدادات — فتطلع فوق شاشة الدخول
  //    وتغطّي زرار الإعدادات اللي جوّه الكارت (Standards #4).
  if (!isConfigured()) return;
  for (const k of keys) {
    const w = DCO_WORKERS[k];
    if (!w) continue;
    try {
      const { apiGet } = dcoApi(w);
      const cfg = await apiGet('get_config');
      const got = cfg.version || cfg.WORKER_VERSION;
      if (got && cmpVersion(got, w.min) < 0) {
        dcoStaleMsgs.push(
          `Worker ${w.label} نسخته ${got} والهب محتاج ${w.min} على الأقل — ` +
          `التحديث على ما يبدو ما نزلش. راجع Deployments و Promote في كلاودفلير.`
        );
        const btn = document.getElementById('verStaleBtn');
        if (btn) {
          btn.style.display = '';
          btn.textContent = dcoStaleMsgs.length === 1
            ? `⚠️ Worker ${w.label} نسخة قديمة`
            : `⚠️ ${dcoStaleMsgs.length} Workers نسخة قديمة`;
        }
      }
    } catch { /* الفشل هنا مش تحذير نسخة — الأداة نفسها هتبلّغ عند أول نداء */ }
  }
}
function showWorkerStale() {
  if (!dcoStaleMsgs.length) return;
  showToast(dcoStaleMsgs.join(' · '), 'error', 9000);
}

// ── الخروج ────────────────────────────────────────────────────
// ⚠️ `appId` بيتبعت هنا كمان — من غيره صف الـ `logout` بيتسجّل
//    `pack_checker` والدخول `delivery_cod_ops_center`، فالزوج مايتقفلش.
// ⚠️ الجلسة والكاش بيتمسحوا **حتى لو** نداء التسجيل فشل — الخروج فعل
//    محلي، ومانسيبش موظف داخل عشان D1 ما ردّتش.
async function doLogout() {
  const s = getSession();
  try {
    if (s?.username) {
      await dcoApi(DCO_WORKERS.pack).apiGet('log_logout', { username: s.username, appId: DCO_APP_ID });
    }
  } catch { /* الخروج بيتم برضه */ }
  clearSession();
  location.replace('index.html');
}

// ══════════════════════════════════════════════════════════════
// §HEADER — الهيدر الموحّد
// ══════════════════════════════════════════════════════════════
//
// الترتيب RTL (القراءة من اليمين للشمال):
//
//   [العنوان]  ←→  [🏠 الرئيسية في النص]  ←→  [extras] [ℹ️] [vX.Y.Z 📋] [اسم ✕] [⚙️]
//
// ⚠️ `⚙️ الإعدادات` **آخر عنصر** في ترتيب القراءة = أقصى الشمال بصريًا
//    (Step 3 · Header Button Order).
// 🔴 **زرار الرئيسية في المنطقة الوسطى ومصمت أزرق** — انحراف مقصود عن
//    Step 3 (اللي بيقول أول عنصر في قراءة RTL)، منقول من هب المخزن بنفس
//    السبب: الموظف بيرجع منه من كل أداة، وكان بيتوه وسط زراير بنفس الشكل.
function dcoHeader(opts = {}) {
  const { icon = '🚚', title = '', subtitle = '', home = true, extras = '', session = null } = opts;
  const homeZone = home
    ? `<div class="app-header-center"><button class="hbtn hbtn-home" onclick="location.href='index.html'" title="الشاشة الرئيسية">🏠 الرئيسية</button></div>`
    : '';
  // زرار الموظف **هو** زرار الخروج — ✕ بدل كلمة «خروج»، و👤 اتشالت لأن
  // الاسم لوحده كافي. `aria-label` بيحافظ على الوضوح لقارئ الشاشة —
  // من غيره الزرار بيتقري «اسم الموظف» بس، بلا أي إشارة إنه بيخرّج.
  const userBtn = session
    ? `<button class="hbtn active-user" id="activeUserBtn" onclick="doLogout()" title="تسجيل الخروج — ${esc(session.displayName)}" aria-label="تسجيل الخروج">`
      + `<span>${esc(session.displayName)}</span><span class="user-x" aria-hidden="true">✕</span></button>`
    : '';
  return `
    <div class="app-header${home ? ' has-center' : ''}">
      <div class="app-title">
        <span class="app-icon">${icon}</span>
        <div class="app-title-text">
          <h1>${esc(title)}</h1>
          <span>${esc(subtitle)}</span>
        </div>
      </div>
      ${homeZone}
      <div class="app-header-btns">
        ${extras}
        <button class="hbtn" id="verStaleBtn" style="display:none" onclick="showWorkerStale()">⚠️ الـ Worker نسخة قديمة</button>
        <button class="hbtn" onclick="openAbout()">ℹ️ عن الأداة</button>
        <button class="hbtn ver-btn" id="verBtn" onclick="openChangelog()">v1.0.0 📋</button>
        ${userBtn}
        <button class="hbtn" id="settingsBtn" onclick="openSettings()">⚙️ الإعدادات</button>
      </div>
    </div>`;
}

// المودالات المشتركة (الإعدادات + حاوية التوست) — بتتحقن في كل صفحة عشان
// ماتتكررش في الـ HTML. الـ About والـ Changelog **بيفضلوا في صفحتهم**
// لأن محتواهم مختلف من صفحة للتانية.
function dcoSharedModals() {
  return `
    <div class="settings-overlay" id="settingsOverlay" onclick="closeSettingsOnBackdrop(event)">
      <div class="settings-modal">
        <div class="settings-modal-hdr">
          <span>⚙️ الإعدادات</span>
          <button class="modal-close-x" onclick="closeSettings()">✕</button>
        </div>
        <div class="settings-modal-body">
          <div class="settings-field">
            <label class="settings-label">WORKER SECRET</label>
            <!-- من غير placeholder — Step 2 بند ٧: الشرح مكانه الـ label
                 والسطر الثابت تحت، مش نص رمادي جوّه الحقل بيختفي أول ما
                 الموظف يكتب حرف. -->
            <input type="password" class="settings-input" id="cfgSecret" autocomplete="off">
            <div class="settings-static">السر المشترك لمجموعة <code>warehouse_ops</code> — نفس القيمة بتاعة محطة المخزن بالظبط، ونفس المفتاح على نفس الجهاز</div>
          </div>
          <div class="settings-field">
            <label class="settings-label">الـ Workers</label>
            <div class="settings-static">ready-orders-worker · shipped-orders-worker · orders-packing-checker-worker (الدخول)</div>
          </div>
          <div class="settings-field">
            <label class="settings-label">فحص النظام</label>
            <button class="btn-outline" id="diagBtn" onclick="dcoRunDiag()">🩺 افحص الأداة والاتصالات</button>
            <div class="diag-box" id="diagResult"></div>
          </div>
        </div>
        <div class="settings-modal-ftr">
          <button class="btn-modal-cancel" onclick="closeSettings()">إلغاء</button>
          <button class="btn-modal-save" onclick="saveSettings()">حفظ</button>
        </div>
      </div>
    </div>
    <div class="toast-container" id="toastContainer"></div>`;
}
