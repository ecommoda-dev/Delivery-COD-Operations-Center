// ══════════════════════════════════════════════════════════════
// shared/home-config.js — إعداد الشاشة الرئيسية لهب الشحن والتحصيل
// ══════════════════════════════════════════════════════════════
//
// 🔴 **ده الملف اللي بيفرّق رئيسية الشحن عن رئيسية المخزن** — البناء والجلب والكاش وعمر الرقم والطي
//    كلهم في `shared/home.js` (متطابق بالبايت في الهبّين). هنا بس: الأقسام والصفوف والأدوات.
//    ترتيب التحميل: `hub-config.js` ← `core.js` ← `dco-rules.js` ← `home.js` ← `home-config.js`.
//
// 🔴 **الاشتقاق كله من `shared/dco-rules.js` §QUEUE-RULES** — `ecoQueueRows` و`ecoChips`. الصفحة بتنادي
//    **نفس** الدوال على **نفس** الرد، فمستحيل الرقم هنا يخالف القايمة هناك (درس R1).
//    ⛔ ممنوع أي `filter` أو `map` بقاعدة أهلية في الملف ده.
// ⚠️ `derive` واحدة للجلب وللكاش — نسختين كانوا هيخلّوا الرقم من الكاش يخالف الرقم من الشبكة.
//
// 🔴 **بلا «مستحق التحصيل» في الرئيسية** (طلب أحمد 14-10-2026) — الرقم لسه في صفحة كل طابور.
// 🔴 **الأدوات بلا عدّاد عن قصد** — عدّاد حيّ = جلب تقيل عند كل دخول، وماياخدهوش إلا اللي عنده
//    طابور حقيقي وجلبه رخيص. الأدوات **أدوات فعل** مش طوابير. والكروت بتفتح صفحة في نفس التاب
//    (الأدوات جوّه الهب وبتقرا نفس الجلسة).
// ⚠️ والأدوات اللي بتكتب (تحديث الحالة · التحصيل · التسليم الجزئي) مش عرض بحت زي الطابورين —
//    `update_status` بتكتب حالة على شوبيفاي، و`pay`/`refund` بيسجّلوا فلوس.

function deriveQueue(data, status, kind) {
  const rows = ecoQueueRows(data.orders || [], status, kind);
  return { total: rows.length, chips: ecoChips(rows), truncated: !!data.truncated };
}

// 🔴 «رفع بوسطة» — التلات أوضاع بالتوازي على نفس الـ Worker، والعدّ بنفس شرط تاب «الرفع» جوّه الأداة
//    (`!alreadyUploaded`). ⚠️ لو أي وضع فشل الصف كله بيقول فشل (بيسمّي الوضع) — رقم إجمالي ناقص وضع
//    شكله سليم وهو أقل من الحقيقة. 🔴 والكاش عدّادات بس (`bostaCacheSet` في `core.js`) — وصفحة
//    الأداة بتكتب فيه هي كمان مع كل جلب لأي وضع. ⚠️ والنداءات قراءة بحتة (`fetch_candidates` بطّل يكتب).
const BOSTA_MODES = [
  { key: 's1',       label: '🚚 شحن عادي', cls: 'qc-job-s1' },
  { key: 'return',   label: '↩️ استرجاع',  cls: 'qc-job-return' },
  { key: 'exchange', label: '🔄 استبدال',  cls: 'qc-job-exchange' },
];
function deriveBosta(counts) {
  const chips = BOSTA_MODES.map(m => ({ grp: true, cls: m.cls, label: m.label, n: counts[m.key] }));   // 🎨 مجموعة موصولة (§HOME-CHIPS)
  return { total: chips.reduce((a, c) => a + c.n, 0), chips };
}

const ECO_HOME = {
  staggerMs: 0,     // الطوابير بالتوازي (Workers مختلفة)
  sections: [
    { id: 'Bosta', cls: 'sec-bosta', summary: true, svg: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M3 7l9-4 9 4v10l-9 4-9-4z"/></svg>`,
      title: 'شحنات بوسطة', sub: 'رفع الشحنات ومتابعتها', queues: ['bosta', 'webhook', 'followUp'] },
    { id: 'Flow', cls: 'sec-flow', summary: true, svg: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M4 12h12M12 6l6 6-6 6"/></svg>`,
      title: 'الحالات الانتقالية', sub: 'Ready ثم Shipped', queues: ['ready', 'shipped'] },
    { id: 'Tools', cls: 'sec-tools', svg: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M4 7h10M18 7h2M4 17h2M10 17h10"/><circle cx="16" cy="7" r="2"/><circle cx="8" cy="17" r="2"/></svg>`,
      title: 'أدوات العمليات', sub: 'أدوات بتكتب على الأوردرات',
      tools: [
        { href: 'Order-Status-Updater.html', ico: 'ico-purple', svg: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M20 11a8 8 0 0 0-14.5-4.5M4 4v4h4"/><path d="M4 13a8 8 0 0 0 14.5 4.5M20 20v-4h-4"/><path d="M12 7.5l4 2v5l-4 2-4-2v-5z"/><path d="M8 9.5l4 2 4-2M12 11.5v5"/></svg>`, name: 'تحديث حالة الأوردرات' },
        { href: 'COD-Payment-Center.html', ico: 'ico-green', svg: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M5 5h14M7 2h10"/><rect x="2" y="8" width="20" height="12" rx="2"/><circle cx="12" cy="14" r="2.5"/></svg>`, name: 'تحصيل الأوردرات COD' },
        { href: 'Partial-Delivery.html', ico: 'ico-amber', svg: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M10 2.5L4 5v6.5l6 2.5z"/><path d="M14 2.5l6 2.5v6.5l-6 2.5z"/><path d="M12 15.5V17M12 17l-4.5 4.5M12 17l4.5 4.5M7.5 18v3.5H11M16.5 18v3.5H13"/></svg>`, name: 'التسليم الجزئي' },
      ] },
    { id: 'Other', cls: 'sec-tools', svg: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><circle cx="6" cy="12" r="1.6"/><circle cx="12" cy="12" r="1.6"/><circle cx="18" cy="12" r="1.6"/></svg>`,
      title: 'أدوات أخرى', sub: 'قوائم مساعدة',
      tools: [
        { href: 'Courier-Names.html', ico: 'ico-blue', svg: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><circle cx="6" cy="17" r="3"/><circle cx="18" cy="17" r="3"/><path d="M9 17h6M15 17l-2-8h-3M13 9h3l2 4"/></svg>`, name: 'أسماء المناديب' },
        { href: 'Re-Assign-Package-Zone-BOSTA.html', ico: 'ico-amber', svg: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M4 8h14M14 4l4 4-4 4"/><path d="M20 16H6M10 12l-4 4 4 4"/></svg>`, name: 'تحويل الشحنة إلى بوسطة' },
      ] },
  ],
  queues: {
  bosta: {
    href: 'Bosta-Orders-Upload.html', idCls: 'id-upload',
    svg: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M12 16V4M6 10l6-6 6 6M4 20h16"/></svg>`,
    name: 'رفع بوسطة', code: 'لم يتم الرفع',
    err: 'تعذّر جلب أوردرات رفع بوسطة',
    async fetch() {
      const api = ecoApi(ECO_WORKERS.bostaUpload);
      const s = getSession();
      const get = {
        s1:       () => api.apiGet('get_orders'),
        return:   () => api.apiPost('fetch_candidates', { jobType: 'return',   employee: s?.username || null }),
        exchange: () => api.apiPost('fetch_candidates', { jobType: 'exchange', employee: s?.username || null }),
      };
      const res = await Promise.allSettled(BOSTA_MODES.map(m => get[m.key]()));
      const failed = BOSTA_MODES.filter((m, i) => res[i].status === 'rejected');
      // ⚠️ الوضع اللي نجح بيتكتب في الكاش حتى لو غيره فشل — رقمه صح.
      const counts = {};
      BOSTA_MODES.forEach((m, i) => {
        if (res[i].status !== 'fulfilled') return;
        counts[m.key] = (res[i].value.rows || []).filter(r => !r.alreadyUploaded).length;
        bostaCacheSet(m.key, counts[m.key]);
      });
      if (failed.length) {
        const first = res.find(r => r.status === 'rejected').reason;
        throw new Error(`تعذّر جلب ${failed.map(m => m.label).join(' · ')} — ${first?.message || 'خطأ غير معروف'}`);
      }
      return deriveBosta(counts);
    },
    fromCache() {
      const c = bostaCacheGet();
      if (!cacheFresh(c)) return null;
      return { at: new Date(c.at), r: deriveBosta(c.counts) };
    },
  },
  webhook: {
    href: 'Bosta-Webhook-Status-Receiver.html', idCls: 'id-track',
    svg: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M12 21s-7-6.2-7-11a7 7 0 0 1 14 0c0 4.8-7 11-7 11z"/><circle cx="12" cy="10" r="2.5"/></svg>`,
    name: 'متابعة شحنات بوسطة', code: 'تحت التوصيل',
    err: 'تعذّر جلب ملخّص متابعة شحنات بوسطة',
    unit: 'شحنة',
    // 🔴 `queue_summary` (عدّ مجمّع في الـ Worker v1.9.0) — مش `list_events`. الكاش بالرد الخام و`ecoWebhookDerive`
    //    بتشتق منه، وصفحة الأداة بتكتب نفس الشكل بعد كل تحميل فالرئيسية بتاخد رقمها ببلاش.
    ...ecoRawQueue({
      cacheKey: ECO_CACHE_WEBHOOK,
      fetchRaw: () => ecoApi(ECO_WORKERS.bostaWebhook).apiGet('queue_summary'),
      derive: ecoWebhookDerive,
      valid: d => !!d.main,
    }),
  },
  followUp: {
    href: 'Bosta-Delivery-Follow-Up.html', idCls: 'id-track',
    svg: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M21 12a8 8 0 0 1-11.6 7.1L4 20l1-4.6A8 8 0 1 1 21 12z"/><path d="M9 11h6M9 14h4"/></svg>`,
    name: 'متابعة التأجيلات', code: 'محتاجين رسالة',
    err: 'تعذّر جلب ملخّص متابعة التأجيلات',
    unit: 'شحنة',
    // 🔴 `queue_summary` من `bosta-delivery-follow-up-worker` — الكاش بالرد الخام و`ecoFollowUpDerive` بتشتق منه.
    ...ecoRawQueue({
      cacheKey: ECO_CACHE_FOLLOWUP,
      fetchRaw: () => ecoApi(ECO_WORKERS.deliveryFollowUp).apiGet('queue_summary'),
      derive: ecoFollowUpDerive,
      valid: d => typeof d.unsent === 'number',
    }),
  },
  ready: {
    href: 'Ready-Orders.html', idCls: 'id-ready',
    svg: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M3 7l9-4 9 4v10l-9 4-9-4z"/><path d="M3 7l9 4 9-4M12 11v10"/></svg>`,
    name: 'جاهزة للشحن (Ready)', code: 'Ready', ltr: true,
    err: 'تعذّر جلب قسم الجاهز للشحن',
    ...ecoRawQueue({
      cacheKey: ECO_CACHE_READY,
      fetchRaw: () => ecoApi(ECO_WORKERS.ready).apiGet('get_ready_queue'),
      derive: d => deriveQueue(d, 'Ready', 'ready'),
      valid: d => Array.isArray(d.orders),
    }),
  },
  shipped: {
    href: 'Shipped-Orders.html', idCls: 'id-shipped',
    svg: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M2 6h11v10H2zM13 10h5l3 3v3h-8z"/><circle cx="6" cy="18" r="2"/><circle cx="17" cy="18" r="2"/></svg>`,
    name: 'تحت التوصيل (Shipped)', code: 'Shipped', ltr: true,
    err: 'تعذّر جلب طابور المشحون',
    ...ecoRawQueue({
      cacheKey: ECO_CACHE_SHIPPED,
      fetchRaw: () => ecoApi(ECO_WORKERS.shipped).apiGet('get_shipped_queue'),
      derive: d => deriveQueue(d, 'Shipped', 'shipped'),
      valid: d => Array.isArray(d.orders),
    }),
  },
  },
};
