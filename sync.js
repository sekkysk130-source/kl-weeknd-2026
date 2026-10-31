/* sync ข้อมูลกลางระหว่างเครื่อง — ธีม แอปแผนที่ และหน้าที่เปิดอยู่ไม่ sync
   base = สิ่งที่รู้ว่าตรงกับข้อมูลกลางล่าสุด เก็บในเครื่อง ไว้แยกว่าอะไรคือสิ่งที่เครื่องนี้แก้ตอนยังต่อไม่ได้ */
function makeSync(env) {
  const { L, DEF, store, getState, applyShared, onStatus, connect } = env;
  const CODE = 'klwk.sync.code', BASE = 'klwk.sync.base';
  const get = k => { try { return store.getItem(k); } catch (e) { return null; } };
  const put = (k, v) => { try { store.setItem(k, v); } catch (e) { } };
  const del = k => { try { store.removeItem(k); } catch (e) { } };
  const storedBase = () => { try { return JSON.parse(get(BASE) || 'null'); } catch (e) { return null; } };

  let adapter = null, base = null, live = false, state = 'off', pending = false, starting = false, queue = [];
  const setBase = f => { base = f; put(BASE, JSON.stringify(f)); };
  const setState = s => { state = s; onStatus(); };
  const write = d => {
    if (!Object.keys(d.set).length && !d.del.length) return;
    // snapshot แรกอาจมาก่อน connect จบ ให้รอส่งทีหลัง
    if (!adapter) { queue.push(d); return; }
    Promise.resolve(adapter.write(d)).catch(() => setState('error'));
  };

  function onSnap({ changes, fromCache, hasPending }) {
    pending = hasPending;
    if (!live) {
      // ยังไม่เคยเห็นข้อมูลจาก server และ cache ว่าง = ยังสรุปไม่ได้ว่าข้อมูลกลางว่างจริง
      if (fromCache && !changes.length) return;
      const remote = {};
      for (const c of changes) if (c.v != null) remote[c.key] = c.v;
      const local = L.flatten(getState(), DEF), known = storedBase();
      // เครื่องที่เพิ่งเข้าทริป: ข้อมูลกลางว่าง = ส่งของตัวเองขึ้น · มีแล้ว = ใช้ข้อมูลกลาง
      const from = known || (Object.keys(remote).length ? local : {});
      const edits = L.diffFlat(from, local);
      const merged = L.applyDiff(remote, edits);
      live = true; setBase(merged);
      if (Object.keys(L.diffFlat(local, merged).set).length || L.diffFlat(local, merged).del.length) applyShared(L.unflatten(merged, DEF));
      write(edits);
    } else {
      const d = { set: {}, del: [] };
      for (const c of changes) {
        if (c.pending) continue;
        if (c.v == null) { if (c.key in base) d.del.push(c.key); }
        else if (base[c.key] !== c.v) d.set[c.key] = c.v;
      }
      if (Object.keys(d.set).length || d.del.length) {
        // คงสิ่งที่เครื่องนี้แก้แต่ยังไม่ได้ส่งไว้ รอบ push ถัดไปจะส่งเอง
        const mine = L.diffFlat(base, L.flatten(getState(), DEF));
        setBase(L.applyDiff(base, d));
        applyShared(L.unflatten(L.applyDiff(base, mine), DEF));
      }
    }
    setState(fromCache ? 'offline' : 'on');
  }

  async function start() {
    const code = get(CODE);
    if (!code || adapter || starting) return;
    starting = true; setState('connecting');
    try { adapter = await connect(code, onSnap, () => setState('error')); queue.splice(0).forEach(write); }
    catch (e) { setState('wait'); }
    starting = false;
  }

  return {
    start,
    code: () => get(CODE),
    state: () => state,
    pending: () => pending,
    joined: () => !!get(CODE),
    // เรียกหลังบันทึกทุกครั้ง · ยังต่อไม่ได้ก็ไม่เป็นไร รอบหน้าที่ต่อได้จะเทียบกับ base แล้วส่งเอง
    push() {
      if (!live) return;
      const cur = L.flatten(getState(), DEF), d = L.diffFlat(base, cur);
      if (!Object.keys(d.set).length && !d.del.length) return;
      setBase(cur); write(d);
    },
    // ข้อมูลกลางล่าสุดที่เครื่องนี้รู้ ใช้ตอนล้างค่าเฉพาะเครื่อง
    shared: () => { const b = base || storedBase(); return b ? L.unflatten(b, DEF) : null; },
    setCode(code) { put(CODE, code); del(BASE); },
    leave() { del(CODE); del(BASE); },
  };
}
const validTripCode = c => /^[a-z0-9]{20,64}$/.test(c || '');
const newTripCode = () => Array.from(crypto.getRandomValues(new Uint8Array(24)), b => 'abcdefghijkmnpqrstuvwxyz23456789'[b % 32]).join('');

/* ---------- ต่อ Firebase · โหลด SDK เมื่อเข้าทริปแล้วเท่านั้น ---------- */
const FB_SDK = 'https://www.gstatic.com/firebasejs/11.10.0/';
async function connectFirebase(config, code, onSnap, onErr) {
  const [{ initializeApp }, { getAuth, signInAnonymously }, fs] = await Promise.all(['app', 'auth', 'firestore'].map(m => import(`${FB_SDK}firebase-${m}.js`)));
  const app = initializeApp(config), auth = getAuth(app);
  await auth.authStateReady();
  if (!auth.currentUser) await signInAnonymously(auth);
  const db = fs.initializeFirestore(app, { localCache: fs.persistentLocalCache({ tabManager: fs.persistentMultipleTabManager() }) });
  const items = fs.collection(db, 'trips', code, 'items');
  fs.onSnapshot(items, { includeMetadataChanges: true }, snap => onSnap({
    fromCache: snap.metadata.fromCache,
    hasPending: snap.metadata.hasPendingWrites,
    changes: snap.docChanges({ includeMetadataChanges: true }).map(c => ({
      key: decodeURIComponent(c.doc.id),
      v: c.type === 'removed' ? null : c.doc.data().v,
      pending: c.doc.metadata.hasPendingWrites,
    })),
  }), onErr);
  return {
    write(d) {
      const b = fs.writeBatch(db), ref = k => fs.doc(items, encodeURIComponent(k));
      for (const [k, v] of Object.entries(d.set)) b.set(ref(k), { v });
      for (const k of d.del) b.delete(ref(k));
      return b.commit();
    },
  };
}

if (typeof module !== 'undefined' && module.exports) module.exports = { makeSync };
