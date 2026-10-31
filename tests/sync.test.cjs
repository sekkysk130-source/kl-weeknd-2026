// จำลองหลายเครื่องต่อข้อมูลกลางชุดเดียว · รัน: node --test tests/
const test = require('node:test');
const assert = require('node:assert/strict');
const L = require('../logic.js');
const { makeSync } = require('../sync.js');

const DEF = { ov: {}, custom: [], order: {}, pick: {}, quote: {}, prio: 'balanced', exp: [], budget: { air: 305 }, names: ['ก', 'ข', 'ค'], out: { no: 'AK891' }, ret: { no: 'AK896' }, rate: 8.2, rateMine: false, early: 120, buffer: 15, airportMin: 210, meet: '', verify: {}, inclAuto: true, theme: 'auto', mapApp: 'google', day: null, seg: 'arr', edit: false };
const fresh = () => JSON.parse(JSON.stringify(DEF));
const memStore = () => { const m = new Map(); return { getItem: k => m.has(k) ? m.get(k) : null, setItem: (k, v) => m.set(k, v), removeItem: k => m.delete(k) }; };

function cloud() {
  const docs = new Map(), subs = new Set();
  return {
    docs,
    closeAll() { subs.clear(); },
    subscribe(fn) {
      subs.add(fn);
      fn({ fromCache: false, hasPending: false, changes: [...docs].map(([key, v]) => ({ key, v, pending: false })) });
    },
    commit(d) {
      const changes = [];
      for (const [key, v] of Object.entries(d.set)) { docs.set(key, v); changes.push({ key, v, pending: false }); }
      for (const key of d.del) { docs.delete(key); changes.push({ key, v: null, pending: false }); }
      for (const fn of subs) fn({ fromCache: false, hasPending: false, changes });
    },
  };
}
function device(c, init) {
  const box = { S: init || fresh(), store: memStore(), remote: 0 };
  box.sync = makeSync({
    L, DEF, store: box.store, getState: () => box.S,
    applyShared: s => { Object.assign(box.S, s); box.remote++; }, onStatus: () => { },
    connect: async (code, onSnap) => { c.subscribe(onSnap); return { write: d => c.commit(d) }; },
  });
  box.join = async () => { box.sync.setCode('abcdefghijklmnopqrstuvwx'); await box.sync.start(); };
  box.resub = async () => {
    box.sync = makeSync({
      L, DEF, store: box.store, getState: () => box.S,
      applyShared: s => { Object.assign(box.S, s); box.remote++; }, onStatus: () => { },
      connect: async (code, onSnap) => { c.subscribe(onSnap); return { write: d => c.commit(d) }; },
    });
    await box.sync.start();
  };
  return box;
}

test('flatten → unflatten คืนค่าเดิม และค่าตั้งต้นไม่ถูกเก็บ', () => {
  const s = { ...fresh(), ov: { a: { s: '10:00' } }, custom: [{ id: 'c1', title: 'x' }], exp: [{ id: 'c1', amount: 5 }, { id: 'c2', amount: 6 }], quote: { arr: { grab: 78 } }, rate: 8.33, verify: { mdac: true } };
  const f = L.flatten(s, DEF);
  assert.equal(f['cfg.rate'], '8.33');
  assert.ok(!('cfg.early' in f));
  const back = L.unflatten(f, DEF);
  for (const k of ['ov', 'custom', 'exp', 'quote', 'rate', 'verify', 'early', 'names']) assert.deepEqual(back[k], s[k]);
});

test('แก้จากเครื่องหนึ่ง อีกเครื่องเห็น', async () => {
  const c = cloud(), a = device(c), b = device(c);
  await a.join(); await b.join();
  a.S.ov.lunch = { s: '12:30' }; a.sync.push();
  assert.deepEqual(b.S.ov.lunch, { s: '12:30' });
  b.S.exp.push({ id: 'c1', amount: 50 }); b.sync.push();
  assert.equal(a.S.exp[0].amount, 50);
});

test('สองคนแก้คนละรายการ ไม่ทับกัน', async () => {
  const c = cloud(), a = device(c), b = device(c);
  await a.join(); await b.join();
  a.S.ov.x = { s: '09:00' }; b.S.exp.push({ id: 'c9', amount: 9 });
  a.sync.push(); b.sync.push();
  for (const d of [a, b]) { assert.deepEqual(d.S.ov.x, { s: '09:00' }); assert.equal(d.S.exp.length, 1); }
});

test('ลบแล้วหายจากทุกเครื่อง', async () => {
  const c = cloud(), a = device(c), b = device(c);
  await a.join(); await b.join();
  a.S.exp.push({ id: 'c1', amount: 1 }); a.sync.push();
  b.S.exp = []; b.sync.push();
  assert.equal(a.S.exp.length, 0);
  assert.equal(c.docs.size, 0);
});

test('คนแรกส่งของเดิมขึ้น คนหลังไม่ทับและรับข้อมูลกลาง', async () => {
  const c = cloud();
  const a = device(c, { ...fresh(), ov: { keep: { s: '08:00' } } });
  const b = device(c, { ...fresh(), ov: { friend: { s: '07:00' } } });
  await a.join();
  assert.ok(c.docs.has('ov.keep'));
  await b.join();
  assert.deepEqual(b.S.ov, { keep: { s: '08:00' } });
  assert.ok(!c.docs.has('ov.friend'));
});

test('แก้ตอนต่อไม่ได้ เชื่อมรอบหน้าส่งเอง และไม่ลบของเพื่อน', async () => {
  const c = cloud(), a = device(c), b = device(c);
  await a.join(); await b.join();
  // a ปิดแอป แล้วเปิดใหม่แบบต่อไม่ได้และแก้ · ระหว่างนั้น b แก้อย่างอื่น
  c.closeAll();
  await b.resub();
  const S = JSON.parse(JSON.stringify(a.S));
  const reopened = makeSync({ L, DEF, store: a.store, getState: () => S, applyShared: s => Object.assign(S, s), onStatus: () => { }, connect: async (code, onSnap) => { c.subscribe(onSnap); return { write: d => c.commit(d) }; } });
  S.ov.mine = { s: '11:00' }; reopened.push();
  b.S.ov.theirs = { s: '15:00' }; b.sync.push();
  await reopened.start();
  assert.deepEqual(S.ov, { theirs: { s: '15:00' }, mine: { s: '11:00' } });
  assert.deepEqual(b.S.ov, { theirs: { s: '15:00' }, mine: { s: '11:00' } });
});

test('cache ว่างตอนยังไม่ถึง server ต้องไม่ถือว่าข้อมูลกลางว่าง', async () => {
  const store = memStore(), S = { ...fresh(), ov: { a: { s: '10:00' } } };
  let snap, writes = 0;
  const sync = makeSync({ L, DEF, store, getState: () => S, applyShared: () => { }, onStatus: () => { }, connect: async (code, fn) => { snap = fn; return { write: () => { writes++; } }; } });
  sync.setCode('abcdefghijklmnopqrstuvwx'); await sync.start();
  snap({ fromCache: true, hasPending: false, changes: [] });
  assert.equal(writes, 0);
  snap({ fromCache: false, hasPending: false, changes: [{ key: 'ov.b', v: '{"s":"11:00"}' }] });
  assert.equal(writes, 0);
});

test('ค่าที่ยังส่งไม่ถึง server ไม่ถูกค่าเก่าจาก snapshot ทับ', async () => {
  const store = memStore(), S = fresh();
  let snap, applied = 0;
  const sync = makeSync({ L, DEF, store, getState: () => S, applyShared: () => { applied++; }, onStatus: () => { }, connect: async (code, fn) => { snap = fn; return { write: () => { } }; } });
  sync.setCode('abcdefghijklmnopqrstuvwx'); await sync.start();
  snap({ fromCache: false, hasPending: false, changes: [] });
  S.ov.x = { s: '10:00' }; sync.push();
  snap({ fromCache: true, hasPending: true, changes: [{ key: 'ov.x', v: '{"s":"09:00"}', pending: true }] });
  assert.equal(applied, 0);
});

test('shared() คืนข้อมูลกลางตอนล้างค่าในเครื่อง', async () => {
  const c = cloud(), a = device(c);
  await a.join();
  a.S.meet = 'LRT'; a.sync.push();
  assert.equal(a.sync.shared().meet, 'LRT');
  a.S = { ...fresh(), ...a.sync.shared() }; a.sync.push();
  assert.equal(c.docs.get('cfg.meet'), '"LRT"');
});
