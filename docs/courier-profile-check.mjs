// فحص متصفح فعلي لشاشة «أسماء المناديب» v2.11.0 (بروفايل المندوب) — Worker وهمي بحالة.
// التشغيل: node docs/courier-profile-check.mjs   (محتاج playwright · PW_CHROMIUM اختياري)
import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { chromium } from 'playwright';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const MIME = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.css': 'text/css; charset=utf-8' };
const server = http.createServer((req, res) => {
  const f = path.join(ROOT, decodeURIComponent(req.url.split('?')[0]).replace(/^\/+/, ''));
  if (!f.startsWith(ROOT) || !fs.existsSync(f) || fs.statSync(f).isDirectory()) { res.writeHead(404); return res.end('nf'); }
  res.writeHead(200, { 'Content-Type': MIME[path.extname(f)] || 'application/octet-stream' });
  res.end(fs.readFileSync(f));
});
await new Promise(r => server.listen(0, '127.0.0.1', r));
const BASE = `http://127.0.0.1:${server.address().port}`;

let pass = 0, fail = 0;
const is = (c, m, d = '') => { c ? pass++ : fail++; console.log(c ? '  ✅' : '  ❌', m, !c && d ? `\n       ${d}` : ''); };
const sec = (t) => console.log(`\n══ ${t} ══`);

// ── Worker وهمي بحالة (نفس عقد courier-names-worker 2.0.0) ──
const NID = '29001010100011', PIN = '1234';
const state = { couriers: ['Bosta', 'Showroom', 'Ahmed Ali', 'Mona', 'Karim'], calls: [], pinFails: 0, locked: false,
  profiles: { 'Ahmed Ali': { id: 1, kind: 'person', phonePrimary: '01001234567', phoneSecondary: null, version: 2, hasPhoto: false, photoUpdatedAt: null, hasNid: true } } };
const prof = (name) => {
  const p = state.profiles[name];
  const base = { id: p?.id ?? null, name, kind: ['Bosta', 'Showroom'].includes(name) ? (name === 'Bosta' ? 'company' : 'showroom') : 'person', status: 'active',
    phonePrimary: p?.phonePrimary ?? null, phoneSecondary: p?.phoneSecondary ?? null, extra: {}, version: p?.version ?? 0,
    hasPhoto: !!p?.hasPhoto, photoUpdatedAt: p?.photoUpdatedAt ?? null, hasNationalId: !!p?.hasNid, nationalIdMasked: p?.hasNid ? '••••••••••0011' : null };
  base.missing = base.kind !== 'person' ? [] : [!base.phonePrimary && 'phonePrimary', !base.hasPhoto && 'photo', !base.hasNationalId && 'nationalId'].filter(Boolean);
  return base;
};
const J = (o, s = 200) => ({ status: s, contentType: 'application/json', headers: { 'Access-Control-Allow-Origin': '*' }, body: JSON.stringify(o) });
async function mock(page) {
  await page.route('**/*.workers.dev/**', async route => {
    const req = route.request(), u = new URL(req.url()), action = u.searchParams.get('action') || '';
    let body = null; try { body = req.postData() ? JSON.parse(req.postData()) : null; } catch {}
    state.calls.push({ action, body, url: req.url() });
    const p = (n) => { state.profiles[n] ||= { id: Object.keys(state.profiles).length + 1, version: 0 }; return state.profiles[n]; };
    switch (action) {
      case 'get_config': return route.fulfill(J({ ok: true, version: '99.0.0', WORKER_VERSION: '99.0.0' }));
      case 'get_couriers': return route.fulfill(J({ ok: true, couriers: state.couriers, count: state.couriers.length, protectedNames: ['Bosta', 'Showroom'],
        maxCouriers: 100, maxNameLen: 60, maxPhotoBytes: 150 * 1024, validationStatus: 'COMPLETED',
        profiles: Object.fromEntries(state.couriers.map(n => [n, prof(n)])), removedProfiles: [], profilesError: null }));
      case 'get_logs': return route.fulfill(J({ ok: true, entries: [] }));
      case 'get_courier_photo': return route.fulfill(J({ ok: true, mime: 'image/jpeg', updatedAt: state.profiles[u.searchParams.get('name')]?.photoUpdatedAt, dataUrl: state.photo || '' }));
      case 'update_courier_profile': {
        const x = p(body.name);
        if (body.expectedVersion !== undefined && body.expectedVersion !== x.version) return route.fulfill(J({ ok: false, status: 'rejected', error: 'بيانات المندوب اتعدّلت من حد تاني', warnings: [], attempted: false }));
        // الـ Worker الحقيقي بيطبّع (+20 → 0) — الوهمي بيحاكيه
        const norm = (v) => {
          let d = String(v || '').split('').filter(ch => ch >= '0' && ch <= '9').join('');
          if (d.length === 12 && d.startsWith('20')) d = '0' + d.slice(2);
          return d || null;
        };
        if ('phonePrimary' in body) x.phonePrimary = norm(body.phonePrimary);
        if ('phoneSecondary' in body) x.phoneSecondary = norm(body.phoneSecondary);
        x.version++;
        return route.fulfill(J({ ok: true, status: 'success', message: `اتحدّثت بيانات «${body.name}»`, notices: [], warnings: [], logged: true, profile: { ...prof(body.name) } }));
      }
      case 'set_courier_photo': {
        const x = p(body.name); state.photo = body.dataUrl; x.hasPhoto = !!body.dataUrl; x.photoUpdatedAt = body.dataUrl ? 'T1' : null; x.version++;
        return route.fulfill(J({ ok: true, status: 'success', message: 'اتحدّثت الصورة', warnings: [], logged: true, removed: !body.dataUrl, profile: { ...prof(body.name) } }));
      }
      case 'reveal_national_id': case 'set_national_id': {
        if (state.locked) return route.fulfill(J({ ok: false, status: 'rejected', code: 'locked', error: 'محاولات PIN غلط كتير — مقفول 10 دقيقة', retryAfterSec: 600 }, 429));
        if (body.pin !== PIN) { state.pinFails++; return route.fulfill(J({ ok: false, status: 'rejected', code: 'bad_pin', error: `PIN غلط — فاضل ${5 - state.pinFails} محاولات`, attemptsLeft: 5 - state.pinFails }, 403)); }
        if (action === 'reveal_national_id') return route.fulfill(J({ ok: true, status: 'success', name: body.name, nationalId: NID, info: { birthDate: '1990-01-01', gender: 'ذكر', governorate: 'القاهرة' }, logged: true }));
        const x = p(body.name); x.hasNid = body.nationalId !== null; x.version++;
        return route.fulfill(J({ ok: true, status: 'success', message: body.nationalId === null ? 'اتحذف' : 'اتسجّل', removed: body.nationalId === null, nationalIdMasked: body.nationalId ? '••••••••••' + body.nationalId.slice(-4) : null, warnings: [], logged: true }));
      }
      default: return route.fulfill(J({ ok: true, entries: [], employees: [], checks: [] }));
    }
  });
}

const launchOpts = { args: ['--no-sandbox'] };
if (process.env.PW_CHROMIUM) launchOpts.executablePath = process.env.PW_CHROMIUM;
const browser = await chromium.launch(launchOpts);
const ctx = await browser.newContext();
const page = await ctx.newPage();
const errs = [];
page.on('pageerror', e => errs.push('pageerror: ' + e.message));
// 403/429 من الـ Worker الوهمي (PIN غلط · قفل) بيتسجّلوا كـ«Failed to load resource» في الكونسول — متوقّعين مش أخطاء صفحة
page.on('console', m => { if (m.type() === 'error' && !/status of (403|429)/.test(m.text())) errs.push('console: ' + m.text()); });
await page.addInitScript(() => {
  sessionStorage.setItem('dco_session', JSON.stringify({ v: 1, username: 'Ali', displayName: 'Ali', loginAt: '2026-11-24T08:00:00.000Z' }));
  localStorage.setItem('delivery_cod_ops_worker_secret', 'HUB_SECRET_VALUE');
});
await mock(page);
await page.goto(`${BASE}/Courier-Names.html`);
await page.waitForSelector('.cn-item');

sec('① القايمة والبروفايل');
is((await page.$$('.cn-item')).length === 5, '٥ مناديب معروضين');
is(await page.locator('.cn-item', { hasText: 'Bosta' }).locator('[data-act=profile]').count() === 0, 'Bosta: مفيش زرار بيانات (اسم نظامي)');
is(await page.locator('.cn-item', { hasText: 'Showroom' }).locator('[data-act=profile]').count() === 0, 'Showroom: مفيش زرار بيانات');
is(await page.locator('.cn-item', { hasText: 'Ahmed Ali' }).locator('.cn-ph').innerText() === '01001234567', 'التليفون الأساسي ظاهر');
is((await page.locator('.cn-item', { hasText: 'Ahmed Ali' }).locator('.cn-miss').innerText()).includes('ناقص 1'), 'أحمد: ناقص ١ (الصورة)');
is((await page.locator('.cn-item', { hasText: 'Mona' }).locator('.cn-miss').innerText()).includes('ناقص 3'), 'منى: ناقص ٣');
is(await page.locator('#cnFilter button.on').innerText() === 'الكل', 'فلتر «الكل» هو الافتراضي');
await page.click('#cnFilter button[data-f=missing]');
is((await page.locator('.cn-item').count()) === 3, 'فلتر «ناقص»: ٣ مناديب بس (أحمد · منى · كريم)');
await page.click('#cnFilter button[data-f=all]');

sec('② تعديل التليفونات — بدون ما نضيّع ترتيب غير محفوظ');
await page.locator('.cn-item', { hasText: 'Karim' }).locator('[data-act=up]').click();   // ترتيب غير محفوظ
is(await page.locator('#cnDirty').isVisible(), 'الترتيب بقى «غير محفوظ»');
const orderBefore = await page.locator('.cn-name').allInnerTexts();
await page.locator('.cn-item', { hasText: 'Mona' }).locator('[data-act=profile]').click();
is(await page.locator('#pmOverlay.open').count() === 1, 'مودال البيانات اتفتح');
await page.fill('#pmPhone1', '+20 111 223 3445');
state.calls.length = 0;
await page.click('#pmSave');
await page.waitForSelector('#pmResult .cn-result.success');
const upd = state.calls.find(c => c.action === 'update_courier_profile');
is(!!upd && upd.body.phonePrimary === '+20 111 223 3445' && !('phoneSecondary' in upd.body), 'اتبعت الحقل المتغيّر بس (تليفون أساسي)');
is(upd?.body.employee === 'Ali', 'employee من الجلسة');
is(!state.calls.some(c => c.action === 'get_couriers'), 'مفيش إعادة تحميل للقايمة (الترتيب غير المحفوظ بيفضل)');
is(await page.locator('#cnDirty').isVisible(), 'الترتيب غير المحفوظ لسه موجود');
is(JSON.stringify(await page.locator('.cn-name').allInnerTexts()) === JSON.stringify(orderBefore), 'ترتيب العرض ما اتغيّرش');
is(await page.locator('.cn-item', { hasText: 'Mona' }).locator('.cn-ph').innerText() === '01112233445', 'القايمة اتحدّثت بالتليفون المطبّع');
await page.click('#pmSave');
is(await page.locator('#pmResult').innerText().then(t => t.includes('مفيش تعديل')), 'حفظ بلا تغيير = رسالة مش نداء');
is(state.calls.filter(c => c.action === 'update_courier_profile').length === 1, 'مفيش نداء تاني');

sec('③ الصورة — تصغير قبل الرفع');
await page.evaluate(async () => {
  const cv = document.createElement('canvas'); cv.width = 1600; cv.height = 1200;
  const c = cv.getContext('2d'); c.fillStyle = '#c33'; c.fillRect(0, 0, 1600, 1200); c.fillStyle = '#fff'; c.fillRect(300, 200, 400, 400);
  const blob = await new Promise(r => cv.toBlob(r, 'image/png'));
  const dt = new DataTransfer(); dt.items.add(new File([blob], 'big.png', { type: 'image/png' }));
  const inp = document.getElementById('pmFile'); inp.files = dt.files; inp.dispatchEvent(new Event('change'));
});
await page.waitForFunction(() => document.querySelector('#pmAvatar img'));
state.calls.length = 0;
await page.click('#pmSave');
await page.waitForSelector('#pmResult .cn-result.success');
const ph = state.calls.find(c => c.action === 'set_courier_photo');
is(!!ph && /^data:image\/jpeg;base64,/.test(ph.body.dataUrl), 'اتبعتت JPEG');
is(ph && Math.floor(ph.body.dataUrl.length * 3 / 4) <= 150 * 1024, 'الحجم ≤ ١٥٠KB');
const dims = await page.evaluate(src => new Promise(r => { const i = new Image(); i.onload = () => r([i.width, i.height]); i.src = src; }), ph.body.dataUrl);
is(Math.max(...dims) <= 256 && dims[0] === 256, `الأبعاد اتصغّرت (${dims.join('×')})`);
is(!state.calls.some(c => c.action === 'update_courier_profile'), 'مفيش نداء بيانات لما التليفونات ما اتغيّرتش');
is(await page.locator('.cn-item', { hasText: 'Mona' }).locator('.cn-av img').count() === 1, 'الصورة ظهرت في القايمة');
is((await page.locator('.cn-item', { hasText: 'Mona' }).locator('.cn-miss').innerText()).includes('ناقص 1'), 'ناقص بقى ١ بعد الصورة');

sec('④ الرقم القومي — PIN في كل مرة');
await page.evaluate(() => pmClose());
await page.locator('.cn-item', { hasText: 'Ahmed Ali' }).locator('[data-act=profile]').click();
is((await page.locator('#pmNid').innerText()).includes('0011') && !(await page.content()).includes(NID), 'مقنّع، والرقم الكامل مش في الصفحة');
state.calls.length = 0;
await page.click('#pmNidShow');
is(await page.locator('#pinOverlay.open').count() === 1, 'طلب PIN');
await page.fill('#pinInput', '0000'); await page.click('#pinOk');
await page.waitForFunction(() => document.getElementById('pinErr').textContent.includes('PIN غلط'));
is(await page.locator('#pinOverlay.open').count() === 1, 'PIN غلط: النافذة فاضلة مفتوحة بالرسالة');
is((await page.locator('#pinErr').innerText()).includes('فاضل 4'), 'بتقول المحاولات المتبقية');
is(!(await page.content()).includes(NID), 'مفيش رقم بعد PIN غلط');
await page.fill('#pinInput', PIN); await page.click('#pinOk');
await page.waitForFunction(() => document.getElementById('pmNid').textContent.length > 12 && /^\d{14}$/.test(document.getElementById('pmNid').textContent));
is(await page.locator('#pmNid').innerText() === NID, 'الرقم ظهر بعد PIN صح');
is((await page.locator('#pmNidInfo').innerText()).includes('1990-01-01'), 'بيانات مستخرجة (ميلاد · نوع · محافظة)');
const rv = state.calls.filter(c => c.action === 'reveal_national_id');
is(rv.length === 2 && rv.every(c => c.body.pin !== undefined && !c.url.includes('pin=') && !c.url.includes('0000') && !c.url.includes(PIN)), 'PIN في الـbody بس (مش في الـURL)');
await page.evaluate(() => pmClose());
is(!(await page.content()).includes(NID), '🔴 الرقم اتمسح من الصفحة مع قفل النافذة');
await page.locator('.cn-item', { hasText: 'Ahmed Ali' }).locator('[data-act=profile]').click();
is(!(await page.content()).includes(NID), 'وما بيرجعش عند إعادة الفتح');

sec('⑤ إدخال رقم قومي جديد + القفل');
await page.evaluate(() => pmClose());
await page.locator('.cn-item', { hasText: 'Karim' }).locator('[data-act=profile]').click();
await page.click('#pmNidEdit');
is(await page.locator('#pinExtraWrap').isVisible(), 'خانة الرقم القومي ظاهرة في نافذة الـPIN');
state.calls.length = 0;
await page.fill('#pinExtra', NID); await page.fill('#pinInput', PIN); await page.click('#pinOk');
await page.waitForSelector('#pmResult .cn-result.success');
const sn = state.calls.find(c => c.action === 'set_national_id');
is(sn?.body.nationalId === NID && sn.body.pin === PIN && sn.body.employee === 'Ali', 'اتبعت الرقم + PIN في الـbody');
is(!(await page.content()).includes(NID) && (await page.inputValue('#pinExtra')) === '', '🔴 الرقم مش باقي في الصفحة ولا في الخانة');
is((await page.locator('#pmNid').innerText()).includes('0011'), 'اتعرض مقنّع');
state.locked = true;
await page.click('#pmNidShow');
await page.fill('#pinInput', PIN); await page.click('#pinOk');
await page.waitForSelector('#pmResult .cn-result.error');
is((await page.locator('#pmResult').innerText()).includes('مقفول'), 'القفل (429) بيظهر برسالته');
is(await page.locator('#pinOverlay.open').count() === 0, 'ومابيسألش PIN تاني');
await page.evaluate(() => pmClose());

sec('⑥ سلامة');
is(errs.length === 0, 'صفر أخطاء كونسول/صفحة', errs.join(' | '));
console.log(`\n${fail ? '❌' : '✅'} النتيجة: ${pass} عدّى · ${fail} فشل`);
await browser.close(); server.close();
process.exit(fail ? 1 : 0);
