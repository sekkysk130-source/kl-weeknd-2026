/* สูตรคำนวณล้วน ๆ (ไม่แตะหน้าจอ) — ใช้ทั้งในเว็บและในเทส `node --test` */
(function (root) {
  const hmToMin = hm => { if (!/^\d{1,2}:\d{2}$/.test(hm || '')) return null; const [h, m] = hm.split(':').map(Number); return h > 23 || m > 59 ? null : h * 60 + m; };
  const minToHm = m => { const x = ((Math.round(m) % 1440) + 1440) % 1440; return String(Math.floor(x / 60)).padStart(2, '0') + ':' + String(x % 60).padStart(2, '0'); };
  const isHm = hm => hmToMin(hm) != null;

  /* ---------- ค่าเดินทาง ---------- */
  // fare: { per: 'person' | 'group', min, max }  (null = ยังไม่มีราคา)
  // quote: ราคาจริงที่ผู้ใช้เห็น (รวมทั้งกลุ่ม) — ถ้ามี ใช้แทนราคาประมาณ
  function optCost(opt, n, quote) {
    if (quote != null && isFinite(quote) && quote >= 0) return { min: quote, max: quote, mid: quote, per: quote / n, perMin: quote / n, perMax: quote / n, known: true, fromQuote: true };
    const f = opt.fare;
    if (!f || f.min == null) return { min: null, max: null, mid: null, per: null, perMin: null, perMax: null, known: false, fromQuote: false };
    const k = f.per === 'person' ? n : 1;
    const max = f.max == null ? f.min : f.max;
    const lo = f.min * k, hi = max * k;
    return { min: lo, max: hi, mid: (lo + hi) / 2, per: (lo + hi) / 2 / n, perMin: lo / n, perMax: hi / n, known: true, fromQuote: false };
  }
  const optMinutes = o => (o.ride || 0) + (o.walk || 0) + (o.wait || 0);
  // เวลาที่ใช้จัดอันดับ: บวกความเสี่ยงล่าช้า (risk 1 ขั้น ≈ 8 นาที)
  const riskMinutes = o => optMinutes(o) + (o.risk || 0) * 8 + (o.penalty || 0);

  // ความเหนื่อย: เดิน + เปลี่ยนรถ + ลากกระเป๋า (ถ้าช่วงนั้นมีกระเป๋า)
  const effort = (o, bags) => (o.fatigue || 0) + (o.transfers || 0) * 1.5 + (o.walk || 0) / 10 + (bags ? (3 - (o.luggage || 3)) * 1.5 : 0);

  const WEIGHTS = {
    cheap: { cost: 0.7, time: 0.15, effort: 0.15 },
    balanced: { cost: 0.4, time: 0.3, effort: 0.3 },
    fast: { cost: 0.1, time: 0.5, effort: 0.4 },
  };
  // span = ช่วงต่ำสุดที่ถือว่า "ต่างกันจริง" — ต่างกันไม่กี่ริงกิต/นาทีไม่ควรชี้ขาด
  const norm = (v, lo, hi, span) => { const d = Math.max(hi - lo, span || 0); return d === 0 ? 0 : (v - lo) / d; };
  const SPAN = { cost: 30, time: 15, effort: 3 };

  /* จัดอันดับตัวเลือกของ 1 ช่วงทาง
     ตัวที่ยังไม่มีราคา: ไม่ตัดทิ้ง แต่โดนคะแนนราคาแย่กว่าตัวแพงสุด (1.5) — จะไม่ถูกแนะนำเพราะ "ไม่รู้ราคา" ดูเหมือนถูก */
  function rank(seg, n, priority, quotes) {
    const w = WEIGHTS[priority] || WEIGHTS.balanced;
    const rows = seg.options.map(o => ({ o, c: optCost(o, n, quotes && quotes[o.id]), t: optMinutes(o), tr: riskMinutes(o), e: effort(o, seg.bags) }));
    const costs = rows.filter(r => r.c.known).map(r => r.c.mid);
    const cLo = Math.min(...costs), cHi = Math.max(...costs);
    const tLo = Math.min(...rows.map(r => r.tr)), tHi = Math.max(...rows.map(r => r.tr));
    const eLo = Math.min(...rows.map(r => r.e)), eHi = Math.max(...rows.map(r => r.e));
    for (const r of rows) {
      const cs = r.c.known ? norm(r.c.mid, cLo, cHi, SPAN.cost) : 1.5;
      r.score = w.cost * cs + w.time * norm(r.tr, tLo, tHi, SPAN.time) + w.effort * norm(r.e, eLo, eHi, SPAN.effort);
    }
    rows.sort((a, b) => a.score - b.score);
    return rows;
  }

  const rm = v => 'RM' + (Math.round(v * 100) / 100).toLocaleString('en-US', { maximumFractionDigits: 2 });
  /* เหตุผลประกอบคำแนะนำ: เทียบตัวที่แนะนำกับตัวถูกสุดและตัวเร็วสุด */
  function reason(rows, n) {
    const best = rows[0]; if (!best) return '';
    const known = rows.filter(r => r.c.known);
    const out = [];
    const cheapest = known.slice().sort((a, b) => a.c.mid - b.c.mid)[0];
    const fastest = rows.slice().sort((a, b) => a.t - b.t)[0];
    if (!best.c.known) out.push(`ยังไม่มีราคาของ ${best.o.label} — ใส่ราคาที่เห็นในแอปเพื่อเทียบให้แม่นขึ้น`);
    if (cheapest && cheapest !== best && best.c.known) {
      const d = best.c.per - cheapest.c.per;
      out.push(`แพงกว่า ${cheapest.o.label} ประมาณ ${rm(d)}/คน แต่${best.t < cheapest.t ? `เร็วกว่า ${cheapest.t - best.t} นาที` : 'สบายกว่า'}${best.o.transfers < cheapest.o.transfers ? ` และเปลี่ยนรถน้อยกว่า ${cheapest.o.transfers - best.o.transfers} ครั้ง` : ''}`);
    } else if (cheapest === best && rows.length > 1) {
      out.push(`ถูกที่สุดในตัวเลือกที่มีราคา (${rm(best.c.per)}/คน เมื่อไป ${n} คน)`);
    }
    if (fastest !== best) out.push(`${fastest.o.label} เร็วกว่า ${best.t - fastest.t} นาที${fastest.c.known && best.c.known ? ` แต่${fastest.c.per > best.c.per ? `แพงกว่า ${rm(fastest.c.per - best.c.per)}/คน` : 'ถูกพอ ๆ กัน'}` : ''}`);
    const unknown = rows.filter(r => !r.c.known && r !== best).map(r => r.o.label);
    if (unknown.length) out.push(`ยังไม่มีราคาของ ${unknown.join(', ')} จึงยังเทียบเรื่องเงินไม่ได้`);
    return out.join(' · ');
  }

  /* ---------- เวลาที่ต้องออก ---------- */
  // targetHm = เวลาที่ต้องถึงปลายทาง · travelMin = เวลาเดินทางทั้งหมด · bufferMin = เผื่อ
  function leaveAt(targetHm, travelMin, bufferMin) { const t = hmToMin(targetHm); return t == null ? null : minToHm(t - (travelMin || 0) - (bufferMin || 0)); }
  // คอนเสิร์ต: ถึงสนามก่อนเริ่ม earlyMin นาที
  function concertPlan(startHm, earlyMin, travelMin, bufferMin) {
    const s = hmToMin(startHm); if (s == null) return null;
    const arrive = minToHm(s - (earlyMin || 0));
    return { arrive, leave: leaveAt(arrive, travelMin, bufferMin) };
  }
  // สนามบิน: ถึงสนามบินก่อนเครื่องออก airportMin นาที
  function airportPlan(depHm, airportMin, travelMin, bufferMin) {
    const d = hmToMin(depHm); if (d == null) return null;
    const arrive = minToHm(d - (airportMin || 0));
    return { arrive, leave: leaveAt(arrive, travelMin, bufferMin) };
  }

  /* ---------- งบ / ค่าใช้จ่าย ---------- */
  // แปลงเป็น MYR (rate = บาทต่อ 1 ริงกิต)
  const toMyr = (amt, cur, rate) => (cur === 'THB' ? (rate > 0 ? amt / rate : null) : amt);
  const toThb = (myr, rate) => (rate > 0 ? myr * rate : null);

  function validExpense(x) {
    const err = [];
    if (!x || typeof x !== 'object') return ['ข้อมูลไม่ถูกต้อง'];
    if (!(typeof x.amount === 'number' && isFinite(x.amount) && x.amount > 0)) err.push('จำนวนเงินต้องมากกว่า 0');
    if (x.cur !== 'MYR' && x.cur !== 'THB') err.push('เลือกสกุลเงิน');
    if (!x.desc || !String(x.desc).trim()) err.push('ใส่รายละเอียด');
    return err;
  }

  /* สรุปค่าใช้จ่าย: รวม/คน, จ่ายแล้ว vs ประมาณ, แยกหมวด, ใครต้องโอนให้ใคร
     expenses: [{cat, amount, cur, paid, payer, split}]  split = 'all' (หารทุกคน) | 'payer' (ของคนจ่ายคนเดียว) */
  function summarize(expenses, n, rate) {
    const cats = {}; let paid = 0, est = 0, skipped = 0;
    const bal = Array.from({ length: n }, () => 0); // + = มีคนติดเงินเรา
    for (const x of expenses) {
      const v = toMyr(x.amount, x.cur, rate);
      if (v == null) { skipped++; continue; }
      cats[x.cat] = cats[x.cat] || { paid: 0, est: 0 };
      if (x.paid) {
        paid += v; cats[x.cat].paid += v;
        const p = Number.isInteger(x.payer) && x.payer >= 0 && x.payer < n ? x.payer : 0;
        if (x.split === 'payer') continue;
        bal[p] += v; for (let i = 0; i < n; i++) bal[i] -= v / n;
      } else { est += v; cats[x.cat].est += v; }
    }
    const total = paid + est;
    return { paid, est, total, perPerson: total / n, cats, bal: bal.map(b => Math.round(b * 100) / 100), skipped };
  }

  /* ใครโอนให้ใคร (ให้จำนวนครั้งโอนน้อยที่สุดแบบง่าย) */
  function settle(bal) {
    const debt = bal.map((v, i) => ({ i, v })).filter(x => x.v < -0.004).map(x => ({ ...x, v: -x.v }));
    const cred = bal.map((v, i) => ({ i, v })).filter(x => x.v > 0.004);
    const out = [];
    let a = 0, b = 0;
    while (a < debt.length && b < cred.length) {
      const amt = Math.min(debt[a].v, cred[b].v);
      out.push({ from: debt[a].i, to: cred[b].i, amt: Math.round(amt * 100) / 100 });
      debt[a].v -= amt; cred[b].v -= amt;
      if (debt[a].v < 0.005) a++;
      if (cred[b].v < 0.005) b++;
    }
    return out;
  }

  function validFlight(f) {
    const err = [];
    if (f.dep && !isHm(f.dep)) err.push('เวลาออกต้องเป็นรูปแบบ HH:MM');
    if (f.arr && !isHm(f.arr)) err.push('เวลาถึงต้องเป็นรูปแบบ HH:MM');
    if (f.terminal && !['KLIA1', 'KLIA2'].includes(f.terminal)) err.push('เลือก Terminal 1 หรือ 2');
    if (f.no && !/^[A-Z0-9]{2}\s?\d{1,4}[A-Z]?$/i.test(f.no.trim())) err.push('เลขเที่ยวบินควรเป็นแบบ FD 353');
    return err;
  }

  const L = { hmToMin, minToHm, isHm, optCost, optMinutes, riskMinutes, effort, rank, reason, leaveAt, concertPlan, airportPlan, toMyr, toThb, summarize, settle, validExpense, validFlight, WEIGHTS };
  if (typeof module !== 'undefined' && module.exports) module.exports = L; else root.L = L;
})(this);
