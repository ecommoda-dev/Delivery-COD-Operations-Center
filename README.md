<div dir="rtl" style="text-align: right;">

# مركز عمليات الشحن والتحصيل — Delivery COD Operations Center

![version](https://img.shields.io/badge/version-v1.0.0-blue)

**هب واحد لمحطة الشحن والتحصيل.** الموظف بيدخل مرة واحدة وبيشوف طوابير الشحن.

🔗 **الواجهة:** https://ecommoda-dev.github.io/Delivery-COD-Operations-Center/

## الصفحات

| الصفحة | بتعمل إيه | الـ Worker |
|---|---|---|
| `index.html` | الدخول + الشاشة الرئيسية (الطابورين بأرقامهم) | التغليف (للدخول) |
| `ready-orders.html` | **جاهز للشحن** — حالته `Ready` (S1 أو S2) | `ready-orders-worker` |
| `shipped-orders.html` | **مشحون بلا نتيجة** — حالته `Shipped` ولسه بلا `Delivered`/`Returned` | `shipped-orders-worker` |

> 🔴 **الهب واجهة بحتة** — مفيش Worker ولا `wrangler.toml` في الريبو ده.
> 🔴 **والطابورين عرض بحت** — صفر كتابة على شوبيفاي وصفر صف في السجل.

## الملفات

```
index.html            الدخول + الشاشة الرئيسية
ready-orders.html     طابور الجاهز للشحن
shipped-orders.html   طابور المشحون
shared/shell.css      التوكنز + الـ chrome (نسخة واحدة)
shared/shell.js       الإعدادات + الجلسة + §QUEUE-RULES (مصدر الاشتقاق الوحيد)
docs/build-pages.py   مولّد الصفحتين — 🔴 الـ HTML **متولّد**، عدّل هنا
docs/css-check.js     فحص CSS بـ parser حقيقي
docs/rules-check.mjs  فحص منطق §QUEUE-RULES — ٥٢ بند (بلا تنصيب)
docs/queues-check.mjs فحص متصفح فعلي — ٨٠ بند
```

## الفحوص — قبل أي تسليم

```bash
npm i playwright postcss --no-save
node docs/css-check.js shared/shell.css index.html ready-orders.html shipped-orders.html
node docs/rules-check.mjs
node docs/queues-check.mjs
```

## النشر

```
GitHub Pages → Settings → Pages → Deploy from a branch → main / (root)
```

السر: **نفس سر مجموعة `warehouse_ops`** وبنفس مفتاح `localStorage`
(`warehouse_ops_worker_secret`) — فالجهاز المضبوط على محطة المخزن **مضبوط هنا
من غير أي خطوة**.

🔴 **خطوات حاجزة على الـ Workers** (من ريبوهاتهم، مش من هنا): إنشاء
`ready-orders-worker` و`shipped-orders-worker` · ربط Workers Builds ·
`WORKER_SECRET` = سر `warehouse_ops` → **Promote** · `CLIENT_ID`/`CLIENT_SECRET`
→ **Promote**.

التفاصيل والقرارات والفخاخ → **`CLAUDE.md`**

</div>
