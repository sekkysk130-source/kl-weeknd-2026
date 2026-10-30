/* ---------- state (เก็บในเครื่องเท่านั้น) ---------- */
const KEY = 'klwk.v1';
const N = TRIP.travelers;
const DEF = {
  ov: {}, custom: [], order: {}, pick: {}, quote: {}, prio: 'balanced', exp: [],
  budget: { air: 305, public: 42, concert: 36, emerg: 150 }, // งบตั้งต้นจากแผนที่เลือก (รวม RM533)
  names: ['คนที่ 1', 'คนที่ 2', 'คนที่ 3'], out: { ...TRIP.outbound }, ret: { ...TRIP.ret }, rate: TRIP.rate, rateMine: false,
  early: 120, buffer: 15, airportMin: 210, meet: '', verify: {}, theme: 'auto', mapApp: 'google', inclAuto: true, day: null, seg: 'arr', edit: false,
};
let S = (() => { try { const j = JSON.parse(localStorage.getItem(KEY) || '{}'); return { ...DEF, ...j, out: { ...DEF.out, ...(j.out || {}) }, ret: { ...DEF.ret, ...(j.ret || {}) } }; } catch (e) { return JSON.parse(JSON.stringify(DEF)); } })();
let storeOk = true;
const save = () => { try { localStorage.setItem(KEY, JSON.stringify(S)); storeOk = true; } catch (e) { storeOk = false; } };

const $ = (q, el) => (el || document).querySelector(q);
const esc = s => String(s == null ? '' : s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const uid = () => 'c' + Date.now().toString(36) + Math.random().toString(36).slice(2, 6);

/* ---------- time (เวลามาเลเซียเสมอ) ---------- */
const SIM = (() => { const m = location.search.match(/sim=([\dT:-]+)/); return m ? Date.parse(m[1] + (m[1].length <= 16 ? ':00' : '') + '+08:00') : null; })();
const ts = (date, hm) => Date.parse(`${date}T${hm}:00+08:00`);
const now = () => (SIM != null && !isNaN(SIM) ? SIM : Date.now());
const fmt = (ms, o) => new Intl.DateTimeFormat('th-TH', { timeZone: TZ, hour12: false, ...o }).format(ms);
const hm = ms => fmt(ms, { hour: '2-digit', minute: '2-digit' });
const myDate = ms => new Intl.DateTimeFormat('en-CA', { timeZone: TZ }).format(ms);
const CONCERT_TS = ts(TRIP.concert.date, TRIP.concert.start);

/* ---------- ตัวช่วยแสดงผล ---------- */
const ext = (url, label, cls) => `<a class="btn ${cls || ''}" href="${url}" target="_blank" rel="noopener">${label}</a>`;
const act = (a, v, label, cls) => `<button class="btn ${cls || ''}" data-act="${a}" data-v="${esc(v || '')}">${label}</button>`;
const r2 = v => Math.round(v * 100) / 100;
const rm = v => v == null ? '—' : 'RM' + r2(v).toLocaleString('en-US', { minimumFractionDigits: v % 1 ? 2 : 0, maximumFractionDigits: 2 });
const thb = v => { const t = L.toThb(v, S.rate); return t == null ? '' : '฿' + Math.round(t).toLocaleString('en-US'); };
const range = c => !c.known ? 'ยังไม่มีราคา' : c.min === c.max ? rm(c.min) : `${rm(c.min)}–${rm(c.max)}`;

/* ---------- แผนที่ (เปิดแอปภายนอก) ---------- */
const MODE = { grab: 'driving', walk: 'walking' };
function mapsUrl(from, to, mode) {
  const m = MODE[mode] || 'transit';
  if (S.mapApp === 'apple') return `https://maps.apple.com/?${from ? `saddr=${enc(from)}&` : ''}daddr=${enc(to)}&dirflg=${m === 'driving' ? 'd' : m === 'walking' ? 'w' : 'r'}`;
  if (S.mapApp === 'waze') return `https://waze.com/ul?q=${enc(to)}&navigate=yes`;
  return `https://www.google.com/maps/dir/?api=1${from ? `&origin=${enc(from)}` : ''}&destination=${enc(to)}&travelmode=${m}`;
}
const placeUrl = q => S.mapApp === 'apple' ? `https://maps.apple.com/?q=${enc(q)}` : S.mapApp === 'waze' ? `https://waze.com/ul?q=${enc(q)}` : `https://www.google.com/maps/search/?api=1&query=${enc(q)}`;
const MAPNAME = { google: 'Google Maps', apple: 'Apple Maps', waze: 'Waze' };
const airport = t => PL[t] || PL.KLIA2;
const segEnds = id => { const g = SEGS[id]; return { from: g.from === 'AIRPORT' ? airport(S.out.terminal) : g.from, to: g.to === 'AIRPORT' ? airport(S.ret.terminal) : g.to }; };

/* ---------- เส้นทางที่เลือก ---------- */
const ranked = id => L.rank(SEGS[id], N, S.prio, S.quote[id]);
const has = (id, o) => o && SEGS[id].options.some(x => x.id === o);
// ลำดับ: เลือกเอง → แผนที่เลือกไว้ (pref) → แอปจัดอันดับ
const chosenId = id => has(id, S.pick[id]) ? S.pick[id] : has(id, SEGS[id].pref) ? SEGS[id].pref : ranked(id)[0].o.id;
const chosen = id => SEGS[id].options.find(o => o.id === chosenId(id));
const costOf = (id, o) => L.optCost(o, N, (S.quote[id] || {})[o.id]);
const optLine = (id, o) => { const c = costOf(id, o); return `${o.icon} ${esc(o.label)} · ${L.optMinutes(o)} นาที · ${c.known ? `${range(c)} (${N} คน)` : 'ยังไม่มีราคา'}`; };

/* ---------- แพลนที่ใช้จริง = แพลนตั้งต้น + สิ่งที่แก้เองในเครื่องนี้ ---------- */
let DAYV = [];
function calcTimes() {
  const st = TRIP.concert.start;
  const cp = L.concertPlan(st, S.early, L.optMinutes(chosen('stadium')), S.buffer);
  const ap = L.airportPlan(S.ret.dep, S.airportMin, L.optMinutes(chosen('dep')), S.buffer);
  return {
    land: { s: S.out.arr || '', e: '' },
    concertLeave: { s: cp.leave, e: cp.arrive },
    concertGate: { s: cp.arrive, e: st },
    concertShow: { s: st, e: '' },
    afterShow: { s: '', e: '', label: 'หลังจบ' },
    airLeave: ap ? { s: ap.leave, e: ap.arrive } : { s: '', e: '', label: 'กรอกเวลาบิน' },
    retDep: { s: S.ret.dep || '', e: '' },
    cp, ap,
  };
}
function rebuild() {
  const C = calcTimes();
  DAYV = DAYS.map(d => {
    let its = d.items.map(b => {
      const it = { ...b, day: d.id };
      if (b.calc && C[b.calc]) Object.assign(it, C[b.calc]);
      const o = S.ov[b.id];
      if (o) { for (const k of ['s', 'e', 'title', 'place', 'note', 'hid']) if (o[k] !== undefined) it[k] = o[k]; if (o.cost !== undefined) it.cost = o.cost; it._ed = Object.keys(o).some(k => k !== 'hid'); }
      return it;
    });
    its = its.concat(S.custom.filter(c => c.day === d.id).map(c => ({ ...c, _custom: true, status: c.status || 'me' })));
    const ord = S.order[d.id];
    const byTime = (a, b) => (L.hmToMin(a.s) ?? 9999) - (L.hmToMin(b.s) ?? 9999);
    if (ord) {
      const known = its.filter(i => ord.includes(i.id)).sort((a, b) => ord.indexOf(a.id) - ord.indexOf(b.id));
      const extra = its.filter(i => !ord.includes(i.id)).sort(byTime);
      for (const x of extra) { const at = known.findIndex(k => (L.hmToMin(k.s) ?? -1) > (L.hmToMin(x.s) ?? 9999)); at < 0 ? known.push(x) : known.splice(at, 0, x); }
      its = known;
    } else {
      const base = its.filter(i => !i._custom), cus = its.filter(i => i._custom).sort(byTime);
      for (const x of cus) { const at = base.findIndex(k => (L.hmToMin(k.s) ?? -1) > (L.hmToMin(x.s) ?? 9999)); at < 0 ? base.push(x) : base.splice(at, 0, x); }
      its = base;
    }
    // ช่วงที่ไม่ได้ใส่เวลาจบ ให้จบตอนรายการถัดไปเริ่ม
    its.forEach((it, i) => { if (!it.e && it.s && its[i + 1] && its[i + 1].s && it.cat !== 'flight' && it.cat !== 'concert') it._eAuto = its[i + 1].s; });
    return { ...d, eff: its };
  });
}
const allItems = () => DAYV.flatMap(d => d.eff.filter(i => !i.hid).map(i => ({ ...i, date: d.date })));
function nextItems() {
  const t = now();
  const list = allItems().filter(i => i.s).map(i => ({ ...i, at: ts(i.date, i.s), end: ts(i.date, i.e || i._eAuto || i.s) }));
  const cur = list.find(i => i.at <= t && i.end > t);
  const nxt = list.find(i => i.at > t);
  return { cur, nxt };
}
const timeTxt = it => it.label && !it.s ? it.label : it.s ? `${it.s}${it.e ? '–' + it.e : it._eAuto ? '–' + it._eAuto : ''}` : 'ยังไม่ใส่เวลา';

/* ---------- ชิ้นส่วนหน้าตา (สไตล์กระดาษตัดแปะ) ---------- */
const TAG = { est: 'ประมาณ', chk: 'รอเช็ก', need: 'ต้องกรอก' };
const tag = st => TAG[st] ? `<span class="tag t-${st}">${TAG[st]}</span>` : '';
const STLONG = { ok: 'ยืนยันแล้ว', est: 'ประมาณการ', chk: 'รอตรวจสอบ', me: 'ข้อมูลของเรา', need: 'ต้องกรอก' };
// พับเก็บ: แถบสีเต็มความกว้าง แตะเพื่อกาง
const fold = (c, sum, body, open, cls) => `<details class="fold c-${c} ${cls || ''}" ${open ? 'open' : ''}><summary><span class="fs">${sum}</span><span class="pm" aria-hidden="true"></span></summary><div class="fb">${body}</div></details>`;
const block = (c, html, cls) => `<section class="blk c-${c} ${cls || ''}">${html}</section>`;
const eyebrow = t => `<div class="eb">${t}</div>`;
const steps = arr => `<ol class="steps">${arr.map(s => `<li>${s}</li>`).join('')}</ol>`;
let tornSeed = 7;
function torn(fill, flip) { // ขอบกระดาษฉีก
  let r = tornSeed++; const rnd = () => (r = (r * 9301 + 49297) % 233280) / 233280;
  let d = 'M0 12 '; for (let x = 0; x <= 100; x += 1.6) d += `L${x.toFixed(1)} ${(3 + rnd() * 5).toFixed(1)} `;
  d += 'L100 12Z';
  return `<svg class="torn ${flip ? 'flip' : ''}" viewBox="0 0 100 12" preserveAspectRatio="none" aria-hidden="true"><path d="${d}" fill="${fill}"/></svg>`;
}
const HILLS = `<svg class="hills" viewBox="0 0 400 150" preserveAspectRatio="xMidYMax slice" aria-hidden="true">
  <defs><filter id="rough"><feTurbulence type="fractalNoise" baseFrequency=".045" numOctaves="2" seed="4"/><feDisplacementMap in="SourceGraphic" scale="6"/></filter></defs>
  <g filter="url(#rough)">
    <circle cx="92" cy="58" r="34" fill="var(--yellow)"/>
    <path d="M300 34c10-16 22-16 30 0s20 16 30 0 20-16 30 0" stroke="var(--blue)" stroke-width="9" fill="none" stroke-linecap="round"/>
    <path d="M190 30c20-8 40 4 60-2 10-3 18-10 26-8-14 10-34 22-62 18-10-1-18-4-24-8z" fill="var(--lilac)"/>
    <path d="M-20 160V78c40-26 92-22 132 4 30 20 58 48 92 78z" fill="var(--pink)"/>
    <path d="M10 112c14-14 30 6 44-6s28 4 40-6M26 132c16-12 30 8 46-4s26 6 40-4" stroke="#e5408f" stroke-width="3" fill="none" opacity=".75"/>
    <path d="M120 160c34-62 82-92 140-84 50 7 92 6 160-20v104z" fill="var(--green)"/>
    <path d="M170 116q14-10 28 0t28 0 28 0 28 0 28 0M186 138q14-10 28 0t28 0 28 0 28 0 28 0" stroke="#128a5d" stroke-width="6" fill="none" stroke-linecap="round"/>
    <path d="M262 160c36-40 80-58 160-52v52z" fill="var(--blue)"/>
    <path d="M300 136l16-7M330 128l16-7M360 120l16-7M318 150l16-7M350 144l16-7" stroke="var(--orange)" stroke-width="7" stroke-linecap="round"/>
  </g></svg>`;
const hero = (inner, small) => `<section class="hero ${small ? 'sm' : ''}"><div class="hin">${inner}</div>${HILLS}${torn('var(--bg)')}</section>`;

/* ---------- ภาพรวม ---------- */
function countdownTxt() {
  const d = CONCERT_TS - now();
  if (d <= 0) return now() < CONCERT_TS + 5 * 3600e3 ? 'คืนนี้<br><em>The Weeknd</em> 🎤' : 'ทริปนี้<br><em>สุดมาก</em>';
  const dd = Math.floor(d / 864e5), h = Math.floor(d % 864e5 / 36e5), m = Math.floor(d % 36e5 / 6e4);
  return `อีก <em>${dd ? dd + ' วัน ' + h + ' ชม.' : h + ' ชม. ' + m + ' น.'}</em><br>เจอ The Weeknd`;
}
function verifyState() { return VERIFY.map(v => ({ ...v, done: v.auto === 'ret' ? L.isHm(S.ret.dep) : v.auto === 'term' ? !!(S.out.terminal && S.ret.terminal) : v.auto === 'fx' ? S.rateMine : !!S.verify[v.id] })); }
function noteCard(it, label) {
  const mv = it.seg ? chosen(it.seg) : null, ends = it.seg ? segEnds(it.seg) : null;
  const link = mv ? ext(mapsUrl(ends.from, ends.to, mv.mode), 'เปิดเส้นทาง →', 'lnk') : it.q ? ext(placeUrl(it.q), 'เปิดแผนที่ →', 'lnk') : '';
  return `<div class="note"><span class="tape"></span><div class="eb ink">${label}</div><div class="nt">${timeTxt(it)}</div><h3>${it.icon || ''} ${esc(it.title)}</h3>
    <p class="mut">${mv ? `${mv.icon} ${esc(mv.label)} · ${L.optMinutes(mv)} นาที` : esc(it.place || '')}</p>${link}</div>`;
}
function renderNow() {
  const C = calcTimes(), { cur, nxt } = nextItems(), V = verifyState(), left = V.filter(v => !v.done), sum = budgetSum();
  $('#p-now').innerHTML = hero(`${eyebrow('กัวลาลัมเปอร์ · 3–5 พ.ย. 2026')}<h1>${countdownTxt()}</h1><p class="lede">3 คน · NU Hotel @ KL Sentral</p>${SIM ? '<span class="pill">โหมดจำลองเวลา</span>' : ''}`) + `
    <div class="wrap">
      ${cur || nxt ? `<div class="notes">${cur ? noteCard(cur, 'ตอนนี้') : ''}${nxt ? noteCard(nxt, 'ถัดไป · ' + fmt(nxt.at, { weekday: 'short', day: 'numeric', month: 'short' })) : ''}</div>` : ''}
      <h2 class="sec">ต้องออกจากโรงแรม</h2>
      <div class="duo">
        <a class="blk c-yellow tap" href="#concert">${eyebrow('ไปคอนเสิร์ต · 4 พ.ย.')}<div class="big">${C.cp.leave}</div><p>ถึงสนาม ${C.cp.arrive}</p></a>
        <a class="blk c-sky tap" href="#plan" data-act="day" data-v="d3">${eyebrow('ไปสนามบิน · 5 พ.ย.')}<div class="big">${C.ap ? C.ap.leave : '—'}</div><p>${C.ap ? `บิน ${S.ret.dep} · ถึงสนามบิน ${C.ap.arrive}` : 'กรอกเวลาบินกลับ'}</p></a>
      </div>
      <a class="blk c-green tap row-b" href="#money"><div>${eyebrow('ค่าใช้จ่ายรวม 3 คน')}<div class="big">${rm(sum.total)}</div></div><div class="r">คนละ<b>${rm(sum.perPerson)}</b><span>${thb(sum.perPerson)}</span></div></a>
      ${left.length ? block('pink', `${eyebrow(`ต้องเช็กอีก ${left.length} เรื่อง`)}<ul class="ticks">${left.slice(0, 3).map(v => `<li>${esc(v.t)}</li>`).join('')}</ul><a class="lnk" href="#set">ดูทั้งหมด →</a>`) : ''}
      ${fold('cream', 'เที่ยวบินและโรงแรม', `
        <div class="kv"><span>ขาไป</span><b>${esc(S.out.no)} · ${esc(S.out.dep)} ไทย → ${esc(S.out.arr)} มาเลย์</b><small>ดอนเมือง → KLIA ${termTxt(S.out.terminal)}</small></div>
        <div class="kv"><span>ขากลับ</span><b>${esc(S.ret.no)} · ${esc(S.ret.dep || '—')} มาเลย์ → ${esc(S.ret.arr || '')} ไทย</b><small>KLIA ${termTxt(S.ret.terminal)} → ดอนเมือง</small></div>
        <div class="kv"><span>โรงแรม</span><b>${TRIP.hotel.name}</b><small>เช็กอิน ${TRIP.hotel.checkIn} · เช็กเอาต์ ${TRIP.hotel.checkOut} ${tag(TRIP.hotel.status)}</small></div>
        <div class="kv"><span>คอนเสิร์ต</span><b>${TRIP.concert.ticket} · ${TRIP.concert.start}</b><small>${TRIP.concert.venue}</small></div>
        ${ext(placeUrl(PL.hotel), 'โรงแรมในแผนที่ →', 'lnk')}`)}
      ${foot()}
    </div>`;
}
const termTxt = t => t ? t.replace('KLIA', 'T') : tag('need');
const foot = () => `<p class="foot">${navigator.onLine ? 'ออนไลน์' : 'ออฟไลน์ — ใช้ข้อมูลในเครื่อง'} · ข้อมูลตรวจ ${CHECKED} · ฉบับ ${BUILD}</p>`;

/* ---------- แพลน ---------- */
function curDay() { if (S.day) return S.day; const d = myDate(now()); const m = DAYS.find(x => x.date === d); return m ? m.id : 'd1'; }
const CATC = { concert: 'pink', flight: 'sky', rest: 'green' };
function row(it, prev) {
  const mv = it.seg ? chosen(it.seg) : null, ends = it.seg ? segEnds(it.seg) : null;
  const clash = prev && prev.s && it.s && L.hmToMin(it.s) < L.hmToMin(prev.e || prev._eAuto || prev.s);
  const c = CATC[it.cat] || '';
  if (mv) {
    const C = calcTimes();
    const why = it.calc === 'concertLeave' ? `ถึงสนามก่อนเริ่ม ${S.early} นาที · เดินทาง ${L.optMinutes(mv)} นาที · เผื่อ ${S.buffer} นาที`
      : it.calc === 'airLeave' ? (C.ap ? `ถึงสนามบินก่อนเครื่องออก ${S.airportMin} นาที · เดินทาง ${L.optMinutes(mv)} นาที · เผื่อ ${S.buffer} นาที` : 'ยังไม่มีเวลาบินกลับ') : '';
    return `<details class="mv ${it.calc ? 'key' : ''}" id="c-${it.id}"><summary><span class="t">${timeTxt(it)}</span><span class="ml">${mv.icon} ${esc(it.title)} <i>· ${esc(mv.label)} ${L.optMinutes(mv)} น.</i></span></summary>
      <div class="mvb">${why ? `<p>${why}</p>` : ''}${steps(mv.steps)}<div class="acts">${ext(mapsUrl(ends.from, ends.to, mv.mode), 'เปิดเส้นทาง')}${act('seg', it.seg, 'เทียบวิธีอื่น')}${act('edit', it.id, 'แก้')}</div></div></details>`;
  }
  const cost = it.cost && it.cost.amt > 0 ? `<p>ค่าใช้จ่ายประมาณ ${rm(it.cost.amt)}${it.cost.per === 'person' ? '/คน' : ''}</p>` : '';
  return `<details class="it ${c ? 'c-' + c : ''} ${it.prio === 'nice' ? 'nice' : ''}" id="c-${it.id}"><summary>
      <span class="t">${timeTxt(it)}</span><span class="tt"><b>${it.icon || ''} ${esc(it.title)}</b><small>${esc((it.place || '').replace(/<[^>]+>/g, ''))}</small></span>
      <span class="tg">${tag(it.status)}${it.prio === 'nice' ? '<span class="tag t-nice">ตัดได้</span>' : ''}${it._ed || it._custom ? '<span class="tag t-me">แก้เอง</span>' : ''}</span></summary>
    <div class="itb">${clash ? '<p class="warn">เวลาเริ่มทับกับรายการก่อนหน้า</p>' : ''}${it.note ? `<p>${it.note}</p>` : ''}${cost}
      ${it.src && it.src.length ? srcs(it.src, it.status) : ''}
      <div class="acts">${it.q ? ext(placeUrl(it.q), 'แผนที่') : ''}${act('edit', it.id, 'แก้')}</div></div></details>`;
}
function srcs(arr, st) { return `<div class="src">${st && STLONG[st] ? STLONG[st] + ' · ' : ''}ที่มา: ${arr.map(s => `<a href="${s.url}" target="_blank" rel="noopener">${esc(s.label)}</a>`).join(' · ')}</div>`; }
function renderPlan() {
  const dId = curDay(), d = DAYV.find(x => x.id === dId);
  const vis = d.eff.filter(i => !i.hid), hid = d.eff.filter(i => i.hid);
  const ideas = IDEAS.filter(i => !S.custom.some(c => c.idea === i.id));
  $('#p-plan').innerHTML = `<div class="wrap">
    <nav class="days">${DAYV.map(x => `<button class="${x.id === dId ? 'on' : ''}" data-act="day" data-v="${x.id}"><b>${x.date.slice(-1)}</b><span>${x.label.split(' ')[0]}</span></button>`).join('')}</nav>
    <h1 class="pt">${d.title.replace(' · ', '<br>')}</h1>
    ${S.edit ? editList(vis) : `<div class="tl">${vis.map((it, i) => row(it, vis[i - 1])).join('')}</div>`}
    <div class="links">${act('add', dId, '＋ เพิ่มกิจกรรม', 'lnk')}${act('editmode', '', S.edit ? '✓ เสร็จ' : '↕ จัดลำดับ', 'lnk')}${S.order[dId] ? act('resetorder', dId, 'คืนลำดับเดิม', 'lnk') : ''}</div>
    ${hid.length ? fold('cream', `ซ่อนไว้ ${hid.length} รายการ`, hid.map(i => `<div class="kv"><b>${esc(i.title)}</b>${act('unhide', i.id, 'คืน', 'lnk')}</div>`).join('')) : ''}
    ${ideas.length ? fold('lilac', `ไอเดียที่เที่ยวเพิ่ม <small>${ideas.length}</small>`, ideas.map(i => `<div class="idea"><b>${i.icon} ${esc(i.title)}</b><p>${esc(i.why)}</p><div class="acts">${act('idea', i.id + '|' + (i.fit === dId ? dId : i.fit), '＋ ' + DAYS.find(x => x.id === i.fit).label.split(' ').slice(1).join(' '))}${i.fit !== dId ? act('idea', i.id + '|' + dId, '＋ วันนี้') : ''}${ext(placeUrl(i.q), 'แผนที่')}</div></div>`).join('') + '<p class="mut">เวลาเปิด-ปิดและราคายังไม่ได้ตรวจ</p>') : ''}
  </div>`;
}
function editList(vis) {
  return `<p class="mut">แตะ ↑ ↓ เพื่อย้าย · แตะชื่อเพื่อแก้</p><div class="elist">${vis.map((it, i) => `<div class="erow">
    <button class="mvb2" data-act="up" data-v="${it.id}" ${i === 0 ? 'disabled' : ''} aria-label="ขึ้น">↑</button>
    <button class="mvb2" data-act="down" data-v="${it.id}" ${i === vis.length - 1 ? 'disabled' : ''} aria-label="ลง">↓</button>
    <span class="etx" data-act="edit" data-v="${it.id}"><b>${timeTxt(it)}</b> ${esc(it.title)}</span></div>`).join('')}</div>`;
}
function moveItem(id, dir) {
  const dId = curDay(), d = DAYV.find(x => x.id === dId);
  const ids = d.eff.map(i => i.id), vis = d.eff.filter(i => !i.hid).map(i => i.id);
  const vi = vis.indexOf(id), tgt = vis[vi + dir]; if (tgt == null) return;
  const a = ids.indexOf(id), b = ids.indexOf(tgt);[ids[a], ids[b]] = [ids[b], ids[a]];
  S.order[dId] = ids; save(); rebuild(); renderPlan();
}

/* ---------- แก้ไขกิจกรรม ---------- */
const findItem = id => { for (const d of DAYV) for (const i of d.eff) if (i.id === id) return i; return null; };
function openSheet(html) { $('#sheet .in').innerHTML = html; $('#sheet').classList.add('on'); }
function editSheet(id, day) {
  const it = id ? findItem(id) : { id: '', day, title: '', s: '', e: '', place: '', note: '', cat: 'see', icon: '📍' };
  const calc = it.calc && !S.ov[it.id]?.s ? '<p class="mut">เวลานี้แอปคำนวณให้ ถ้าแก้เอง จะไม่คำนวณใหม่อีกจนกว่าจะกด "คืนค่าเดิม"</p>' : '';
  openSheet(`<h2 class="st">${id ? 'แก้กิจกรรม' : 'เพิ่มกิจกรรม'}</h2>${calc}
    <label>ชื่อ</label><input id="f-t" value="${esc(it.title)}" maxlength="80">
    <div class="two"><div><label>เริ่ม</label><input id="f-s" type="time" value="${esc(it.s || '')}"></div><div><label>จบ</label><input id="f-e" type="time" value="${esc(it.e || '')}"></div></div>
    <label>สถานที่</label><input id="f-p" value="${esc((it.place || '').replace(/<[^>]+>/g, ''))}" maxlength="120">
    <label>ค่าใช้จ่ายประมาณ (RM ต่อคน)</label><input id="f-c" inputmode="decimal" value="${it.cost && it.cost.amt ? it.cost.amt : ''}" placeholder="เว้นว่างได้">
    <label>โน้ต</label><textarea id="f-n" maxlength="400">${esc((it.note || '').replace(/<[^>]+>/g, ''))}</textarea>
    <p id="f-err" class="warn" hidden></p>
    <button class="cta" data-act="saveitem" data-v="${(id || '') + '|' + (it.day || day)}">บันทึก</button>
    ${id ? `<div class="links">${it._custom ? act('delitem', id, 'ลบรายการนี้', 'lnk') : act('hide', id, 'ซ่อนจากแพลน', 'lnk') + (S.ov[id] ? act('resetitem', id, 'คืนค่าเดิม', 'lnk') : '')}</div>` : ''}`);
}
function saveItem(v) {
  const [id, day] = v.split('|');
  const t = $('#f-t').value.trim(), s = $('#f-s').value, e = $('#f-e').value, p = $('#f-p').value.trim(), n = $('#f-n').value.trim(), cRaw = $('#f-c').value.trim();
  const err = [];
  if (!t) err.push('ใส่ชื่อกิจกรรม');
  if (s && !L.isHm(s)) err.push('เวลาเริ่มไม่ถูกต้อง');
  if (e && !L.isHm(e)) err.push('เวลาจบไม่ถูกต้อง');
  if (s && e && L.hmToMin(e) < L.hmToMin(s)) err.push('เวลาจบต้องหลังเวลาเริ่ม');
  const c = cRaw === '' ? null : Number(cRaw.replace(/,/g, ''));
  if (cRaw !== '' && !(isFinite(c) && c >= 0)) err.push('ค่าใช้จ่ายต้องเป็นตัวเลข');
  if (err.length) { const b = $('#f-err'); b.hidden = false; b.textContent = err.join(' · '); return; }
  const cost = c == null ? undefined : { amt: c, cur: 'MYR', per: 'person' };
  if (!id) S.custom.push({ id: uid(), day, title: t, s, e, place: p, note: n, cost, cat: 'see', icon: '📍' });
  else {
    const it = findItem(id);
    if (it._custom) Object.assign(S.custom.find(x => x.id === id), { title: t, s, e, place: p, note: n, cost });
    else {
      const base = DAYS.flatMap(d => d.items).find(x => x.id === id), o = {};
      if (t !== base.title) o.title = t;
      if (p !== (base.place || '').replace(/<[^>]+>/g, '')) o.place = p;
      if (n !== (base.note || '').replace(/<[^>]+>/g, '')) o.note = n;
      if (s !== (it.calc ? findCalc(it).s : base.s || '')) o.s = s;
      if (e !== (it.calc ? findCalc(it).e : base.e || '')) o.e = e;
      if ((cost ? cost.amt : 0) !== (base.cost ? base.cost.amt : 0)) o.cost = cost || { amt: 0, cur: 'MYR', per: 'person' };
      if (S.ov[id] && S.ov[id].hid) o.hid = true;
      if (Object.keys(o).length) S.ov[id] = o; else delete S.ov[id];
    }
  }
  afterEdit(day);
}
const findCalc = it => calcTimes()[it.calc] || { s: '', e: '' };
function afterEdit(day) { save(); rebuild(); closeSheet(); if (day) S.day = day; go('plan', true); }

/* ---------- เดินทาง ---------- */
const PRIO = [['cheap', 'ประหยัด'], ['balanced', 'สมดุล'], ['fast', 'เร็ว+สบาย']];
const OPTC = ['sky', 'yellow', 'pink', 'lilac'];
function renderGo() {
  const id = SEGS[S.seg] ? S.seg : 'arr', g = SEGS[id], rows = ranked(id), pick = chosenId(id), ends = segEnds(id);
  const cur = rows.find(r => r.o.id === pick), auto = rows[0];
  const others = rows.filter(r => r.o.id !== pick);
  const c = cur.c;
  $('#p-go').innerHTML = `<div class="wrap">
    <h1 class="pt">ไปยังไงดี</h1>
    <div class="chips">${Object.entries(SEGS).map(([k, x]) => `<button class="${k === id ? 'on' : ''}" data-act="segpick" data-v="${k}">${x.title.replace(' (หลังจบ)', ' ดึก')}</button>`).join('')}</div>
    <div class="seg3">${PRIO.map(([k, l]) => `<button class="${S.prio === k ? 'on' : ''}" data-act="prio" data-v="${k}">${l}</button>`).join('')}</div>
    ${block('green', `${eyebrow(`${g.when} · ${N} คน${g.bags ? ' + กระเป๋า' : ''}`)}
      <h2 class="opt">${cur.o.icon} ${esc(cur.o.label)}</h2>
      <div class="nums"><div><b>${c.known ? range(c) : '—'}</b><span>${c.known ? 'รวม 3 คน' : 'ยังไม่มีราคา'}</span></div><div><b>${c.known ? rm(c.per) : '—'}</b><span>ต่อคน</span></div><div><b>${cur.t}′</b><span>นาที</span></div></div>
      <p class="why">${pick === auto.o.id ? esc(L.reason(rows, N)) : `${g.prefWhy && !S.pick[id] ? esc(g.prefWhy) : 'เลือกเอง'} · โหมด "${PRIO.find(p => p[0] === S.prio)[1]}" แอปแนะนำ ${esc(auto.o.label)}`}</p>
      <div class="acts">${ext(mapsUrl(ends.from, ends.to, cur.o.mode), 'เปิดเส้นทาง', 'dark')}${S.pick[id] ? act('unpick', id, 'คืนค่าตามแผน') : ''}</div>
      ${fold('green-in', 'รายละเอียด', optDetail(id, cur))}`, 'pick')}
    <h2 class="sec">ตัวเลือกอื่น</h2>
    ${others.map((r, i) => fold(OPTC[i % OPTC.length], `<b>${r.o.icon} ${esc(r.o.label)}</b><small>${r.c.known ? range(r.c) : 'ยังไม่มีราคา'} · ${r.t} นาที</small>`, optDetail(id, r) + `<div class="acts">${act('pick', id + '|' + r.o.id, 'ใช้วิธีนี้', 'dark')}${ext(mapsUrl(ends.from, ends.to, r.o.mode), 'แผนที่')}</div>`)).join('')}
    <p class="mut small">ไม่มีข้อมูลสด · ตัวเลขตรวจไว้ ${CHECKED} · ราคา Grab ดูในแอปตอนนั้นแล้วใส่ในช่อง "ราคาที่เห็นจริง"</p>
  </div>`;
}
function optDetail(id, r) {
  const o = r.o, q = (S.quote[id] || {})[o.id];
  return `<div class="stats"><span>เดิน <b>${o.walk} น.</b></span><span>รอรถ <b>${o.wait} น.</b></span><span>เปลี่ยนรถ <b>${o.transfers}</b></span><span>กระเป๋า <b>${['', 'ลำบาก', 'พอได้', 'สะดวก'][o.luggage]}</b></span></div>
    <p>${o.note || ''} ${tag(r.c.fromQuote ? '' : o.fareSt)}</p>${steps(o.steps || [])}
    <label>ราคาที่เห็นจริง (RM รวมทั้งกลุ่ม)</label><div class="inrow"><input inputmode="decimal" id="q-${id}-${o.id}" value="${q != null ? q : ''}" placeholder="${o.mode === 'grab' ? 'เช่น 78' : 'เว้นว่าง = ราคาประมาณ'}"><button data-act="quote" data-v="${id}|${o.id}">ใช้</button></div>
    ${o.src && o.src.length ? srcs(o.src) : ''}`;
}

/* ---------- เงิน ---------- */
const SEGCAT = id => (id === 'arr' || id === 'dep') ? 'air' : (id === 'stadium' || id === 'stadiumRet') ? 'concert' : null;
function autoLines() {
  const linked = new Set(S.exp.map(x => x.link).filter(Boolean));
  const out = []; let unknown = 0;
  for (const it of allItems()) {
    if (linked.has(it.id)) continue;
    if (it.seg) {
      const o = chosen(it.seg), c = costOf(it.seg, o), cat = SEGCAT(it.seg) || (o.mode === 'grab' ? 'grab' : 'public');
      if (!c.known) { unknown++; out.push({ it, o, c, cat }); continue; }
      out.push({ it, o, c, cat, amount: c.mid });
    } else if (it.cost && it.cost.amt > 0) out.push({ it, cat: 'entry', amount: it.cost.amt * (it.cost.per === 'person' ? N : 1) });
  }
  return { out, unknown };
}
function budgetSum() {
  const A = autoLines();
  const lines = S.exp.concat(S.inclAuto ? A.out.filter(x => x.amount != null).map(x => ({ cat: x.cat, amount: x.amount, cur: 'MYR', paid: false })) : []);
  return { ...L.summarize(lines, N, S.rate), unknown: S.inclAuto ? A.unknown : 0, auto: A };
}
const catName = k => (CATS.find(c => c[0] === k) || ['', ''])[1];
function renderMoney() {
  const s = budgetSum(), A = s.auto, moves = L.settle(s.bal);
  const budgetTotal = CATS.reduce((t, [k]) => t + (Number(S.budget[k]) || 0), 0);
  $('#p-money').innerHTML = `<div class="wrap">
    <h1 class="pt">เงินทริป</h1>
    ${block('green', `${eyebrow('รวม 3 คน (ไม่รวมตั๋ว/โรงแรม)')}<div class="huge">${rm(s.total)}</div><p class="lede">คนละ <b>${rm(s.perPerson)}</b> · ${thb(s.perPerson)}</p>
      <div class="nums"><div><b>${rm(s.paid)}</b><span>จ่ายแล้ว</span></div><div><b>${rm(s.est)}</b><span>ประมาณ</span></div><div><b>${budgetTotal ? rm(budgetTotal) : '—'}</b><span>งบ</span></div></div>`)}
    ${s.unknown ? `<p class="warn">${s.unknown} ช่วงทางยังไม่มีราคา ยอดจริงจะสูงกว่านี้</p>` : ''}
    <button class="cta" data-act="expsheet">＋ เพิ่มรายจ่าย</button>
    ${moves.length ? block('pink', `${eyebrow('ใครโอนให้ใคร')}${moves.map(m => `<div class="kv"><b>${esc(S.names[m.from])} → ${esc(S.names[m.to])}</b><span>${rm(m.amt)} · ${thb(m.amt)}</span></div>`).join('')}`) : ''}
    ${S.exp.length ? `<h2 class="sec">รายการ</h2><div class="list">${S.exp.slice().reverse().map(x => `<div class="li"><div><b>${esc(x.desc)}</b><small>${catName(x.cat)} · ${esc(S.names[x.payer] || '')}${x.split === 'payer' ? ' · ไม่หาร' : ''}</small></div>
      <div class="r"><b>${x.cur === 'THB' ? '฿' + x.amount.toLocaleString('en-US') : rm(x.amount)}</b><span><button class="mini ${x.paid ? 'ok' : ''}" data-act="togglepaid" data-v="${x.id}">${x.paid ? 'จ่ายแล้ว' : 'ประมาณ'}</button><button class="mini x" data-act="delexp" data-v="${x.id}" aria-label="ลบ">✕</button></span></div></div>`).join('')}</div>` : ''}
    ${fold('yellow', 'งบตามหมวด', `<p class="mut">ตั้งต้นจากแผนที่เลือก (RM533) · แก้ได้</p>${CATS.map(([k, l]) => { const c = s.cats[k] || { paid: 0, est: 0 }, b = Number(S.budget[k]) || 0, used = c.paid + c.est; return `<div class="bud"><span>${l}</span><input inputmode="decimal" data-budget="${k}" value="${S.budget[k] ?? ''}" placeholder="—"><span class="r">${rm(used)}${used > b && b ? ' <em>เกิน</em>' : ''}</span>${b ? `<i class="bar"><i style="width:${Math.min(100, used / b * 100)}%"></i></i>` : ''}</div>`; }).join('')}`)}
    ${fold('sky', 'ค่าเดินทางประมาณจากแพลน', `<label class="chk"><input type="checkbox" data-act="inclauto" ${S.inclAuto ? 'checked' : ''}> รวมในยอดประมาณ</label>
      ${A.out.map(x => `<div class="li"><div><b>${esc(x.it.title)}</b><small>${x.o ? esc(x.o.label) : 'ค่าเข้าชม'} · ${DAYS.find(d => d.id === x.it.day).label.split(' ').slice(1).join(' ')}</small></div><div class="r"><b>${x.amount != null ? rm(x.amount) : 'ไม่มีราคา'}</b><button class="mini" data-act="paidfrom" data-v="${x.it.id}">จ่ายแล้ว</button></div></div>`).join('')}
      <p class="mut">กด "จ่ายแล้ว" เพื่อใส่ยอดจริง รายการประมาณจะหายไป ไม่นับซ้ำ</p>`)}
    <p class="mut small">เรท ${S.rate} บาท/ริงกิต ${S.rateMine ? '' : tag('est')} · แก้ในตั้งค่า</p>
  </div>`;
}
function expSheet() {
  openSheet(`<h2 class="st">เพิ่มรายจ่าย</h2>
    <label>อะไร</label><input id="x-d" maxlength="80" placeholder="เช่น ข้าวมันไก่">
    <div class="two"><div><label>เท่าไร</label><input id="x-a" inputmode="decimal"></div><div><label>สกุลเงิน</label><select id="x-c"><option>MYR</option><option>THB</option></select></div></div>
    <div class="two"><div><label>ใครจ่าย</label><select id="x-w">${S.names.map((n, i) => `<option value="${i}">${esc(n)}</option>`).join('')}</select></div><div><label>หมวด</label><select id="x-k">${CATS.map(([k, l]) => `<option value="${k}" ${k === 'food' ? 'selected' : ''}>${l}</option>`).join('')}</select></div></div>
    <div class="two"><div><label>หาร</label><select id="x-s"><option value="all">หาร 3 คน</option><option value="payer">ไม่หาร</option></select></div><div><label>สถานะ</label><select id="x-p"><option value="1">จ่ายแล้ว</option><option value="0">ประมาณการ</option></select></div></div>
    <p id="x-err" class="warn" hidden></p><button class="cta" data-act="addexp">บันทึก</button>`);
  setTimeout(() => { const e = $('#x-d'); if (e) e.focus(); }, 50);
}
function addExp() {
  const x = { id: uid(), desc: $('#x-d').value.trim(), amount: Number($('#x-a').value.replace(/,/g, '')), cur: $('#x-c').value, cat: $('#x-k').value, paid: $('#x-p').value === '1', payer: Number($('#x-w').value), split: $('#x-s').value };
  const err = L.validExpense(x);
  if (err.length) { const b = $('#x-err'); b.hidden = false; b.textContent = err.join(' · '); return; }
  S.exp.push(x); save(); closeSheet(); renderMoney();
}
function paidFrom(itemId) {
  const x = budgetSum().auto.out.find(a => a.it.id === itemId); if (!x) return;
  openSheet(`<h2 class="st">จ่ายจริงเท่าไร</h2><p>${esc(x.it.title)}${x.o ? ` · ${esc(x.o.label)}` : ''}</p>
    <label>ยอดรวมทั้งกลุ่ม (RM)</label><input id="y-a" inputmode="decimal" value="${x.amount != null ? r2(x.amount) : ''}">
    <label>ใครจ่าย</label><select id="y-w">${S.names.map((n, i) => `<option value="${i}">${esc(n)}</option>`).join('')}</select>
    <p id="x-err" class="warn" hidden></p><button class="cta" data-act="savepaid" data-v="${itemId}">บันทึก</button>`);
}

/* ---------- วันคอนเสิร์ต ---------- */
function renderConcert() {
  const C = calcTimes(), o = chosen('stadium'), ends = segEnds('stadium'), t = now();
  const isDay = myDate(t) === TRIP.concert.date, after = t > CONCERT_TS && t < CONCERT_TS + 8 * 3600e3;
  const leaveTs = ts(TRIP.concert.date, C.cp.leave), mins = Math.round((leaveTs - t) / 6e4);
  const etaNow = hm(t + (L.optMinutes(o) + S.buffer) * 6e4);
  const ret = ranked('stadiumRet');
  const retBlock = r => `${steps(r.o.steps)}<p class="mut">${r.o.note}</p><div class="acts">${ext(mapsUrl(PL.stadium, PL.hotel, r.o.mode), 'เส้นทางกลับ', 'dark')}${r.o.mode === 'grab' ? ext(placeUrl(PL.endah), 'Endah Parade') : ''}</div>`;
  $('#p-concert').innerHTML = hero(`${eyebrow(isDay ? 'คืนนี้ · TM Stadium Nasional' : '4 พ.ย. · TM Stadium Nasional')}<div class="clock">${hm(t)}</div><p class="lede">เวลา KL ตอนนี้ · The Weeknd ขึ้น <b>${TRIP.concert.start}</b></p>`, true) + `
    <div class="wrap">
    ${after ? block('pink', `${eyebrow('ตอนนี้ · กลับโรงแรม')}<h2 class="opt">แผน A · ${esc(ret[0].o.label)}</h2>${S.meet ? `<p><b>จุดนัด:</b> ${esc(S.meet)}</p>` : ''}${retBlock(ret[0])}`) : ''}
    ${block('yellow', `${eyebrow('ออกจากโรงแรม')}<div class="huge">${C.cp.leave}</div><p class="lede">ถึงสนาม ${C.cp.arrive}${isDay && mins > 0 ? ` · อีก ${mins >= 60 ? Math.floor(mins / 60) + ' ชม. ' : ''}${mins % 60} นาที` : ''}</p>
      ${isDay && mins <= 0 && t < CONCERT_TS ? `<p class="warn">เลยเวลาแล้ว ออกตอนนี้ถึง ~${etaNow}</p>` : ''}
      <div class="seg3 in">${[60, 90, 120, 150].map(m => `<button class="${S.early === m ? 'on' : ''}" data-act="early" data-v="${m}">${m}′</button>`).join('')}</div><p class="mut">ถึงก่อนเริ่มกี่นาที</p>`)}
    ${block('green', `${eyebrow(`ทางไปสนาม · ${L.optMinutes(o)} นาที`)}<h2 class="opt">${o.icon} ${esc(o.label)}</h2>${steps(o.steps)}<div class="acts">${ext(mapsUrl(ends.from, ends.to, o.mode), 'เปิดเส้นทาง', 'dark')}${act('seg', 'stadium', 'เปลี่ยนวิธี')}</div>`)}
    <div class="note tilt"><span class="tape"></span><div class="eb ink">จำไว้ก่อนออก</div>
      <ul class="ticks"><li>ประตูเปิด 16:45 · เปิดวง 18:10 / 19:30</li><li>พาวเวอร์แบงก์ ≤ 10,000 mAh</li><li>กระเป๋า ≤ A4 · ห้ามร่ม</li><li>ที่ฝากของ RM15 จ่ายบัตรเท่านั้น</li></ul>${ext(SRC.lnGuide.url, 'คู่มือผู้จัด →', 'lnk')}</div>
    <h2 class="sec">กลับโรงแรม</h2>
    <p class="warn">ยังไม่มีประกาศขยายเวลารถไฟคืนนี้ — เช็ก MyRapid ก่อนออก</p>
    ${ret.map((r, i) => fold(['pink', 'sky', 'yellow'][i], `<b>แผน ${'ABC'[i]}</b><small>${esc(r.o.label)} · ~${r.t} นาที</small>`, retBlock(r), i === 0 && !after)).join('')}
    ${fold('cream', 'ถ้าทุกแผนใช้ไม่ได้', `<ul class="ticks"><li>คิว LRT เกิน 45 นาที → เดินตามเจ้าหน้าที่ไป Endah Parade แล้วเรียก Grab (ชั่วโมงแรกแพง 2–3 เท่า)</li><li>รถไฟหยุดแล้ว → Grab/แท็กซี่</li><li>เน็ตล่ม → แอปนี้ยังเปิดได้ แต่ Grab/แผนที่ต้องเดินออกห่างสนามก่อน</li></ul>`)}
    ${block('sky', `${eyebrow('ถ้าหลงกัน')}<div class="inrow"><input id="meet" value="${esc(S.meet)}" placeholder="จุดนัด เช่น ทางออก LRT Bukit Jalil" maxlength="120"><button data-act="savemeet">บันทึก</button></div><p class="mut">ติดต่อกันไม่ได้ภายใน 30 นาที → เจอกันที่ NU Hotel</p>`)}
    ${foot()}</div>`;
}

/* ---------- ตั้งค่า ---------- */
const termSel = (id, v) => `<select id="${id}"><option value="">— เลือก —</option><option value="KLIA1" ${v === 'KLIA1' ? 'selected' : ''}>KLIA T1</option><option value="KLIA2" ${v === 'KLIA2' ? 'selected' : ''}>KLIA T2</option></select>`;
function renderSet() {
  const V = verifyState(), done = V.filter(v => v.done).length;
  $('#p-set').innerHTML = `<div class="wrap">
    <h1 class="pt">ก่อนออกเดินทาง</h1>
    <div class="prog"><i style="width:${done / V.length * 100}%"></i></div><p class="mut">${done} จาก ${V.length} เรื่อง</p>
    <div class="checks">${V.map(v => `<div class="ck ${v.done ? 'done' : ''}"><button class="box" ${v.auto ? 'disabled' : `data-act="verify" data-v="${v.id}"`} aria-label="เสร็จ">${v.done ? '✓' : ''}</button>
      <details><summary>${esc(v.t)}</summary><p>${esc(v.how)}${v.auto ? ' · ติ๊กเองเมื่อกรอกข้อมูล' : ''}</p>${v.link ? `<a href="${v.link.url}" target="_blank" rel="noopener">${esc(v.link.label)} →</a>` : ''}</details></div>`).join('')}</div>
    <h2 class="sec">ตั้งค่า</h2>
    ${fold('sky', 'เที่ยวบิน', `<b>ขาไป 3 พ.ย.</b>
      <div class="two"><div><label>ไฟลต์</label><input id="o-no" value="${esc(S.out.no)}"></div><div><label>Terminal</label>${termSel('o-t', S.out.terminal)}</div></div>
      <div class="two"><div><label>ออก (ไทย)</label><input id="o-d" type="time" value="${esc(S.out.dep)}"></div><div><label>ถึง (มาเลย์)</label><input id="o-a" type="time" value="${esc(S.out.arr)}"></div></div>
      <b class="mt">ขากลับ 5 พ.ย.</b>
      <div class="two"><div><label>ไฟลต์</label><input id="r-no" value="${esc(S.ret.no)}"></div><div><label>Terminal</label>${termSel('r-t', S.ret.terminal)}</div></div>
      <div class="two"><div><label>ออก (มาเลย์)</label><input id="r-d" type="time" value="${esc(S.ret.dep)}"></div><div><label>ถึง (ไทย)</label><input id="r-a" type="time" value="${esc(S.ret.arr || '')}"></div></div>
      <p class="mut">มาเลเซียเร็วกว่าไทย 1 ชม. · ไม่ใส่รหัสจองในแอปนี้</p><p id="fl-err" class="warn" hidden></p><button class="cta" data-act="saveflight">บันทึกเที่ยวบิน</button>`)}
    ${fold('yellow', 'เวลาเผื่อ', `<div class="two"><div><label>ถึงสนามบินก่อนบิน (นาที)</label><input id="t-air" inputmode="numeric" value="${S.airportMin}"></div><div><label>เผื่อเดินทาง (นาที)</label><input id="t-buf" inputmode="numeric" value="${S.buffer}"></div></div>
      <label>ถึงสนามคอนเสิร์ตก่อนเริ่ม (นาที)</label><input id="t-early" inputmode="numeric" value="${S.early}"><button class="cta" data-act="savetimes">บันทึก</button>`)}
    ${fold('green', 'เงินและชื่อ', `<label>บาท ต่อ 1 ริงกิต</label><input id="fx" inputmode="decimal" value="${S.rate}">
      <p class="mut">ตั้งต้น 8.20 (เรทล่าสุดที่หาได้ ก.ค. 2026) · แผนใช้ 8.33 · กรอกเรทจริง</p>
      <label>ชื่อ 3 คน</label>${S.names.map((n, i) => `<input id="nm-${i}" value="${esc(n)}" maxlength="20" class="mb">`).join('')}<button class="cta" data-act="savemoney">บันทึก</button>`)}
    ${fold('pink', 'แอปแผนที่และธีม', `<label>เปิดเส้นทางด้วย</label><div class="seg3 in">${Object.entries(MAPNAME).map(([k, l]) => `<button class="${S.mapApp === k ? 'on' : ''}" data-act="mapapp" data-v="${k}">${l.replace(' Maps', '')}</button>`).join('')}</div>
      <label>ธีม</label><div class="seg3 in">${[['auto', 'ตามเครื่อง'], ['light', 'สว่าง'], ['dark', 'มืด']].map(([k, l]) => `<button class="${S.theme === k ? 'on' : ''}" data-act="theme" data-v="${k}">${l}</button>`).join('')}</div>`)}
    ${fold('lilac', 'ย้ายข้อมูลไปเครื่องเพื่อน', `<p class="mut">ข้อมูลที่แก้เก็บในเครื่องนี้เท่านั้น คัดลอกแล้วส่งให้เพื่อนวางที่ช่องนี้</p>
      <div class="acts">${act('export', '', 'คัดลอกข้อมูล')}${act('import', '', 'นำเข้า')}${act('reset', '', 'ล้างทั้งหมด')}</div><textarea id="io" placeholder="วางข้อมูลที่นี่"></textarea><p id="io-msg" class="mut"></p>`)}
    ${foot()}${storeOk ? '' : '<p class="warn">บันทึกในเครื่องไม่ได้ (โหมดส่วนตัว?)</p>'}</div>`;
}

/* ---------- navigation / events ---------- */
const R = { now: renderNow, plan: renderPlan, go: renderGo, money: renderMoney, concert: renderConcert, set: renderSet };
let page = 'now';
function go(p, keepScroll) {
  if (!R[p]) p = 'now';
  page = p; document.querySelectorAll('.page').forEach(e => e.classList.toggle('on', e.id === 'p-' + p));
  document.querySelectorAll('.tabbar button').forEach(b => b.classList.toggle('on', b.dataset.p === p));
  document.body.dataset.page = p;
  R[p](); if (!keepScroll) window.scrollTo(0, 0);
  try { history.replaceState(null, '', location.search + '#' + p); } catch (e) { }
}
const closeSheet = () => $('#sheet').classList.remove('on');
const num = v => { const n = Number(String(v).replace(/,/g, '').trim()); return isFinite(n) ? n : null; };
function applyTheme() { const t = S.theme; if (t === 'auto') document.documentElement.removeAttribute('data-theme'); else document.documentElement.setAttribute('data-theme', t); }
const showErr = (sel, msg) => { const b = $(sel); b.hidden = false; b.textContent = msg; };

document.addEventListener('click', e => {
  const nb = e.target.closest('.tabbar button'); if (nb) return go(nb.dataset.p);
  if (e.target.closest('#sheet .x') || e.target.id === 'sheet') return closeSheet();
  const b = e.target.closest('[data-act]'); if (!b || b.tagName === 'SELECT' || (b.tagName === 'INPUT' && b.type !== 'checkbox')) return;
  const a = b.dataset.act, v = b.dataset.v;
  const H = {
    day: () => { S.day = v; save(); if (page === 'plan') renderPlan(); },
    editmode: () => { S.edit = !S.edit; save(); renderPlan(); },
    edit: () => { e.preventDefault(); editSheet(v); },
    add: () => editSheet(null, v),
    saveitem: () => saveItem(v),
    hide: () => { S.ov[v] = { ...(S.ov[v] || {}), hid: true }; afterEdit(); },
    unhide: () => { if (S.ov[v]) { delete S.ov[v].hid; if (!Object.keys(S.ov[v]).length) delete S.ov[v]; } save(); rebuild(); renderPlan(); },
    resetitem: () => { delete S.ov[v]; afterEdit(); },
    delitem: () => { S.custom = S.custom.filter(x => x.id !== v); afterEdit(); },
    up: () => moveItem(v, -1), down: () => moveItem(v, 1),
    resetorder: () => { delete S.order[v]; save(); rebuild(); renderPlan(); },
    idea: () => { const [iid, dd] = v.split('|'); const i = IDEAS.find(x => x.id === iid); const id = uid(); S.custom.push({ id, idea: iid, day: dd || i.fit, title: i.title, s: '', e: '', place: i.place, note: i.why, cat: 'see', icon: i.icon, q: i.q, status: 'chk' }); S.day = dd || i.fit; save(); rebuild(); go('plan', true); editSheet(id); },
    seg: () => { e.preventDefault(); S.seg = v; save(); go('go'); },
    segpick: () => { S.seg = v; save(); renderGo(); },
    prio: () => { S.prio = v; save(); rebuild(); renderGo(); },
    pick: () => { const [g, o] = v.split('|'); S.pick[g] = o; save(); rebuild(); renderGo(); window.scrollTo(0, 0); },
    unpick: () => { delete S.pick[v]; save(); rebuild(); renderGo(); },
    quote: () => { const [g, o] = v.split('|'); const raw = $(`#q-${g}-${o}`).value.trim(); S.quote[g] = S.quote[g] || {}; if (raw === '') delete S.quote[g][o]; else { const n = num(raw); if (n == null || n < 0) return alert('ใส่ราคาเป็นตัวเลข'); S.quote[g][o] = n; } save(); rebuild(); renderGo(); },
    expsheet: () => expSheet(),
    addexp: () => addExp(),
    togglepaid: () => { const x = S.exp.find(y => y.id === v); if (x) x.paid = !x.paid; save(); renderMoney(); },
    delexp: () => { if (!confirm('ลบรายการนี้?')) return; S.exp = S.exp.filter(y => y.id !== v); save(); renderMoney(); },
    inclauto: () => { S.inclAuto = b.checked; save(); const y = scrollY; renderMoney(); scrollTo(0, y); },
    paidfrom: () => paidFrom(v),
    savepaid: () => { const x = budgetSum().auto.out.find(a => a.it.id === v); const ex = { id: uid(), desc: x.it.title + (x.o ? ' · ' + x.o.label : ''), amount: num($('#y-a').value), cur: 'MYR', cat: x.cat, paid: true, payer: Number($('#y-w').value), split: 'all', link: v }; const err = L.validExpense(ex); if (err.length) return showErr('#x-err', err.join(' · ')); S.exp.push(ex); save(); closeSheet(); renderMoney(); },
    early: () => { S.early = Number(v); save(); rebuild(); renderConcert(); },
    savemeet: () => { S.meet = $('#meet').value.trim(); save(); b.textContent = '✓'; },
    verify: () => { S.verify[v] = !S.verify[v]; save(); const y = scrollY; renderSet(); scrollTo(0, y); },
    saveflight: () => {
      const out = { ...S.out, no: $('#o-no').value.trim().toUpperCase(), terminal: $('#o-t').value, dep: $('#o-d').value, arr: $('#o-a').value };
      const ret = { ...S.ret, no: $('#r-no').value.trim().toUpperCase(), terminal: $('#r-t').value, dep: $('#r-d').value, arr: $('#r-a').value };
      const err = L.validFlight(out).map(x => 'ขาไป: ' + x).concat(L.validFlight(ret).map(x => 'ขากลับ: ' + x));
      if (err.length) return showErr('#fl-err', err.join(' · '));
      S.out = out; S.ret = ret; save(); rebuild(); b.textContent = '✓ บันทึกแล้ว';
    },
    savetimes: () => { const a2 = num($('#t-air').value), bf = num($('#t-buf').value), ea = num($('#t-early').value); if ([a2, bf, ea].some(x => x == null || x < 0 || x > 600)) return alert('ใส่ตัวเลข 0–600 นาที'); S.airportMin = a2; S.buffer = bf; S.early = ea; save(); rebuild(); b.textContent = '✓ บันทึกแล้ว'; },
    savemoney: () => { const r = num($('#fx').value); if (r == null || r <= 0 || r > 50) return alert('อัตราแลกเปลี่ยนไม่ถูกต้อง'); if (r !== S.rate) { S.rate = r; S.rateMine = true; } S.names = S.names.map((n, i) => $('#nm-' + i).value.trim() || n); save(); b.textContent = '✓ บันทึกแล้ว'; },
    mapapp: () => { S.mapApp = v; save(); renderSet(); },
    theme: () => { S.theme = v; save(); applyTheme(); renderSet(); },
    export: async () => { const t = JSON.stringify(S); $('#io').value = t; try { await navigator.clipboard.writeText(t); $('#io-msg').textContent = 'คัดลอกแล้ว ✓'; } catch (er) { $('#io-msg').textContent = 'คัดลอกจากช่องด้านบนเอง'; $('#io').select(); } },
    import: () => { try { const j = JSON.parse($('#io').value); if (!j || typeof j !== 'object' || !Array.isArray(j.exp) || typeof j.ov !== 'object') throw 0; S = { ...DEF, ...j, out: { ...DEF.out, ...(j.out || {}) }, ret: { ...DEF.ret, ...(j.ret || {}) } }; save(); applyTheme(); rebuild(); go('now'); } catch (er) { $('#io-msg').textContent = 'ข้อมูลไม่ถูกต้อง'; } },
    reset: () => { if (!confirm('ล้างทุกอย่างที่แก้/บันทึกไว้ในเครื่องนี้?')) return; S = JSON.parse(JSON.stringify(DEF)); save(); applyTheme(); rebuild(); go('now'); },
  };
  if (H[a]) H[a]();
});
document.addEventListener('change', e => {
  const t = e.target;
  if (t.dataset.budget) { const n = num(t.value); if (t.value.trim() === '') delete S.budget[t.dataset.budget]; else if (n != null && n >= 0) S.budget[t.dataset.budget] = n; save(); const y = scrollY; renderMoney(); scrollTo(0, y); const f = document.querySelector('#p-money details.c-yellow'); if (f) f.open = true; }
});
window.addEventListener('hashchange', () => { const p = location.hash.slice(1); if (p !== page) go(p); });
window.addEventListener('online', () => R[page]()); window.addEventListener('offline', () => R[page]());
setInterval(() => { const f = document.activeElement; if ((page === 'now' || page === 'concert') && !(f && /INPUT|TEXTAREA|SELECT/.test(f.tagName)) && !$('#sheet').classList.contains('on') && !document.querySelector(`#p-${page} details[open]`)) R[page](); }, 30000);

applyTheme(); rebuild();
go((location.hash || '#now').slice(1));
if ('serviceWorker' in navigator && location.protocol !== 'file:') navigator.serviceWorker.register('sw.js').catch(() => { });
