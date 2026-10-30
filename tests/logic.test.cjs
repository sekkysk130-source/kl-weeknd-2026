// รัน: node --test tests/
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');
const L = require('../logic.js');
// โหลด data.js (เป็นไฟล์เบราว์เซอร์ธรรมดา) มาใช้ในเทส
const D = new Function(fs.readFileSync(path.join(__dirname, '../data.js'), 'utf8') + ';return { SEGS, DAYS, TRIP, VERIFY, IDEAS };')();

test('ค่าเดินทางต่อคน vs ต่อคัน (3 คน)', () => {
  const erl = L.optCost({ fare: { per: 'person', min: 55, max: 55 } }, 3);
  assert.equal(erl.min, 165); assert.equal(erl.per, 55);
  const grab = L.optCost({ fare: { per: 'group', min: 65, max: 95 } }, 3);
  assert.equal(grab.min, 65); assert.equal(grab.max, 95); assert.equal(grab.mid, 80);
  assert.ok(Math.abs(grab.per - 80 / 3) < 1e-9);
  assert.ok(Math.abs(grab.perMin - 65 / 3) < 1e-9);
});

test('ราคาที่ผู้ใช้กรอก ใช้แทนราคาประมาณ และหาร 3', () => {
  const c = L.optCost({ fare: { per: 'group', min: 65, max: 95 } }, 3, 72);
  assert.equal(c.min, 72); assert.equal(c.per, 24); assert.equal(c.fromQuote, true);
});

test('ไม่มีราคา = known false ไม่ใช่ 0', () => {
  const c = L.optCost({ fare: null }, 3);
  assert.equal(c.known, false); assert.equal(c.min, null);
});

test('ตัวที่ไม่มีราคาไม่ถูกแนะนำในโหมดประหยัด', () => {
  for (const k of Object.keys(D.SEGS)) {
    const top = L.rank(D.SEGS[k], 3, 'cheap', {})[0];
    assert.ok(top.c.known, `${k}: ${top.o.id}`);
  }
});

test('สนามบิน→โรงแรม: ใส่ราคา Grab แพง ๆ แล้วคำแนะนำ "สมดุล" ต้องไม่ใช่ Grab', () => {
  const r = L.rank(D.SEGS.arr, 3, 'balanced', { grab: 200 });
  assert.notEqual(r[0].o.id, 'grab');
});

test('หลังคอนเสิร์ต: แผน A ไม่ใช่เส้นที่ไม่รู้เวลารถเที่ยวสุดท้าย', () => {
  for (const p of ['cheap', 'balanced', 'fast']) assert.notEqual(L.rank(D.SEGS.stadiumRet, 3, p, {})[0].o.id, 'erlbts');
});

test('เหตุผลประกอบคำแนะนำไม่ว่าง', () => {
  for (const k of Object.keys(D.SEGS)) assert.ok(L.reason(L.rank(D.SEGS[k], 3, 'balanced', {}), 3).length > 0, k);
});

test('เวลาออกไปคอนเสิร์ต', () => {
  // 20:30 − 120 = 18:30 ถึงสนาม − เดินทาง 62 − เผื่อ 15 = 17:13
  assert.deepEqual(L.concertPlan('20:30', 120, 62, 15), { arrive: '18:30', leave: '17:13' });
});

test('เวลาออกไปสนามบิน (AK896 19:30)', () => {
  // 19:30 − 180 = 16:30 − 53 − 15 = 15:22
  assert.deepEqual(L.airportPlan('19:30', 180, 53, 15), { arrive: '16:30', leave: '15:22' });
  assert.equal(L.airportPlan('', 180, 53, 15), null);
});

test('เวลาข้ามเที่ยงคืน', () => { assert.equal(L.leaveAt('00:30', 45, 0), '23:45'); });

test('สรุปค่าใช้จ่าย: จ่ายแล้ว/ประมาณ/ต่อคน/แปลงบาท', () => {
  const s = L.summarize([
    { cat: 'food', amount: 90, cur: 'MYR', paid: true, payer: 0, split: 'all' },
    { cat: 'food', amount: 820, cur: 'THB', paid: true, payer: 1, split: 'all' }, // = 100 MYR ที่เรท 8.2
    { cat: 'air', amount: 165, cur: 'MYR', paid: false },
  ], 3, 8.2);
  assert.equal(s.paid, 190); assert.equal(s.est, 165); assert.equal(s.total, 355);
  assert.ok(Math.abs(s.perPerson - 355 / 3) < 1e-9);
  assert.equal(s.cats.food.paid, 190); assert.equal(s.cats.air.est, 165);
  // คนละ 63.33 · คน 0 จ่าย 90 → +26.67 · คน 1 จ่าย 100 → +36.67 · คน 2 → −63.33
  assert.deepEqual(s.bal, [26.67, 36.67, -63.33]);
});

test('ของคนจ่ายคนเดียวไม่เข้าการหาร', () => {
  const s = L.summarize([{ cat: 'other', amount: 50, cur: 'MYR', paid: true, payer: 2, split: 'payer' }], 3, 8.2);
  assert.deepEqual(s.bal, [0, 0, 0]); assert.equal(s.paid, 50);
});

test('ไม่มีเรท → รายการบาทถูกข้ามและนับไว้', () => {
  const s = L.summarize([{ cat: 'food', amount: 100, cur: 'THB', paid: true, payer: 0 }], 3, 0);
  assert.equal(s.skipped, 1); assert.equal(s.total, 0);
});

test('ใครโอนให้ใคร', () => {
  const t = L.settle([26.67, 36.67, -63.33]);
  assert.equal(t.length, 2);
  assert.ok(t.every(x => x.from === 2));
  assert.equal(r(t.reduce((a, x) => a + x.amt, 0)), 63.33);
});
const r = v => Math.round(v * 100) / 100;

test('validation ค่าใช้จ่าย', () => {
  assert.deepEqual(L.validExpense({ desc: 'ข้าว', amount: 10, cur: 'MYR' }), []);
  assert.ok(L.validExpense({ desc: '', amount: 10, cur: 'MYR' }).length);
  assert.ok(L.validExpense({ desc: 'x', amount: -1, cur: 'MYR' }).length);
  assert.ok(L.validExpense({ desc: 'x', amount: NaN, cur: 'MYR' }).length);
  assert.ok(L.validExpense({ desc: 'x', amount: 1, cur: 'USD' }).length);
});

test('validation เที่ยวบิน', () => {
  assert.deepEqual(L.validFlight({ no: 'AK891', dep: '08:35', arr: '11:50', terminal: 'KLIA2' }), []);
  assert.ok(L.validFlight({ dep: '25:00' }).length);
  assert.ok(L.validFlight({ terminal: 'T3' }).length);
  assert.ok(L.validFlight({ no: 'hello world' }).length);
});

test('ข้อมูลทริป: ทุกกิจกรรมมี id ไม่ซ้ำ และช่วงทางที่อ้างถึงมีอยู่จริง', () => {
  const ids = D.DAYS.flatMap(d => d.items.map(i => i.id));
  assert.equal(new Set(ids).size, ids.length);
  for (const d of D.DAYS) for (const i of d.items) if (i.seg) assert.ok(D.SEGS[i.seg], i.id);
  assert.equal(D.TRIP.travelers, 3);
});
