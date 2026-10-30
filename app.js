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
const ST = { ok: ['b-ok', 'ยืนยันแล้ว'], est: ['b-est', 'ประมาณการ'], chk: ['b-chk', 'รอตรวจสอบ'], me: ['b-me', 'ข้อมูลของเรา'], need: ['b-need', 'ต้องกรอก'] };
const badge = st => st && ST[st] ? `<span class="bdg ${ST[st][0]}">${ST[st][1]}</span>` : '';
const srcs = arr => (arr && arr.length) ? `<div class="src">แหล่งอ้างอิง · ตรวจล่าสุด ${CHECKED}${arr.map(s => `<a href="${s.url}" target="_blank" rel="noopener">${esc(s.label)} ↗</a>`).join('')}</div>` : '';
const ext = (url, label, cls) => `<a class="btn ${cls || ''}" href="${url}" target="_blank" rel="noopener">${label}</a>`;
const act = (a, v, label, cls) => `<button class="btn ${cls || ''}" data-act="${a}" data-v="${esc(v || '')}">${label}</button>`;
const r2 = v => Math.round(v * 100) / 100;
const rm = v => v == null ? '—' : 'RM' + r2(v).toLocaleString('en-US', { minimumFractionDigits: v % 1 ? 2 : 0, maximumFractionDigits: 2 });
const thb = v => { const t = L.toThb(v, S.rate); return t == null ? '' : '฿' + Math.round(t).toLocaleString('en-US'); };
const money = v => `${rm(v)} <span class="mut">≈ ${thb(v)}</span>`;
const range = c => !c.known ? 'ยังไม่มีราคา' : c.min === c.max ? rm(c.min) : `${rm(c.min)}–${rm(c.max)}`;
const dots = (v, max) => '●'.repeat(Math.round(v)) + '○'.repeat(Math.max(0, max - Math.round(v)));

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

/* ---------- การ์ดกิจกรรม ---------- */
function itemCard(it, prev) {
  const C = calcTimes();
  const clash = prev && prev.s && it.s && L.hmToMin(it.s) < L.hmToMin(prev.e || prev._eAuto || prev.s);
  const mv = it.seg ? chosen(it.seg) : null;
  const ends = it.seg ? segEnds(it.seg) : null;
  const cost = it.cost && it.cost.amt > 0 ? `<div class="kv"><b>ค่าใช้จ่ายประมาณ:</b> ${money(it.cost.amt * (it.cost.per === 'person' ? N : 1))} (${rm(it.cost.amt)}${it.cost.per === 'person' ? '/คน' : '/กลุ่ม'})</div>` : '';
  const why = it.calc === 'concertLeave' ? `<div class="mut">ถึงสนามก่อนเริ่ม ${S.early} นาที − เดินทาง ${L.optMinutes(mv)} นาที − เผื่อ ${S.buffer} นาที</div>`
    : it.calc === 'airLeave' ? (C.ap ? `<div class="mut">ถึงสนามบินก่อนเครื่องออก ${S.airportMin} นาที (${C.ap.arrive}) − เดินทาง ${L.optMinutes(mv)} นาที − เผื่อ ${S.buffer} นาที</div>` : `<div class="warn">ยังไม่มีเวลาบินกลับ — ${act('go', 'set', 'กรอกในตั้งค่า', 'sm')}</div>`) : '';
  return `<div class="card ${it.cat === 'move' ? 'rt' : ''} ${it.cat === 'concert' ? 'hl' : ''} ${it.cat === 'rest' ? 'rest' : ''}" id="c-${it.id}">
    <div class="row sp" style="flex-wrap:nowrap;align-items:flex-start"><div style="min-width:0">
      <div class="time">${timeTxt(it)}</div>
      <h3>${it.icon || '📍'} ${esc(it.title)}</h3>
      <div class="mut">${esc(it.place || '')}</div></div>
      <button class="edit" data-act="edit" data-v="${it.id}" aria-label="แก้ไข">✏️</button></div>
    <div class="row" style="gap:4px;margin-top:4px">${it.seg ? '' : badge(it.status)}${it.prio === 'nice' ? '<span class="bdg b-chk">ตัดได้ถ้าเหนื่อย</span>' : ''}${it._ed ? '<span class="bdg b-me">แก้เอง</span>' : ''}${it._custom ? '<span class="bdg b-me">เพิ่มเอง</span>' : ''}</div>
    ${clash ? '<div class="warn">⏰ เวลาเริ่มทับกับรายการก่อนหน้า</div>' : ''}
    ${why}
    ${mv ? `<div class="kv" style="margin-top:6px">${optLine(it.seg, mv)}</div>` : ''}
    ${cost}
    ${it.note ? `<p class="mut">${it.note}</p>` : ''}
    <div class="row" style="margin-top:6px">
      ${mv ? act('seg', it.seg, '🔁 เทียบวิธีเดินทาง', 'sm') + ext(mapsUrl(ends.from, ends.to, mv.mode), '🧭 เปิดเส้นทาง', 'sm') : it.q ? ext(placeUrl(it.q), '📍 เปิดแผนที่', 'sm') : ''}
    </div>
    ${srcs(it.src)}
  </div>`;
}

/* ---------- หน้า ภาพรวม ---------- */
function countdown() {
  const d = CONCERT_TS - now();
  if (d <= 0) return now() < CONCERT_TS + 4 * 3600e3 ? '<div class="big">🎤 คอนเสิร์ตเริ่มแล้ว</div>' : '<div class="big">จบทริปคอนเสิร์ตแล้ว 🎉</div>';
  const dd = Math.floor(d / 864e5), h = Math.floor(d % 864e5 / 36e5), m = Math.floor(d % 36e5 / 6e4);
  return `<div class="cd"><div><b>${dd}</b>วัน</div><div><b>${h}</b>ชม.</div><div><b>${m}</b>นาที</div></div>`;
}
function verifyState() { return VERIFY.map(v => ({ ...v, done: v.auto === 'ret' ? L.isHm(S.ret.dep) : v.auto === 'term' ? !!(S.out.terminal && S.ret.terminal) : v.auto === 'fx' ? S.rateMine : !!S.verify[v.id] })); }
function renderNow() {
  const C = calcTimes(), { cur, nxt } = nextItems(), V = verifyState(), left = V.filter(v => !v.done);
  const sum = budgetSum();
  $('#p-now').innerHTML = `
    <div class="card hero"><div class="mut">นับถอยหลังถึง The Weeknd · ${TRIP.concert.start} น. 4 พ.ย. (เวลามาเลเซีย)</div>${countdown()}
      <div class="mut">ตอนนี้ที่ KL ${hm(now())} น. · ${fmt(now(), { weekday: 'short', day: 'numeric', month: 'short' })}${SIM ? ' <span class="bdg b-need">โหมดจำลองเวลา</span>' : ''}</div></div>
    ${cur ? `<h2>ตอนนี้</h2>${itemCard(cur)}` : ''}
    ${nxt ? `<h2>ถัดไป · ${fmt(nxt.at, { weekday: 'short', day: 'numeric', month: 'short' })}</h2>${itemCard(nxt)}` : ''}
    <h2>เวลาที่ต้องออกจากโรงแรม</h2>
    <div class="card"><div class="row sp"><div><div class="mut">ไปคอนเสิร์ต (4 พ.ย.)</div><div class="big time">${C.cp.leave}</div></div><div style="text-align:right"><div class="mut">ถึงสนาม</div><div class="big">${C.cp.arrive}</div></div></div>
      <div class="mut">${optLine('stadium', chosen('stadium'))}</div>${act('go', 'concert', '🎤 เปิดโหมดวันคอนเสิร์ต', 'sm')}</div>
    <div class="card"><div class="row sp"><div><div class="mut">ไปสนามบิน (5 พ.ย.)</div><div class="big time">${C.ap ? C.ap.leave : '—'}</div></div><div style="text-align:right"><div class="mut">เครื่องออก</div><div class="big">${S.ret.dep || '—'}</div></div></div>
      <div class="mut">${C.ap ? `${S.ret.no || ''} · KLIA ${termTxt(S.ret.terminal)} · ถึงสนามบิน ${C.ap.arrive} · ${optLine('dep', chosen('dep'))}` : 'กรอกเวลาบินกลับในตั้งค่า'}</div></div>
    <h2>ทริป</h2>
    <div class="card"><div class="kv"><b>เมือง:</b> ${TRIP.destination} · 3–5 พ.ย. 2026 · ${N} คน (${S.names.map(esc).join(', ')})</div>
      <div class="kv"><b>โรงแรม:</b> ${TRIP.hotel.name} ${badge(TRIP.hotel.status)}<br><span class="mut">${TRIP.hotel.area} · เช็กอิน ${TRIP.hotel.checkIn} · เช็กเอาต์ ${TRIP.hotel.checkOut}</span></div>
      <div class="kv"><b>ขาไป:</b> ${esc(S.out.no)} ${esc(S.out.from)} ${esc(S.out.dep)} (ไทย) → KLIA ${termTxt(S.out.terminal)} ${esc(S.out.arr)} ${badge(S.out.arr ? 'me' : 'need')}</div>
      <div class="kv"><b>ขากลับ:</b> ${esc(S.ret.no)} KLIA ${termTxt(S.ret.terminal)} ${esc(S.ret.dep || '—')} → DMK ${esc(S.ret.arr || '')} (ไทย) ${badge(S.ret.dep ? 'me' : 'need')}</div>
      <div class="kv"><b>คอนเสิร์ต:</b> ${TRIP.concert.title} · ${TRIP.concert.venue} · ${TRIP.concert.ticket} ${badge(TRIP.concert.status)}<br><span class="mut">${TRIP.concert.note}</span></div>
      ${ext(placeUrl(PL.hotel), '📍 โรงแรมในแผนที่', 'sm')}</div>
    <h2>เงิน</h2>
    <div class="card" data-act="go" data-v="money"><div class="row sp"><div><div class="mut">รวมทั้งทริป (${N} คน)</div><div class="big">${rm(sum.total)}</div><div class="mut">${thb(sum.total)}</div></div><div style="text-align:right"><div class="mut">ต่อคน</div><div class="big">${rm(sum.perPerson)}</div><div class="mut">${thb(sum.perPerson)}</div></div></div>
      <div class="mut">จ่ายแล้ว ${rm(sum.paid)} · ประมาณการ ${rm(sum.est)}${sum.unknown ? ` · ยังไม่มีราคา ${sum.unknown} ช่วงทาง` : ''} · ไม่รวมตั๋วเครื่องบิน โรงแรม ตั๋วคอนเสิร์ต</div></div>
    <h2>ต้องยืนยันก่อนเดินทาง (${V.length - left.length}/${V.length})</h2>
    <div class="card">${left.length ? `<ul>${left.slice(0, 5).map(v => `<li>${esc(v.t)}</li>`).join('')}</ul>${left.length > 5 ? `<div class="mut">และอีก ${left.length - 5} รายการ</div>` : ''}` : '<p>ครบแล้ว ✅</p>'}${act('go', 'set', 'ไปเช็กลิสต์', 'sm')}</div>
    <h2>ป้ายสถานะข้อมูล</h2>
    <div class="card legend">${Object.keys(ST).map(k => `<div>${badge(k)} <span class="mut">${{ ok: 'มาจากแหล่งทางการ หรือหลายแหล่งตรงกัน', est: 'ประมาณจากเว็บรีวิว/ระยะทาง ราคาจริงอาจต่าง', chk: 'แหล่งขัดกัน หรือยังไม่ประกาศ ต้องเช็กก่อนใช้', me: 'ข้อมูลที่เรากรอกหรือแก้เอง', need: 'ยังไม่มี ต้องกรอก' }[k]}</span></div>`).join('')}</div>
    ${offlineLine()}`;
}
const termTxt = t => t ? t.replace('KLIA', 'T') : '<span class="bdg b-need">ต้องกรอก</span>';

/* ---------- หน้า แพลน ---------- */
function curDay() { if (S.day) return S.day; const d = myDate(now()); const m = DAYS.find(x => x.date === d); return m ? m.id : 'd1'; }
function renderPlan() {
  const dId = curDay(), d = DAYV.find(x => x.id === dId);
  const vis = d.eff.filter(i => !i.hid), hid = d.eff.filter(i => i.hid);
  const ideas = IDEAS.filter(i => !S.custom.some(c => c.idea === i.id));
  $('#p-plan').innerHTML = `
    <div class="tabs">${DAYV.map(x => `<button class="btn ${x.id === dId ? 'on' : ''}" data-act="day" data-v="${x.id}">${x.label.split(' ').slice(1).join(' ')}</button>`).join('')}</div>
    <div class="row sp"><div><h2 style="margin:6px 0 0">${d.label}</h2><div class="mut">${d.title}</div></div>
      <button class="btn sm ${S.edit ? 'on' : ''}" data-act="editmode">${S.edit ? '✓ เสร็จ' : '↕️ จัดลำดับ'}</button></div>
    ${d.concert ? '<div class="off">วันคอนเสิร์ต: ไม่มีที่เที่ยวไกล (ตัด Batu Caves แล้ว) พักบ่ายในห้อง 3 ชม. · บัตรนั่ง ไม่ต้องไปตอนประตูเปิด กินข้าวเย็นก่อนออก</div>' : ''}
    ${S.edit ? editList(vis, dId) : vis.map((it, i) => itemCard(it, vis[i - 1])).join('')}
    ${hid.length ? `<details><summary>ซ่อนไว้ ${hid.length} รายการ</summary>${hid.map(i => `<div class="erow hid"><span class="etx">${esc(i.title)}</span>${act('unhide', i.id, 'คืน', 'sm')}</div>`).join('')}</details>` : ''}
    <div class="row" style="margin-top:10px">${act('add', dId, '＋ เพิ่มกิจกรรม', 'pri')}${S.order[dId] ? act('resetorder', dId, 'คืนลำดับเดิม', 'sm') : ''}</div>
    <h2>ไอเดียที่เที่ยวเพิ่ม</h2>
    <div class="mut">ยังไม่อยู่ในแพลน · รายละเอียดเวลาเปิด-ปิด/ราคายังไม่ได้ตรวจ</div>
    ${ideas.map(i => `<div class="card"><div class="row sp" style="flex-wrap:nowrap"><div style="min-width:0"><h3>${i.icon} ${esc(i.title)}</h3><div class="mut">${esc(i.place)} · ~${i.dur} นาที</div></div>${badge('chk')}</div><p class="mut">${esc(i.why)}</p>
      <div class="row">${act('idea', i.id, `＋ เพิ่มเข้า ${DAYS.find(x => x.id === (i.fit === dId ? dId : i.fit)).label}`, 'sm')}${i.fit !== dId ? act('idea', i.id + '|' + dId, '＋ วันนี้', 'sm') : ''}${ext(placeUrl(i.q), '📍', 'sm')}</div></div>`).join('')}`;
}
function editList(vis, dId) {
  return `<div class="mut">กด ↑ ↓ เพื่อย้ายลำดับ · กดชื่อเพื่อแก้เวลา/รายละเอียด</div>` + vis.map((it, i) => `<div class="erow">
    <button class="mv" data-act="up" data-v="${it.id}" ${i === 0 ? 'disabled' : ''} aria-label="ขึ้น">↑</button>
    <button class="mv" data-act="down" data-v="${it.id}" ${i === vis.length - 1 ? 'disabled' : ''} aria-label="ลง">↓</button>
    <span class="etx" data-act="edit" data-v="${it.id}"><span class="time">${timeTxt(it)}</span> ${it.icon || ''} ${esc(it.title)}</span></div>`).join('');
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
function editSheet(id, day) {
  const it = id ? findItem(id) : { id: '', day, title: '', s: '', e: '', place: '', note: '', cat: 'see', icon: '📍' };
  const calc = it.calc && !S.ov[it.id]?.s ? '<div class="off">เวลานี้แอปคำนวณให้อัตโนมัติ ถ้าแก้เวลาเอง จะไม่คำนวณใหม่อีก (กด "คืนค่าเดิม" เพื่อกลับไปคำนวณ)</div>' : '';
  $('#sheet .in').innerHTML = `<h2>${id ? 'แก้กิจกรรม' : 'เพิ่มกิจกรรม'}</h2>${calc}
    <label>ชื่อ</label><input id="f-t" value="${esc(it.title)}" maxlength="80">
    <div class="two"><div><label>เริ่ม (HH:MM)</label><input id="f-s" type="time" value="${esc(it.s || '')}"></div><div><label>จบ (HH:MM)</label><input id="f-e" type="time" value="${esc(it.e || '')}"></div></div>
    <label>สถานที่</label><input id="f-p" value="${esc((it.place || '').replace(/<[^>]+>/g, ''))}" maxlength="120">
    <label>ค่าใช้จ่ายประมาณ (RM ต่อคน · เว้นว่างได้)</label><input id="f-c" inputmode="decimal" value="${it.cost && it.cost.amt ? it.cost.amt : ''}">
    <label>โน้ต</label><textarea id="f-n" maxlength="400">${esc((it.note || '').replace(/<[^>]+>/g, ''))}</textarea>
    <div id="f-err" class="warn" style="display:none"></div>
    <div class="row" style="margin-top:10px">${act('saveitem', (id || '') + '|' + (it.day || day), '💾 บันทึก', 'pri')}</div>
    ${id ? `<div class="row" style="margin-top:8px">${it._custom ? act('delitem', id, '🗑 ลบ', 'sm') : act('hide', id, '🙈 ซ่อนจากแพลน', 'sm') + (S.ov[id] && S.ov[id] ? act('resetitem', id, 'คืนค่าเดิม', 'sm') : '')}</div>` : ''}`;
  $('#sheet').classList.add('on');
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
  if (err.length) { const b = $('#f-err'); b.style.display = 'block'; b.textContent = err.join(' · '); return; }
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

/* ---------- หน้า เดินทาง ---------- */
const PRIO = [['cheap', '💸 ประหยัดสุด'], ['balanced', '⚖️ สมดุล'], ['fast', '⚡ เร็ว+สบาย']];
function renderGo() {
  const id = SEGS[S.seg] ? S.seg : 'arr', g = SEGS[id], rows = ranked(id), pick = chosenId(id), ends = segEnds(id);
  const auto = rows[0].o.id;
  $('#p-go').innerHTML = `
    <label>ช่วงทาง</label><select data-act="segsel">${Object.entries(SEGS).map(([k, x]) => `<option value="${k}" ${k === id ? 'selected' : ''}>${x.title} · ${x.when}</option>`).join('')}</select>
    <label>เน้นอะไร</label><div class="tabs" style="position:static">${PRIO.map(([k, l]) => `<button class="btn ${S.prio === k ? 'on' : ''}" data-act="prio" data-v="${k}">${l}</button>`).join('')}</div>
    <div class="card hero"><div class="mut">แนะนำสำหรับ ${N} คน${g.bags ? ' + กระเป๋า' : ''}</div><h3>${rows[0].o.icon} ${esc(rows[0].o.label)}</h3><p>${L.reason(rows, N)}</p>
      ${pick !== auto ? `<div class="off">แพลนใช้ <b>${esc(g.options.find(o => o.id === pick).label)}</b> ${S.pick[id] ? 'ตามที่เลือกเอง' : esc(g.prefWhy ? '— ' + g.prefWhy : '')} ${act('pick', id + '|' + auto, 'ใช้ตัวที่แอปแนะนำ', 'sm')}${S.pick[id] ? act('unpick', id, 'คืนค่าตามแผน', 'sm') : ''}</div>` : g.prefWhy && !S.pick[id] ? `<div class="off">ตรงกับแผนที่เลือก — ${esc(g.prefWhy)}</div>` : ''}
      <div class="mut">คำนวณจากราคา/เวลาประมาณ — ราคา Grab ต้องดูในแอป ณ เวลาจริง และอาจขึ้นตามรถติด/ฝน</div></div>
    ${rows.map((r, i) => optCard(id, r, i, pick, ends)).join('')}
    <div class="mut" style="margin:10px 0">ไม่มีระบบดึงข้อมูลสด (ไม่มี API key) ทุกตัวเลขเป็นข้อมูลที่ตรวจไว้ ${CHECKED} · ถ้าเห็นราคาจริงในแอป ใส่ในช่อง "ราคาที่เห็นจริง" แล้วแอปจะเทียบใหม่</div>`;
}
function optCard(id, r, i, pick, ends) {
  const o = r.o, c = r.c, q = (S.quote[id] || {})[o.id];
  return `<div class="card ${o.id === pick ? 'sel' : ''}">
    <div class="row sp" style="flex-wrap:nowrap;align-items:flex-start"><div><span class="pill">#${i + 1}</span> <h3 style="display:inline">${o.icon} ${esc(o.label)}</h3></div>${o.id === pick ? '<span class="bdg b-ok">ใช้ตัวนี้</span>' : ''}</div>
    <div class="grid3">
      <div><b>รวม ${N} คน</b>${range(c)}</div><div><b>ต่อคน</b>${c.known ? (c.perMin === c.perMax ? rm(c.per) : `${rm(c.perMin)}–${rm(c.perMax)}`) : '—'}</div><div><b>เวลารวม</b>${r.t} นาที</div>
      <div><b>นั่งรถ</b>${o.ride} น.</div><div><b>เดิน</b>${o.walk} น.</div><div><b>รอรถ</b>${o.wait} น.</div>
      <div><b>เปลี่ยนรถ</b>${o.transfers} ครั้ง</div><div><b>ขนกระเป๋า</b>${['', 'ลำบาก', 'พอได้', 'สะดวก'][o.luggage]}</div><div><b>ความเหนื่อย</b>${dots(o.fatigue, 5)}</div>
    </div>
    <div class="kv"><b>เสี่ยงติด/ล่าช้า/คิว:</b> ${dots(o.risk, 5)} · ราคา ${badge(c.fromQuote ? 'me' : o.fareSt)} · เวลา ${badge(o.timeSt)}</div>
    <p class="mut">${o.note || ''}</p>
    <details><summary>วิธีไปทีละขั้น</summary><ol>${(o.steps || []).map(s => `<li>${s}</li>`).join('')}</ol></details>
    <label>ราคาที่เห็นจริง (RM รวมทั้งกลุ่ม)</label>
    <div class="row" style="flex-wrap:nowrap"><input inputmode="decimal" id="q-${id}-${o.id}" value="${q != null ? q : ''}" placeholder="${o.mode === 'grab' ? 'เช่น 78 จากแอป Grab' : 'เว้นว่าง = ใช้ราคาประมาณ'}">${act('quote', id + '|' + o.id, 'ใช้', 'sm')}</div>
    <div class="row" style="margin-top:8px">${o.id !== pick ? act('pick', id + '|' + o.id, '✓ เลือกวิธีนี้', 'sm') : ''}${ext(mapsUrl(ends.from, ends.to, o.mode), '🧭 ' + MAPNAME[S.mapApp], 'sm')}</div>
    ${srcs(o.src)}</div>`;
}

/* ---------- หน้า เงิน ---------- */
const SEGCAT = id => (id === 'arr' || id === 'dep') ? 'air' : (id === 'stadium' || id === 'stadiumRet') ? 'concert' : null;
function autoLines() {
  // ค่าประมาณจากแพลน: ทุกช่วงเดินทางที่ยังอยู่ในแพลน + ค่าเข้าชม — ข้ามรายการที่บันทึกจ่ายจริงแล้ว
  const linked = new Set(S.exp.map(x => x.link).filter(Boolean));
  const out = []; let unknown = 0;
  for (const it of allItems()) {
    if (linked.has(it.id)) continue;
    if (it.seg) {
      const o = chosen(it.seg), c = costOf(it.seg, o);
      if (!c.known) { unknown++; out.push({ it, o, c, cat: SEGCAT(it.seg) || (o.mode === 'grab' ? 'grab' : 'public') }); continue; }
      out.push({ it, o, c, cat: SEGCAT(it.seg) || (o.mode === 'grab' ? 'grab' : 'public'), amount: c.mid });
    } else if (it.cost && it.cost.amt > 0) out.push({ it, cat: 'entry', amount: it.cost.amt * (it.cost.per === 'person' ? N : 1) });
  }
  return { out, unknown };
}
function budgetSum() {
  const A = autoLines();
  const lines = S.exp.concat(S.inclAuto ? A.out.filter(x => x.amount != null).map(x => ({ cat: x.cat, amount: x.amount, cur: 'MYR', paid: false })) : []);
  const s = L.summarize(lines, N, S.rate);
  return { ...s, unknown: S.inclAuto ? A.unknown : 0, auto: A };
}
function renderMoney() {
  const s = budgetSum(), A = s.auto, moves = settleTxt(s.bal);
  const budgetTotal = CATS.reduce((t, [k]) => t + (Number(S.budget[k]) || 0), 0);
  $('#p-money').innerHTML = `
    <div class="card hero"><div class="row sp"><div><div class="mut">รวม ${N} คน</div><div class="big">${rm(s.total)}</div><div class="mut">${thb(s.total)}</div></div><div style="text-align:right"><div class="mut">ต่อคน</div><div class="big">${rm(s.perPerson)}</div><div class="mut">${thb(s.perPerson)}</div></div></div>
      <div class="grid3"><div><b>จ่ายแล้ว</b>${rm(s.paid)}</div><div><b>ประมาณการ</b>${rm(s.est)}</div><div><b>งบที่ตั้ง</b>${budgetTotal ? rm(budgetTotal) : 'ยังไม่ตั้ง'}</div></div>
      <div class="mut">เรท ${S.rate} บาท/ริงกิต ${badge(S.rateMine ? 'me' : 'est')} ${act('go', 'set', 'แก้เรท', 'sm')}<br>ไม่รวมตั๋วเครื่องบิน โรงแรม ตั๋วคอนเสิร์ต (ยังไม่มีราคาจริงในแอป — ถ้าอยากรวม เพิ่มเป็นรายการจ่ายแล้วได้)</div>
      ${s.unknown ? `<div class="warn">มี ${s.unknown} ช่วงทางที่ยังไม่มีราคา (ส่วนใหญ่ Grab) ยอดรวมจึงต่ำกว่าจริง · ใส่ราคาในหน้าเดินทาง หรือเลือกวิธีที่มีราคา</div>` : ''}
      ${s.skipped ? '<div class="warn">มีรายการเป็นบาทที่แปลงไม่ได้ เพราะยังไม่มีเรท</div>' : ''}</div>
    <h2>เพิ่มค่าใช้จ่าย</h2>
    <div class="card"><label>รายละเอียด</label><input id="x-d" maxlength="80" placeholder="เช่น ข้าวมันไก่ Petaling">
      <div class="two"><div><label>จำนวน</label><input id="x-a" inputmode="decimal"></div><div><label>สกุลเงิน</label><select id="x-c"><option>MYR</option><option>THB</option></select></div></div>
      <div class="two"><div><label>หมวด</label><select id="x-k">${CATS.map(([k, l]) => `<option value="${k}" ${k === 'food' ? 'selected' : ''}>${l}</option>`).join('')}</select></div><div><label>สถานะ</label><select id="x-p"><option value="1">จ่ายแล้ว</option><option value="0">ประมาณการ</option></select></div></div>
      <div class="two"><div><label>ใครจ่าย</label><select id="x-w">${S.names.map((n, i) => `<option value="${i}">${esc(n)}</option>`).join('')}</select></div><div><label>หาร</label><select id="x-s"><option value="all">หารเท่ากัน ${N} คน</option><option value="payer">ของคนจ่ายคนเดียว</option></select></div></div>
      <div id="x-err" class="warn" style="display:none"></div>
      <div class="row" style="margin-top:10px">${act('addexp', '', '＋ บันทึก', 'pri')}</div></div>
    ${moves ? `<h2>ใครต้องโอนให้ใคร</h2><div class="card">${moves}<div class="mut">คิดจากรายการ "จ่ายแล้ว" ที่หารเท่ากันเท่านั้น</div></div>` : ''}
    <h2>รายการ (${S.exp.length})</h2>
    <div class="card">${S.exp.length ? S.exp.slice().reverse().map(x => `<div class="tx"><div style="min-width:0"><div>${esc(x.desc)}</div><div class="mut">${(CATS.find(c => c[0] === x.cat) || ['', ''])[1]} · ${esc(S.names[x.payer] || '')} · ${x.split === 'payer' ? 'ของคนจ่าย' : 'หาร ' + N}</div></div>
      <div style="text-align:right;white-space:nowrap"><b>${x.cur === 'THB' ? '฿' + x.amount.toLocaleString('en-US') : rm(x.amount)}</b><br><button class="bdg ${x.paid ? 'b-ok' : 'b-est'}" data-act="togglepaid" data-v="${x.id}">${x.paid ? 'จ่ายแล้ว' : 'ประมาณการ'}</button> <button class="bdg b-need" data-act="delexp" data-v="${x.id}">ลบ</button></div></div>`).join('') : '<p class="mut">ยังไม่มีรายการ</p>'}</div>
    <h2>งบตามหมวด</h2><div class="mut">งบตั้งต้นมาจากแผนที่เลือก (Grab ขาเข้า + KLIA Ekspres ขากลับ + LRT + สำรอง RM150 = RM533) · แก้ได้</div>
    <div class="card"><table><tr><th>หมวด</th><th>งบ (RM)</th><th>ใช้/ประมาณ</th></tr>${CATS.map(([k, l]) => { const c = s.cats[k] || { paid: 0, est: 0 }, b = Number(S.budget[k]) || 0, used = c.paid + c.est; return `<tr><td>${l}</td><td><input class="sm" inputmode="decimal" data-budget="${k}" value="${S.budget[k] ?? ''}" placeholder="—"></td><td>${rm(used)}${b ? `<div class="bar"><i style="width:${Math.min(100, used / b * 100)}%;background:${used > b ? 'var(--red)' : 'var(--grn)'}"></i></div>${used > b ? `<span class="ebad">เกินงบ ${rm(used - b)}</span>` : ''}` : ''}<div class="mut">จ่าย ${rm(c.paid)} · ประมาณ ${rm(c.est)}</div></td></tr>`; }).join('')}</table></div>
    <h2>ค่าเดินทางประมาณจากแพลน</h2>
    <div class="card"><label class="row" style="gap:8px;color:var(--tx)"><input type="checkbox" style="width:auto;min-height:0" data-act="inclauto" ${S.inclAuto ? 'checked' : ''}> รวมในยอดประมาณการ</label>
      ${A.out.map(x => `<div class="tx"><div style="min-width:0"><div>${x.it.icon || ''} ${esc(x.it.title)} <span class="mut">${DAYS.find(d => d.id === x.it.day).label}</span></div><div class="mut">${x.o ? `${x.o.icon} ${esc(x.o.label)} · ${range(x.c)}` : 'ค่าเข้าชม'}</div></div>
        <div style="text-align:right;white-space:nowrap">${x.amount != null ? `<b>${rm(x.amount)}</b><br><span class="mut">${rm(x.amount / N)}/คน</span>` : '<span class="bdg b-chk">ไม่มีราคา</span>'}<br><button class="bdg b-ok" data-act="paidfrom" data-v="${x.it.id}">จ่ายแล้ว</button></div></div>`).join('')}
      <div class="mut">กด "จ่ายแล้ว" เพื่อบันทึกยอดจริง รายการประมาณของช่วงนั้นจะหายไป ไม่นับซ้ำ</div></div>`;
}
function settleTxt(bal) { const t = L.settle(bal); return t.map(m => `<div class="tx"><span>${esc(S.names[m.from])} → ${esc(S.names[m.to])}</span><b>${money(m.amt)}</b></div>`).join(''); }
function addExp(pre) {
  const x = pre || { id: uid(), desc: $('#x-d').value.trim(), amount: Number($('#x-a').value.replace(/,/g, '')), cur: $('#x-c').value, cat: $('#x-k').value, paid: $('#x-p').value === '1', payer: Number($('#x-w').value), split: $('#x-s').value };
  const err = L.validExpense(x);
  if (err.length) { const b = $('#x-err'); if (b) { b.style.display = 'block'; b.textContent = err.join(' · '); } return; }
  S.exp.push(x); save(); renderMoney();
}
function paidFrom(itemId) {
  const x = budgetSum().auto.out.find(a => a.it.id === itemId); if (!x) return;
  $('#sheet .in').innerHTML = `<h2>บันทึกจ่ายจริง</h2><p>${esc(x.it.title)}${x.o ? ` · ${esc(x.o.label)}` : ''}</p>
    <label>ยอดที่จ่ายจริงรวมทั้งกลุ่ม (RM)</label><input id="y-a" inputmode="decimal" value="${x.amount != null ? r2(x.amount) : ''}">
    <label>ใครจ่าย</label><select id="y-w">${S.names.map((n, i) => `<option value="${i}">${esc(n)}</option>`).join('')}</select>
    <div id="x-err" class="warn" style="display:none"></div><div class="row" style="margin-top:10px">${act('savepaid', itemId, '💾 บันทึก', 'pri')}</div>`;
  $('#sheet').classList.add('on');
}

/* ---------- หน้า วันคอนเสิร์ต ---------- */
function renderConcert() {
  const C = calcTimes(), o = chosen('stadium'), ends = segEnds('stadium'), t = now();
  const isDay = myDate(t) === TRIP.concert.date;
  const d2 = DAYV.find(d => d.id === 'd2').eff.filter(i => !i.hid && i.s);
  const nxt = d2.map(i => ({ ...i, at: ts(TRIP.concert.date, i.s) })).find(i => i.at > t);
  const leaveTs = ts(TRIP.concert.date, C.cp.leave), mins = Math.round((leaveTs - t) / 6e4);
  const etaNow = hm(t + (L.optMinutes(o) + S.buffer) * 6e4);
  const ret = ranked('stadiumRet');
  $('#p-concert').innerHTML = `
    <div class="card hero"><div class="row sp"><div><div class="mut">เวลาที่ KL ตอนนี้</div><div class="clock">${hm(t)}</div></div><div style="text-align:right"><div class="mut">The Weeknd เริ่ม</div><div class="clock" style="color:var(--acc)">${TRIP.concert.start}</div></div></div>
      ${isDay ? '' : `<div class="mut">วันนี้ยังไม่ใช่วันคอนเสิร์ต (4 พ.ย.) — ด้านล่างคือแผน</div>`}</div>
    ${t > CONCERT_TS && t < CONCERT_TS + 8 * 3600e3 ? `<div class="card hl"><div class="mut">ตอนนี้: กลับโรงแรม</div><h3>แผน A · ${ret[0].o.icon} ${esc(ret[0].o.label)}</h3><ol>${ret[0].o.steps.map(s => `<li>${s}</li>`).join('')}</ol>
      ${S.meet ? `<div class="kv"><b>จุดนัดถ้าหลงกัน:</b> ${esc(S.meet)}</div>` : ''}<div class="row">${ext(mapsUrl(PL.stadium, PL.hotel, ret[0].o.mode), '🧭 เส้นทางกลับ', 'pri')}${ext(placeUrl(PL.endah), '🚗 จุดรับ Grab (Endah Parade)', 'sm')}</div>
      <div class="mut">แผน B/C อยู่ด้านล่าง</div></div>` : ''}
    <div class="card hl"><div class="mut">ควรออกจากโรงแรม</div><div class="big time" style="font-size:2.4rem">${C.cp.leave}</div>
      <div>ถึงสนามประมาณ <b>${C.cp.arrive}</b> · เผื่อคิว/ตรวจกระเป๋า ${S.early} นาทีก่อนเริ่ม</div>
      ${isDay && mins > 0 ? `<div class="big" style="margin-top:6px">${mins >= 60 ? Math.floor(mins / 60) + ' ชม. ' : ''}${mins % 60} นาที ก่อนต้องออก</div>` : ''}
      ${isDay && mins <= 0 && t < CONCERT_TS ? `<div class="warn">เลยเวลาที่ควรออกแล้ว ถ้าออกตอนนี้จะถึงประมาณ <b>${etaNow}</b>${L.hmToMin(etaNow) > L.hmToMin(TRIP.concert.start) ? ' — อาจไม่ทันเริ่ม พิจารณา Grab ถ้าถนนไม่ติด' : ''}</div>` : ''}
      <label>อยากถึงสนามก่อนเริ่มกี่นาที</label><div class="row">${[60, 90, 120, 150].map(m => `<button class="btn sm ${S.early === m ? 'on' : ''}" data-act="early" data-v="${m}">${m}</button>`).join('')}</div></div>
    ${nxt ? `<h2>ถัดไป</h2>${itemCard(nxt)}` : ''}
    <h2>ทางไปสนาม</h2>
    <div class="card rt"><h3>${o.icon} ${esc(o.label)}</h3><div class="mut">${L.optMinutes(o)} นาที · ${range(costOf('stadium', o))} (${N} คน)</div>
      <ol>${o.steps.map(s => `<li>${s}</li>`).join('')}</ol>
      <div class="kv"><b>สถานีที่ต้องลง:</b> Bukit Jalil (LRT สาย Sri Petaling) แล้วเดิน 5–8 นาที (คู่มือผู้จัด)</div>
      <div class="kv"><b>ตั๋ว:</b> ${TRIP.concert.ticket} · ประตูเปิด 16:45 · เปิดวง 18:10 / 19:30</div>
      <div class="row">${ext(mapsUrl(ends.from, ends.to, o.mode), '🧭 เปิดใน ' + MAPNAME[S.mapApp], 'pri')}${act('seg', 'stadium', '🔁 เปลี่ยนวิธี', 'sm')}</div>
      <p class="mut">${o.note}</p>${srcs(o.src)}</div>
    <h2>กลับโรงแรมหลังจบ</h2>
    <div class="warn">⚠️ <b>ไม่มีอะไรรับประกันว่ารถไฟยังวิ่งตอนคอนเสิร์ตจบ</b> — เวลาจบยังไม่ประกาศ และยังไม่มีประกาศ Rapid KL ขยายเวลาสำหรับคืนนี้ เช็กที่ MyRapid / ผู้จัดก่อนออกจากโรงแรม</div>
    ${ret.map((r, i) => `<div class="card ${i === 0 ? 'sel' : ''}"><div class="row sp"><h3>${i === 0 ? 'แผน A' : i === 1 ? 'แผน B' : 'แผน C'} · ${r.o.icon} ${esc(r.o.label)}</h3></div>
      <div class="mut">~${r.t} นาที (รวมรอคิว ${r.o.wait} นาที) · ${range(r.c)}</div><ol>${r.o.steps.map(s => `<li>${s}</li>`).join('')}</ol><p class="mut">${r.o.note}</p>
      ${ext(mapsUrl(PL.stadium, PL.hotel, r.o.mode), '🧭 เส้นทางกลับ', 'sm')}</div>`).join('')}
    <div class="card"><h3>ถ้าแผนทั้งหมดใช้ไม่ได้</h3><ul>
      <li>คิว LRT ยาวเกิน 45 นาที → เดินตามเจ้าหน้าที่ไปจุดรับ e-hailing <b>Endah Parade</b> (จุดของผู้จัด) แล้วเรียก Grab (ชั่วโมงแรกหลังจบราคาขึ้น 2–3 เท่า)</li>
      <li>รถไฟหยุดแล้ว → Grab / แท็กซี่เท่านั้น เตรียมเงินใน e-wallet ไว้</li>
      <li>เน็ตมือถือล่ม → แอปนี้เปิดได้แม้ไม่มีเน็ต แต่ Grab/แผนที่ต้องใช้เน็ต เดินออกห่างสนามก่อนแล้วลองใหม่</li></ul></div>
    <h2>ถ้าหลงกัน</h2>
    <div class="card"><label>จุดนัดเจอหลังจบ (ตกลงกันก่อนเข้าสนาม)</label><input id="meet" value="${esc(S.meet)}" placeholder="เช่น ทางออก LRT Bukit Jalil ฝั่งบันไดเลื่อน" maxlength="120">
      <div class="row" style="margin-top:8px">${act('savemeet', '', '💾 บันทึกจุดนัด', 'sm')}</div>
      <p class="mut">ถ้าติดต่อกันไม่ได้ภายใน 30 นาทีหลังจบ ให้ทุกคนกลับไปเจอกันที่ NU Hotel</p></div>
    ${offlineLine()}`;
}

/* ---------- หน้า ตั้งค่า ---------- */
function renderSet() {
  const V = verifyState();
  $('#p-set').innerHTML = `
    <h2>ก่อนออกเดินทาง (${V.filter(v => v.done).length}/${V.length})</h2>
    <div class="card">${V.map(v => `<div class="row" style="flex-wrap:nowrap;align-items:flex-start;margin:6px 0"><button class="chk ${v.done ? 'on' : ''}" ${v.auto ? 'disabled title="ติ๊กอัตโนมัติเมื่อกรอกข้อมูล"' : `data-act="verify" data-v="${v.id}"`} aria-label="เสร็จ">✓</button>
      <div style="min-width:0"><b>${esc(v.t)}</b><div class="mut">${esc(v.how)}${v.auto ? ' · ติ๊กเองอัตโนมัติ' : ''}</div>${v.link ? `<a href="${v.link.url}" target="_blank" rel="noopener">${esc(v.link.label)} ↗</a>` : ''}</div></div>`).join('')}</div>
    <h2>เที่ยวบิน</h2>
    <div class="card"><b>ขาไป 3 พ.ย.</b>
      <div class="two"><div><label>เลขไฟลต์</label><input id="o-no" value="${esc(S.out.no)}"></div><div><label>Terminal ที่ลง</label>${termSel('o-t', S.out.terminal)}</div></div>
      <div class="two"><div><label>ออก (เวลาไทย)</label><input id="o-d" type="time" value="${esc(S.out.dep)}"></div><div><label>ถึง (เวลามาเลเซีย)</label><input id="o-a" type="time" value="${esc(S.out.arr)}"></div></div>
      <b style="display:block;margin-top:12px">ขากลับ 5 พ.ย.</b>
      <div class="two"><div><label>เลขไฟลต์</label><input id="r-no" value="${esc(S.ret.no)}"></div><div><label>Terminal ที่ขึ้น</label>${termSel('r-t', S.ret.terminal)}</div></div>
      <div class="two"><div><label>ออก (เวลามาเลเซีย)</label><input id="r-d" type="time" value="${esc(S.ret.dep)}"></div><div><label>ถึง DMK (เวลาไทย)</label><input id="r-a" type="time" value="${esc(S.ret.arr || '')}"></div></div>
      <div class="mut">ไทย UTC+7 · มาเลเซีย UTC+8 (เร็วกว่าไทย 1 ชม.) · ไม่ใส่รหัสจองในแอปนี้ เพราะเว็บเปิดได้จากลิงก์</div>
      <div id="fl-err" class="warn" style="display:none"></div><div class="row" style="margin-top:10px">${act('saveflight', '', '💾 บันทึกเที่ยวบิน', 'pri')}</div></div>
    <h2>เวลาเผื่อ</h2>
    <div class="card"><div class="two"><div><label>ถึงสนามบินก่อนเครื่องออก (นาที)</label><input id="t-air" inputmode="numeric" value="${S.airportMin}"></div><div><label>เผื่อเดินทางเพิ่ม (นาที)</label><input id="t-buf" inputmode="numeric" value="${S.buffer}"></div></div>
      <label>ถึงสนามคอนเสิร์ตก่อนเริ่ม (นาที)</label><input id="t-early" inputmode="numeric" value="${S.early}">
      <div class="row" style="margin-top:10px">${act('savetimes', '', '💾 บันทึก', 'sm')}</div></div>
    <h2>เงิน</h2>
    <div class="card"><label>อัตราแลกเปลี่ยน (บาท ต่อ 1 ริงกิต)</label><input id="fx" inputmode="decimal" value="${S.rate}">
      <div class="mut">ค่าตั้งต้น 8.20 มาจากเรทล่าสุดที่หาได้ (28 ก.ค. 2026 = 8.2045) ${badge(S.rateMine ? 'me' : 'est')} — แผนที่เลือกใช้ 8.33 (ไม่มีแหล่ง) · กรอกเรทจริงจากแอปธนาคาร/ร้านแลกเงิน</div>${srcs(TRIP.rateSrc)}
      <label>ชื่อคนในทริป</label>${S.names.map((n, i) => `<input id="nm-${i}" value="${esc(n)}" maxlength="20" style="margin-bottom:6px">`).join('')}
      <div class="row" style="margin-top:6px">${act('savemoney', '', '💾 บันทึก', 'sm')}</div></div>
    <h2>แอปแผนที่ & ธีม</h2>
    <div class="card"><label>เปิดเส้นทางด้วย</label><div class="row">${Object.entries(MAPNAME).map(([k, l]) => `<button class="btn sm ${S.mapApp === k ? 'on' : ''}" data-act="mapapp" data-v="${k}">${l}</button>`).join('')}</div>
      <label>ธีม</label><div class="row">${[['auto', 'ตามเครื่อง'], ['dark', 'มืด'], ['light', 'สว่าง']].map(([k, l]) => `<button class="btn sm ${S.theme === k ? 'on' : ''}" data-act="theme" data-v="${k}">${l}</button>`).join('')}</div></div>
    <h2>สำรอง / ย้ายเครื่อง</h2>
    <div class="card"><p class="mut">ข้อมูลที่แก้เก็บในเครื่องนี้เท่านั้น ถ้าจะส่งให้เพื่อน ให้คัดลอกข้อความนี้ไปวางในเครื่องเพื่อนที่ช่อง "นำเข้า"</p>
      <div class="row">${act('export', '', '📤 คัดลอกข้อมูล', 'sm')}${act('import', '', '📥 นำเข้า', 'sm')}${act('reset', '', '♻️ ล้างทั้งหมด', 'sm')}</div>
      <textarea id="io" placeholder="วางข้อมูลที่คัดลอกมาที่นี่ แล้วกด นำเข้า"></textarea><div id="io-msg" class="mut"></div></div>
    <div class="mut" style="margin:14px 0">ฉบับ ${BUILD} · ตรวจข้อมูลล่าสุด ${CHECKED}${storeOk ? '' : ' · <b style="color:var(--red)">บันทึกในเครื่องไม่ได้ (โหมดส่วนตัว?)</b>'}</div>`;
}
const termSel = (id, v) => `<select id="${id}"><option value="">— เลือก —</option><option value="KLIA1" ${v === 'KLIA1' ? 'selected' : ''}>KLIA T1</option><option value="KLIA2" ${v === 'KLIA2' ? 'selected' : ''}>KLIA T2</option></select>`;
function offlineLine() { return `<div class="mut" style="margin:14px 0">${navigator.onLine ? '🟢 ออนไลน์' : '🔴 ออฟไลน์ — ใช้ข้อมูลที่เก็บในเครื่อง'} · เปิดแอปครั้งแรกตอนมีเน็ต แล้วจะใช้ได้แม้ไม่มีสัญญาณ</div>`; }

/* ---------- navigation / events ---------- */
const R = { now: renderNow, plan: renderPlan, go: renderGo, money: renderMoney, concert: renderConcert, set: renderSet };
let page = 'now';
function go(p, keepScroll) {
  if (!R[p]) p = 'now';
  page = p; document.querySelectorAll('.page').forEach(e => e.classList.toggle('on', e.id === 'p-' + p));
  document.querySelectorAll('nav button').forEach(b => b.classList.toggle('on', b.dataset.p === p));
  R[p](); if (!keepScroll) window.scrollTo(0, 0);
  try { history.replaceState(null, '', '#' + p + (SIM ? '' : '')); } catch (e) { }
}
const closeSheet = () => $('#sheet').classList.remove('on');
const num = v => { const n = Number(String(v).replace(/,/g, '').trim()); return isFinite(n) ? n : null; };
function applyTheme() { const t = S.theme; if (t === 'auto') document.documentElement.removeAttribute('data-theme'); else document.documentElement.setAttribute('data-theme', t); }

document.addEventListener('click', e => {
  const nb = e.target.closest('nav button'); if (nb) return go(nb.dataset.p);
  if (e.target.closest('#sheet .x') || e.target.id === 'sheet') return closeSheet();
  const b = e.target.closest('[data-act]'); if (!b || b.tagName === 'SELECT' || (b.tagName === 'INPUT' && b.type !== 'checkbox')) return;
  const a = b.dataset.act, v = b.dataset.v;
  const H = {
    go: () => go(v),
    day: () => { S.day = v; save(); renderPlan(); },
    editmode: () => { S.edit = !S.edit; save(); renderPlan(); },
    edit: () => editSheet(v),
    add: () => editSheet(null, v),
    saveitem: () => saveItem(v),
    hide: () => { S.ov[v] = { ...(S.ov[v] || {}), hid: true }; afterEdit(); },
    unhide: () => { if (S.ov[v]) { delete S.ov[v].hid; if (!Object.keys(S.ov[v]).length) delete S.ov[v]; } save(); rebuild(); renderPlan(); },
    resetitem: () => { delete S.ov[v]; afterEdit(); },
    delitem: () => { S.custom = S.custom.filter(x => x.id !== v); afterEdit(); },
    up: () => moveItem(v, -1), down: () => moveItem(v, 1),
    resetorder: () => { delete S.order[v]; save(); rebuild(); renderPlan(); },
    idea: () => { const [iid, dd] = v.split('|'); const i = IDEAS.find(x => x.id === iid); const id = uid(); S.custom.push({ id, idea: iid, day: dd || i.fit, title: i.title, s: '', e: '', place: i.place, note: i.why, cat: 'see', icon: i.icon, q: i.q, status: 'chk' }); S.day = dd || i.fit; save(); rebuild(); go('plan', true); editSheet(id); },
    seg: () => { S.seg = v; save(); go('go'); },
    prio: () => { S.prio = v; save(); rebuild(); renderGo(); },
    pick: () => { const [g, o] = v.split('|'); S.pick[g] = o; save(); rebuild(); renderGo(); },
    unpick: () => { delete S.pick[v]; save(); rebuild(); renderGo(); },
    quote: () => { const [g, o] = v.split('|'); const raw = $(`#q-${g}-${o}`).value.trim(); S.quote[g] = S.quote[g] || {}; if (raw === '') delete S.quote[g][o]; else { const n = num(raw); if (n == null || n < 0) return alert('ใส่ราคาเป็นตัวเลข'); S.quote[g][o] = n; } save(); rebuild(); renderGo(); },
    addexp: () => addExp(),
    togglepaid: () => { const x = S.exp.find(y => y.id === v); if (x) x.paid = !x.paid; save(); renderMoney(); },
    delexp: () => { if (!confirm('ลบรายการนี้?')) return; S.exp = S.exp.filter(y => y.id !== v); save(); renderMoney(); },
    inclauto: () => { S.inclAuto = b.checked; save(); renderMoney(); },
    paidfrom: () => paidFrom(v),
    savepaid: () => { const x = budgetSum().auto.out.find(a => a.it.id === v); const amt = num($('#y-a').value); const ex = { id: uid(), desc: x.it.title + (x.o ? ' · ' + x.o.label : ''), amount: amt, cur: 'MYR', cat: x.cat, paid: true, payer: Number($('#y-w').value), split: 'all', link: v }; const err = L.validExpense(ex); if (err.length) { const bx = $('#x-err'); bx.style.display = 'block'; bx.textContent = err.join(' · '); return; } S.exp.push(ex); save(); closeSheet(); renderMoney(); },
    early: () => { S.early = Number(v); save(); rebuild(); renderConcert(); },
    savemeet: () => { S.meet = $('#meet').value.trim(); save(); b.textContent = '✓ บันทึกแล้ว'; },
    verify: () => { S.verify[v] = !S.verify[v]; save(); renderSet(); },
    saveflight: () => {
      const out = { ...S.out, no: $('#o-no').value.trim().toUpperCase(), terminal: $('#o-t').value, dep: $('#o-d').value, arr: $('#o-a').value };
      const ret = { ...S.ret, no: $('#r-no').value.trim().toUpperCase(), terminal: $('#r-t').value, dep: $('#r-d').value, arr: $('#r-a').value };
      const err = L.validFlight(out).map(x => 'ขาไป: ' + x).concat(L.validFlight(ret).map(x => 'ขากลับ: ' + x));
      const bx = $('#fl-err'); if (err.length) { bx.style.display = 'block'; bx.textContent = err.join(' · '); return; }
      S.out = out; S.ret = ret; save(); rebuild(); renderSet(); $('#fl-err').style.display = 'block'; $('#fl-err').className = 'off'; $('#fl-err').textContent = '✓ บันทึกแล้ว — เวลาออกไปสนามบินคำนวณใหม่แล้ว';
    },
    savetimes: () => { const a = num($('#t-air').value), bf = num($('#t-buf').value), ea = num($('#t-early').value); if ([a, bf, ea].some(x => x == null || x < 0 || x > 600)) return alert('ใส่ตัวเลข 0–600 นาที'); S.airportMin = a; S.buffer = bf; S.early = ea; save(); rebuild(); renderSet(); },
    savemoney: () => { const r = num($('#fx').value); if (r == null || r <= 0 || r > 50) return alert('อัตราแลกเปลี่ยนไม่ถูกต้อง'); if (r !== S.rate) { S.rate = r; S.rateMine = true; } S.names = S.names.map((n, i) => $('#nm-' + i).value.trim() || n); save(); renderSet(); },
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
  if (t.dataset.act === 'segsel') { S.seg = t.value; save(); renderGo(); }
  if (t.dataset.budget) { const n = num(t.value); if (t.value.trim() === '') delete S.budget[t.dataset.budget]; else if (n != null && n >= 0) S.budget[t.dataset.budget] = n; save(); const y = scrollY; renderMoney(); scrollTo(0, y); }
});
window.addEventListener('hashchange', () => { const p = location.hash.slice(1); if (p !== page) go(p); });
window.addEventListener('online', () => R[page]()); window.addEventListener('offline', () => R[page]());
setInterval(() => { const f = document.activeElement; if ((page === 'now' || page === 'concert') && !(f && /INPUT|TEXTAREA|SELECT/.test(f.tagName)) && !$('#sheet').classList.contains('on')) R[page](); }, 30000);

applyTheme(); rebuild();
go((location.hash || '#now').slice(1));
if ('serviceWorker' in navigator && location.protocol !== 'file:') navigator.serviceWorker.register('sw.js').catch(() => { });
