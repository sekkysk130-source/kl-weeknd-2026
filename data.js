/* ข้อมูลทริป — แก้แพลน เส้นทาง ราคา ได้ที่ไฟล์นี้ไฟล์เดียว
   สถานะข้อมูล: ok = ยืนยันจากแหล่งทางการ/หลายแหล่งตรงกัน · est = ประมาณการ · chk = รอตรวจสอบ (แหล่งขัดกัน/ยังไม่ประกาศ)
               me = ข้อมูลที่เรากรอกเอง · need = ยังต้องกรอก */
const CHECKED = '30 ต.ค. 2026';
const BUILD = '31 ต.ค. 2026 (ฉบับ 4 · แชร์แพลน)';
const TZ = 'Asia/Kuala_Lumpur';

const SRC = {
  ln: { label: 'Live Nation Malaysia – The Weeknd KL 4–5 พ.ย. 2026', url: 'https://www.livenation.my/event/the-weeknd-after-hours-til-dawn-tour-kuala-lumpur-tickets-edp1672816' },
  lnGuide: { label: 'Live Nation – คู่มือวันงาน The Weeknd KL 2026 (ทางการ)', url: 'https://www.livenation.my/theweeknd2026-kl-eventguide' },
  tng: { label: 'TNG Digital – คู่มือไปคอนเสิร์ต The Weeknd KL 2026', url: 'https://www.tngdigital.com.my/blog/the-weeknd-kl-concert-malaysia-2026/' },
  erl: { label: 'Business Today – KLIA Ekspres ขึ้นเป็น RM65 ตั้งแต่ ม.ค. 2027 (ตอนนี้ RM55)', url: 'https://www.businesstoday.com.my/2026/09/30/klia-ekspres-fares-to-rise-to-rm65-from-jan-2027/' },
  erlOff: { label: 'KLIA Ekspres – เว็บทางการ', url: 'https://www.kliaekspres.com/' },
  erlTransit: { label: 'soyacincau – ตารางค่าโดยสาร KLIA Transit (KL Sentral–BTS RM6.50)', url: 'https://soyacincau.com/2026/10/01/klia-ekspres-and-transit-adult-fares-to-hit-rm65-starting-1st-january-2027/' },
  grabAir: { label: 'Wego – KLIA ไปเมือง: รถไฟ/แท็กซี่/Grab/บัส (2026)', url: 'https://blog.wego.com/klia-to-kuala-lumpur-city/' },
  bus: { label: 'klia2.info – รถบัสสนามบิน ↔ KL Sentral', url: 'https://www.klia2.info/?p=7' },
  rapid: { label: 'MyRapid (Rapid KL) – เส้นทางและประกาศ', url: 'https://myrapid.com.my/' },
  lrtExt: { label: 'paultan – LRT Bukit Jalil ขยายเวลาถึงตี 1 วันคอนเสิร์ต (ม.ค. 2026)', url: 'https://paultan.org/2026/01/08/konsert-legacy-30-siti-nurhaliza-lrt-bukit-jalil-connecting-stations-extended-to-1am-this-sat-jan-10/' },
  wikiBJ: { label: 'Wikipedia – สถานี LRT Bukit Jalil', url: 'https://en.wikipedia.org/wiki/Bukit_Jalil_LRT_station' },
  wikiBTS: { label: 'Wikipedia – สถานี Bandar Tasik Selatan', url: 'https://en.wikipedia.org/wiki/Bandar_Tasik_Selatan_station' },
  lrtPs: { label: 'train36 – LRT KL Sentral → Pasar Seni', url: 'https://train36.com/kl-sentral-to-pasar-seni.html' },
  lrtKlcc: { label: 'train36 – LRT KL Sentral → KLCC', url: 'https://www.train36.com/kl-sentral-to-klcc.html' },
  ktm: { label: 'KTMB – ตารางรถไฟทางการ', url: 'https://www.ktmb.com.my/' },
  ktmWorks: { label: 'Varnam – KTMB ปรับตาราง Komuter ตั้งแต่ 18 เม.ย. 2026 (ซ่อมราง)', url: 'https://varnam.my/117750/ktmb-restructures-klang-valley-komuter-schedule-effective-april-18-2026/' },
  ktmFare: { label: 'train36 – ค่าโดยสาร Komuter ไป Batu Caves', url: 'https://www.train36.com/batu-caves-komuter-train-fares.html' },
  mdac: { label: 'Immigration Malaysia – MDAC (กรอกออนไลน์)', url: 'https://imigresen-online.imi.gov.my/mdac/main' },
  mdacWiki: { label: 'Wikipedia – Malaysia Digital Arrival Card', url: 'https://en.wikipedia.org/wiki/Malaysia_Digital_Arrival_Card' },
  hotel: { label: 'Expedia – NU Hotel (เวลาเช็กอิน/เอาต์)', url: 'https://www.expedia.com.sg/h15160052.Hotel-Information' },
  batu: { label: 'Malaysia Uncovered – Batu Caves', url: 'https://malaysiauncovered.com/batu-caves/' },
  museum: { label: 'Time Out – Muzium Negara', url: 'https://www.timeout.com/kuala-lumpur/things-to-do/national-museum-muzium-negara' },
  fx: { label: 'ValutaFX – MYR/THB 28 ก.ค. 2026 = 8.2045', url: 'https://www.valutafx.com/history/myr-thb-2026-07-28' },
};

const enc = encodeURIComponent;
const PL = {
  hotel: 'NU Hotel, KL Sentral, Kuala Lumpur',
  KLIA1: 'KLIA Terminal 1, Sepang',
  KLIA2: 'klia2 Terminal 2, Sepang',
  stadium: 'Stadium Nasional Bukit Jalil, Kuala Lumpur',
  bjLrt: 'Bukit Jalil LRT Station',
  pavbj: 'Pavilion Bukit Jalil',
  endah: 'Endah Parade, Bandar Baru Sri Petaling, Kuala Lumpur',
  suria: 'Suria KLCC, Kuala Lumpur',
  batu: 'Batu Caves, Selangor',
  klcc: 'KLCC Park, Kuala Lumpur',
  cm: 'Central Market Kuala Lumpur',
  ps: 'Petaling Street, Kuala Lumpur',
  kch: 'Kwai Chai Hong, Kuala Lumpur',
  museum: 'Muzium Negara, Kuala Lumpur',
  nus: 'NU Sentral, Kuala Lumpur',
};

const TRIP = {
  destination: 'Kuala Lumpur, Malaysia',
  startDate: '2026-11-03', endDate: '2026-11-05', travelers: 3,
  hotel: { name: 'NU Hotel @ KL Sentral', area: 'Brickfields · ติดห้าง NU Sentral และสถานี KL Sentral', checkIn: '15:00', checkOut: '12:00', status: 'est', src: [SRC.hotel], note: 'เวลาจากเว็บจองโรงแรม ไม่ใช่เว็บโรงแรมเอง · เช็กอินก่อนเวลามีค่าใช้จ่ายและขึ้นกับห้องว่าง' },
  concert: { title: 'The Weeknd: After Hours Til Dawn Tour', date: '2026-11-04', start: '20:30', venue: 'TM Stadium Nasional (Bukit Jalil)', ticket: 'บัตรนั่ง (Seated)', status: 'ok', src: [SRC.lnGuide, SRC.ln], note: 'ประตูเปิด 16:45 · ศิลปินเปิด ¥ØU$UK€ ¥UK1MAT$U 18:10 · Creepy Nuts 19:30 · เวลาจบยังไม่ประกาศ' },
  // ค่าตั้งต้นที่แก้ได้ในหน้าตั้งค่า
  outbound: { from: 'DMK T1', no: 'AK891', date: '2026-11-03', dep: '08:35', arr: '11:50', terminal: 'KLIA2' },
  ret: { no: 'AK896', date: '2026-11-05', dep: '19:30', arr: '20:50', terminal: 'KLIA2' },
  rate: 8.2, rateStatus: 'est', rateSrc: [SRC.fx],
};

/* ---------- ช่วงทาง + ตัวเลือก ----------
   fare.per: 'person' = ราคาต่อคน · 'group' = ราคาต่อคัน (หาร 3)
   ride/walk/wait = นาที · luggage 1–3 (3 = ขนกระเป๋าสะดวก) · fatigue 0–5 · risk 0–5 (รถติด/ล่าช้า/คิว)
   pref = วิธีที่แผนที่เลือกใช้ (แอปยังจัดอันดับและบอกถ้าโหมดที่เลือกแนะนำตัวอื่น) */
const ERL_AIR = {
  id: 'erl', mode: 'train', icon: '🚄', label: 'KLIA Ekspres',
  fare: { per: 'person', min: 55, max: 55 }, fareSt: 'ok', ride: 33, walk: 10, wait: 10, transfers: 0, luggage: 3, fatigue: 1, risk: 1,
  timeSt: 'est', src: [SRC.erl, SRC.erlOff],
  note: 'RM55/คน (ผู้ใหญ่ เที่ยวเดียว) ใช้ถึง 31 ธ.ค. 2026 · ซื้อออนไลน์อาจลด 10% เหลือ RM49.50 (ยังไม่ยืนยันปีนี้) · เวลานั่ง ~28 นาทีจาก T1 / ~33 นาทีจาก T2 (ประมาณ)',
};
const GRAB_AIR = {
  id: 'grab', mode: 'grab', icon: '🚗', label: 'Grab',
  fare: { per: 'group', min: 65, max: 95 }, fareSt: 'est', ride: 55, walk: 5, wait: 10, transfers: 0, luggage: 3, fatigue: 0, risk: 3,
  timeSt: 'est', src: [SRC.grabAir],
  note: 'ราคาประมาณจากบล็อกท่องเที่ยว (RM65–95 ต่อคัน) · ฝนตก/ชั่วโมงเร่งด่วนอาจขึ้น 1.5–2 เท่า · 3 คน + กระเป๋าใหญ่ 3 ใบ ควรเลือกรถ 6 ที่นั่ง (แพงขึ้น — แผนที่เลือกตั้งงบ RM90–140) · เวลาเดินทางประเมินจากระยะ ~55 กม. ดูจริงใน Google Maps',
};
const BUS_AIR = {
  id: 'bus', mode: 'bus', icon: '🚌', label: 'รถบัสสนามบิน (Aerobus/Skybus)',
  fare: { per: 'person', min: 11, max: 15 }, fareSt: 'est', ride: 60, walk: 10, wait: 20, transfers: 0, luggage: 2, fatigue: 2, risk: 3,
  timeSt: 'est', src: [SRC.bus],
  note: 'ราคาและรอบรถจากเว็บรวมข้อมูล แต่ละแหล่งไม่ตรงกัน (RM11–15/คน, ~1 ชม.) · ต้องเช็กรอบรถที่เคาน์เตอร์',
};

const SEGS = {
  arr: {
    title: 'สนามบิน → โรงแรม', when: '3 พ.ย. บ่าย', from: 'AIRPORT', to: PL.hotel, bags: true,
    pref: 'grab', prefWhy: 'แผนที่เลือก: Grab ขาเข้า ไม่ต้องลากกระเป๋าขึ้นรถไฟ (ถ้ากระเป๋าใหญ่ 3 ใบ เลือกรถ 6 ที่นั่ง)',
    options: [
      { ...ERL_AIR, steps: ['ออกจากโถงผู้โดยสารขาเข้า เดินตามป้าย <b>KLIA Ekspres</b>', 'ซื้อตั๋วที่ตู้/เคาน์เตอร์ หรือแตะบัตรเครดิต (ถ้าระบบรองรับ — ยังไม่ยืนยัน)', 'ลงสถานีสุดท้าย <b>KL Sentral</b>', 'เดินผ่าน NU Sentral ไป NU Hotel (อาคารติดกัน)'] },
      { ...GRAB_AIR, steps: ['เปิดแอป Grab เลือกจุดรับรถที่สนามบิน (ป้าย e-hailing pick-up)', 'ปลายทาง NU Hotel KL Sentral', 'เทียบราคาในแอปกับ KLIA Ekspres RM165 (3 คน) ก่อนกดเรียก'] },
      { ...BUS_AIR, steps: ['เดินไปชั้นสถานีขนส่ง (Transportation Hub) ของสนามบิน', 'ซื้อตั๋วไป KL Sentral', 'ลงที่ KL Sentral แล้วเดินเข้า NU Hotel'] },
    ],
  },
  china: {
    title: 'โรงแรม ↔ ไชน่าทาวน์ (Pasar Seni)', when: '3 พ.ย.', from: PL.hotel, to: PL.cm, bags: false,
    options: [
      { id: 'lrt', mode: 'lrt', icon: '🚈', label: 'LRT Kelana Jaya 1 สถานี', fare: { per: 'person', min: 1.2, max: 2.3 }, fareSt: 'chk', ride: 3, walk: 10, wait: 5, transfers: 0, luggage: 2, fatigue: 1, risk: 1, timeSt: 'est', src: [SRC.lrtPs, SRC.rapid], note: 'KL Sentral → Pasar Seni 1 สถานี · ราคาแต่ละเว็บไม่ตรงกัน (RM1.20–2.30) ดูที่ตู้ขายตั๋ว', steps: ['ขึ้น LRT สาย Kelana Jaya ที่ KL Sentral ฝั่งไป Gombak', 'ลง <b>Pasar Seni</b> (1 สถานี)', 'เดินไป Central Market'] },
      { id: 'grab', mode: 'grab', icon: '🚗', label: 'Grab', fare: null, fareSt: 'chk', ride: 12, walk: 0, wait: 8, transfers: 0, luggage: 3, fatigue: 0, risk: 3, timeSt: 'est', src: [], note: 'ยังไม่มีราคาอ้างอิง ใส่ราคาที่เห็นในแอป', steps: ['เรียก Grab ไป Central Market Kuala Lumpur'] },
      { id: 'walk', mode: 'walk', icon: '🚶', label: 'เดิน', fare: { per: 'group', min: 0, max: 0 }, fareSt: 'ok', ride: 0, walk: 25, wait: 0, transfers: 0, luggage: 1, fatigue: 4, risk: 0, timeSt: 'est', src: [], note: 'เวลาเดินประเมินจากระยะบนแผนที่ ~2 กม. · บ่ายร้อน ไม่แนะนำขาไป', steps: ['เปิด Google Maps โหมดเดิน'] },
    ],
  },
  klcc: {
    title: 'โรงแรม ↔ KLCC', when: '5 พ.ย. เช้า', from: PL.hotel, to: PL.klcc, bags: false,
    options: [
      { id: 'lrt', mode: 'lrt', icon: '🚈', label: 'LRT Kelana Jaya (ตรง)', fare: { per: 'person', min: 2.1, max: 2.4 }, fareSt: 'est', ride: 15, walk: 10, wait: 5, transfers: 0, luggage: 2, fatigue: 1, risk: 1, timeSt: 'est', src: [SRC.lrtKlcc, SRC.rapid], note: 'RM2.40 เหรียญโทเคน / ~RM2.10–2.20 แตะบัตร (เว็บรวมข้อมูล) · นั่ง ~11–15 นาที', steps: ['LRT สาย Kelana Jaya จาก KL Sentral ฝั่งไป Gombak', 'ลง <b>KLCC</b>', 'เดินเข้า Suria KLCC → KLCC Park'] },
      { id: 'grab', mode: 'grab', icon: '🚗', label: 'Grab', fare: null, fareSt: 'chk', ride: 20, walk: 0, wait: 8, transfers: 0, luggage: 3, fatigue: 0, risk: 3, timeSt: 'est', src: [], note: 'ใส่ราคาที่เห็นในแอป · กลางเมืองช่วงบ่ายรถติด', steps: ['เรียก Grab ไป Suria KLCC'] },
    ],
  },
  stadium: {
    title: 'โรงแรม → สนาม Bukit Jalil', when: '4 พ.ย. เย็น', from: PL.hotel, to: PL.stadium, bags: false,
    pref: 'lrt', prefWhy: 'แผนที่เลือก: LRT เปลี่ยนที่ Masjid Jamek ใช้ Rapid KL ทั้งเส้น ขากลับใช้เส้นเดียวกัน',
    options: [
      { id: 'erlbts', mode: 'train', icon: '🚄', label: 'KLIA Transit → BTS + LRT 2 สถานี', fare: { per: 'person', min: 7.5, max: 9 }, fareSt: 'est', ride: 20, walk: 12, wait: 15, transfers: 1, luggage: 2, fatigue: 2, risk: 2, timeSt: 'est', src: [SRC.erlTransit, SRC.wikiBTS, SRC.wikiBJ], note: 'KLIA Transit KL Sentral → Bandar Tasik Selatan RM6.50 + LRT 2 สถานี (ราคา LRT ยังไม่ยืนยัน รวมเป็นช่วงประมาณ) · ต้องเดินสะพาน 95 ม. จากชานชาลา ERL ไปอีกฝั่ง', steps: ['ที่ KL Sentral ขึ้น <b>KLIA Transit</b> (ไม่ใช่ Ekspres — Ekspres ไม่จอด) ลง <b>Bandar Tasik Selatan</b> (1 สถานี)', 'เดินสะพานข้ามไปสถานี LRT', 'ขึ้น LRT สาย Sri Petaling ฝั่งไป Putra Heights ลง <b>Bukit Jalil</b> (2 สถานี ผ่าน Sungai Besi)', 'ออกจากสถานีเข้า KL Sports City เดินตามคนไปสนาม'] },
      { id: 'lrt', mode: 'lrt', icon: '🚈', label: 'LRT ต่อที่ Masjid Jamek', fare: { per: 'person', min: 3.2, max: 3.2 }, fareSt: 'est', ride: 40, walk: 12, wait: 10, transfers: 1, luggage: 2, fatigue: 2, risk: 2, timeSt: 'est', src: [SRC.tng, SRC.rapid, SRC.wikiBJ], note: 'ราคา ~RM3.20 จากคู่มือ TNG · ทางนี้ใช้ Rapid KL ทั้งเส้น (กลับดึกใช้ทางเดียวกันได้)', steps: ['LRT สาย Kelana Jaya จาก KL Sentral ลง <b>Masjid Jamek</b> (2 สถานี)', 'เปลี่ยนไปสาย <b>Sri Petaling</b> (ป้ายสีน้ำตาลแดง) ฝั่งไป Putra Heights', 'ลง <b>Bukit Jalil</b> (10 สถานี)', 'ออกจากสถานีเดินเข้าสนาม'] },
      { id: 'grab', mode: 'grab', icon: '🚗', label: 'Grab', fare: null, fareSt: 'chk', ride: 35, walk: 10, wait: 10, transfers: 0, luggage: 3, fatigue: 0, risk: 5, timeSt: 'est', src: [SRC.lnGuide, SRC.tng], note: 'ผู้จัดกำหนดจุดรับ-ส่ง e-hailing ที่ Endah Parade แล้วเดินตามเจ้าหน้าที่ · ก่อนงานรถติดหนัก · ใส่ราคาที่เห็นในแอปเพื่อเทียบ', steps: ['เรียก Grab ปลายทาง <b>Endah Parade</b> (จุดส่งของผู้จัด)', 'เดินตามเจ้าหน้าที่จราจรไปสนาม'] },
    ],
  },
  stadiumRet: {
    title: 'สนาม → โรงแรม (หลังจบ)', when: '4 พ.ย. ดึก', from: PL.stadium, to: PL.hotel, bags: false,
    options: [
      { id: 'lrt', mode: 'lrt', icon: '🚈', label: 'LRT Bukit Jalil → Masjid Jamek → KL Sentral', fare: { per: 'person', min: 3.2, max: 3.2 }, fareSt: 'est', ride: 40, walk: 12, wait: 40, transfers: 1, luggage: 2, fatigue: 3, risk: 4, timeSt: 'est', src: [SRC.tng, SRC.lrtExt, SRC.rapid], note: 'คู่มือ TNG: รถไฟถึงราวเที่ยงคืน และต้องรอขึ้น 20–30 นาที · งานใหญ่ครั้งก่อน Rapid KL เคยขยายเวลาถึงตี 1 <b>แต่ยังไม่มีประกาศสำหรับ 4 พ.ย.</b>', steps: ['เดินไปสถานี LRT Bukit Jalil เข้าคิวตามเจ้าหน้าที่', 'สาย Sri Petaling ฝั่งไป Sentul Timur ลง <b>Masjid Jamek</b>', 'เปลี่ยนสาย Kelana Jaya ฝั่งไป Putra Heights ลง <b>KL Sentral</b>'] },
      { id: 'erlbts', mode: 'train', icon: '🚄', label: 'LRT 2 สถานี → BTS + KLIA Transit', fare: { per: 'person', min: 7.5, max: 9 }, fareSt: 'est', ride: 20, walk: 12, wait: 40, transfers: 1, luggage: 2, fatigue: 3, risk: 5, penalty: 20 /* ไม่รู้เวลาเที่ยวสุดท้าย — กันไม่ให้ถูกแนะนำเป็นแผน A */, timeSt: 'est', src: [SRC.erlTransit, SRC.wikiBTS], note: '<b>ยังไม่รู้เวลา KLIA Transit เที่ยวสุดท้าย</b> ถ้าเลยเที่ยงคืนอาจไม่มีรถ ใช้ทาง Masjid Jamek ปลอดภัยกว่า', steps: ['LRT Bukit Jalil → Bandar Tasik Selatan (2 สถานี)', 'เดินสะพานไป KLIA Transit ฝั่งไป KL Sentral'] },
      { id: 'grab', mode: 'grab', icon: '🚗', label: 'Grab จากจุดรับ Endah Parade', fare: null, fareSt: 'chk', ride: 30, walk: 15, wait: 30, transfers: 0, luggage: 3, fatigue: 2, risk: 4, timeSt: 'est', src: [SRC.lnGuide, SRC.tng], note: 'ผู้จัดกำหนดจุดรับ e-hailing ที่ Endah Parade และเตือนว่าหลังงานรอนาน · คู่มือ TNG: ชั่วโมงแรกราคาขึ้น 2–3 เท่า', steps: ['ทางออกสนามเป็นทางเดียวและปล่อยออกเป็นช่วง ๆ ตามประกาศผู้จัด', 'เดินตามเจ้าหน้าที่ไป <b>Endah Parade</b>', 'เรียก Grab กลับ NU Hotel ที่จุดรับ'] },
    ],
  },
  dep: {
    title: 'โรงแรม → สนามบิน', when: '5 พ.ย.', from: PL.hotel, to: 'AIRPORT', bags: true,
    pref: 'erl', prefWhy: 'แผนที่เลือก: KLIA Ekspres ขากลับ คุมเวลาได้แน่นอน ไม่เสี่ยงรถติดช่วงเย็น',
    options: [
      { ...ERL_AIR, steps: ['เดินจาก NU Hotel ไป KL Sentral ชั้นที่มีป้าย KLIA Ekspres', 'ขึ้นรถ ลง Terminal ตามตั๋ว (T1 ก่อน แล้ว T2)'] },
      { ...GRAB_AIR, steps: ['เรียก Grab ปลายทาง Terminal ตามตั๋ว', 'ช่วงเย็นวันธรรมดารถติดออกเมือง เผื่อเพิ่ม'] },
      { ...BUS_AIR, steps: ['ขึ้นรถบัสที่ KL Sentral (จุดขึ้นรถบัสสนามบิน)', 'ลง Terminal ตามตั๋ว'] },
    ],
  },
};

/* ---------- แพลน 3 วัน ----------
   cat: flight / move / see / food / rest / concert · prio: must / nice (ตัดได้) · seg = ช่วงทางในหน้าเดินทาง
   cost = ค่าใช้จ่ายประมาณของกิจกรรม { amt, cur, per: 'person'|'group' } · calc = เวลาคำนวณให้อัตโนมัติ */
const DAYS = [
  {
    id: 'd1', date: '2026-11-03', label: 'อังคาร 3 พ.ย.', title: 'ถึง KL · ไชน่าทาวน์',
    items: [
      { id: 'd1-dmk', s: '', e: '', label: '05:30 ไทย', cat: 'flight', icon: '🛫', title: 'ถึงดอนเมือง T1', place: 'AK891 ออก 08:35 (เวลาไทย)', status: 'me', note: 'เป้าถึงสนามบิน 05:30–06:00 เวลาไทย' },
      { id: 'd1-land', calc: 'land', cat: 'flight', icon: '🛬', title: 'ลงเครื่องที่ KLIA', place: 'KLIA Terminal 2', status: 'me', note: 'AK891 ดอนเมือง T1 08:35 (เวลาไทย) → KLIA T2 11:50 (เวลามาเลเซีย) · บิน 2 ชม. 15 นาที' },
      { id: 'd1-imm', s: '11:50', e: '13:00', cat: 'flight', icon: '🛂', title: 'ผ่าน ตม. + รับกระเป๋า + ซื้อ Touch \'n Go', place: 'KLIA T2', status: 'est', note: 'ต้องกรอก MDAC ออนไลน์ไม่เกิน 3 วันก่อนถึง (31 ต.ค.–3 พ.ย.)', src: [SRC.mdac, SRC.mdacWiki] },
      { id: 'd1-arr', s: '13:00', e: '14:00', cat: 'move', seg: 'arr', icon: '🚗', title: 'ไปโรงแรม', place: 'NU Hotel' },
      { id: 'd1-bag', s: '14:00', e: '14:30', cat: 'rest', icon: '🧳', title: 'เช็กอิน / ฝากกระเป๋า', place: 'NU Hotel', q: PL.hotel, status: 'est', note: 'เช็กอินปกติ 15:00 · ถ้าห้องยังไม่พร้อมฝากกระเป๋าไว้ก่อน', src: [SRC.hotel] },
      { id: 'd1-lunch', s: '14:30', e: '15:30', cat: 'food', icon: '🍜', title: 'ข้าวเที่ยง (เลท) + พัก', place: 'NU Sentral ติดโรงแรม', q: PL.nus, status: 'est', note: 'แผนต้นฉบับไม่มีมื้อเที่ยง — ลงเครื่อง 11:50 กว่าจะได้กินข้าวเย็นคือ 18:30 เลยเพิ่มไว้' },
      { id: 'd1-go', s: '16:00', e: '16:30', cat: 'move', seg: 'china', icon: '🚈', title: 'ไปไชน่าทาวน์', place: 'LRT ทิศ Gombak ลง Pasar Seni' },
      { id: 'd1-cm', s: '16:30', e: '17:15', cat: 'see', icon: '🏛️', title: 'Central Market (Pasar Seni)', place: 'ตลาดงานฝีมือในอาคารเก่า', q: PL.cm, status: 'chk', note: 'เวลาเปิด-ปิดยังไม่ได้ตรวจ' },
      { id: 'd1-ps', s: '17:15', e: '18:00', cat: 'see', icon: '🏮', title: 'Petaling Street', place: 'ไชน่าทาวน์ (เดินต่อได้)', q: PL.ps, status: 'est' },
      { id: 'd1-kch', s: '18:00', e: '18:30', cat: 'see', icon: '📸', title: 'Kwai Chai Hong', place: 'ตรอกภาพวาดผนัง', q: PL.kch, status: 'chk', note: 'เวลาเปิดและค่าเข้ายังไม่ได้ตรวจ' },
      { id: 'd1-dinner', s: '18:30', e: '19:30', cat: 'food', icon: '🥢', title: 'ข้าวเย็นย่านไชน่าทาวน์', place: 'Chinatown', q: PL.ps, status: 'est', note: 'ถ้าเข้าเมืองช้า ลดเวลาเที่ยว ไม่ต้องเก็บทุกจุด' },
      { id: 'd1-back', s: '19:30', e: '20:00', cat: 'move', seg: 'china', icon: '🚈', title: 'กลับโรงแรม พัก', place: 'Pasar Seni → KL Sentral' },
    ],
  },
  {
    id: 'd2', date: '2026-11-04', label: 'พุธ 4 พ.ย.', title: 'พักเก็บแรง · คอนเสิร์ต The Weeknd', concert: true,
    items: [
      { id: 'd2-bf', s: '08:30', e: '10:00', cat: 'food', icon: '☕', title: 'ตื่น + อาหารเช้า', place: 'NU Sentral / Brickfields', q: PL.nus, status: 'me' },
      { id: 'd2-walk', s: '10:00', e: '12:00', cat: 'see', icon: '🛍️', title: 'เดินเล่นใกล้โรงแรม', place: 'NU Sentral / Little India (Brickfields)', q: 'Little India Brickfields', status: 'me', prio: 'nice', note: 'ตามความพร้อม · ถ้าอยากนอนต่อ ตัดได้' },
      { id: 'd2-lunch', s: '12:00', e: '13:00', cat: 'food', icon: '🍛', title: 'อาหารกลางวัน', place: 'Brickfields / NU Sentral', q: 'Brickfields, Kuala Lumpur', status: 'me' },
      { id: 'd2-rest', s: '13:00', e: '16:15', cat: 'rest', icon: '😴', title: 'พักในห้อง อาบน้ำ เตรียมตัว', place: 'NU Hotel', status: 'me', note: 'กระเป๋าไม่เกิน A4 · พาวเวอร์แบงก์ไม่เกิน 10,000 mAh · ห้ามร่ม (เสื้อกันฝนใส/แบบใช้แล้วทิ้งได้) · น้ำหอมไม่เกิน 30ml · ชาร์จมือถือเต็ม · เซฟ QR ตั๋วไว้ในเครื่อง', src: [SRC.lnGuide] },
      { id: 'd2-dinner', s: '16:15', e: '17:00', cat: 'food', icon: '🍱', title: 'ข้าวเย็นก่อนออก', place: 'NU Sentral', q: PL.nus, status: 'me', note: 'บัตรนั่ง ไม่ต้องรีบไปตอนประตูเปิด 16:45 — กินให้อิ่มก่อน ของกินในสนามคิวยาว' },
      { id: 'd2-leave', calc: 'concertLeave', cat: 'move', seg: 'stadium', icon: '🚈', title: 'ออกไปสนาม', place: 'LRT เปลี่ยนที่ Masjid Jamek → Bukit Jalil' },
      { id: 'd2-gate', calc: 'concertGate', cat: 'concert', icon: '🎟️', title: 'ถึงสนาม เข้าประตูตามตั๋ว', place: 'TM Stadium Nasional', q: PL.stadium, status: 'ok', note: 'ประตูเปิด 16:45 · ¥ØU$UK€ ¥UK1MAT$U 18:10 · Creepy Nuts 19:30 · ฝากของได้ RM15 (บัตรเครดิต/เดบิตเท่านั้น) · ของที่ถูกยึดที่จุดตรวจอาจถูกทิ้ง', src: [SRC.lnGuide] },
      { id: 'd2-show', calc: 'concertShow', cat: 'concert', icon: '🎤', title: 'The Weeknd', place: 'TM Stadium Nasional', q: PL.stadium, status: 'ok', note: 'เริ่ม 20:30 (ผู้จัดบอกว่าเวลาจริงขึ้นกับหน้างาน) · เวลาจบยังไม่ประกาศ', src: [SRC.lnGuide] },
      { id: 'd2-home', calc: 'afterShow', cat: 'move', seg: 'stadiumRet', icon: '🌙', title: 'กลับโรงแรม', place: 'ทางออกปล่อยเป็นช่วง ๆ · ดูแผน A/B/C ในหน้า "คอนเสิร์ต"' },
    ],
  },
  {
    id: 'd3', date: '2026-11-05', label: 'พฤหัส 5 พ.ย.', title: 'KLCC · บินกลับ',
    items: [
      { id: 'd3-bf', s: '09:00', e: '10:00', cat: 'food', icon: '☕', title: 'อาหารเช้า + เช็กเอาต์ ฝากกระเป๋า', place: 'NU Hotel', q: PL.hotel, status: 'est', note: 'เช็กเอาต์ 12:00 (เว็บจอง) · ถามตอนเช็กอินว่าฝากกระเป๋าหลังเช็กเอาต์ได้ไหม', src: [SRC.hotel] },
      { id: 'd3-go', s: '10:00', e: '10:30', cat: 'move', seg: 'klcc', icon: '🚈', title: 'ไป KLCC', place: 'LRT ทิศ Gombak ไม่ต้องเปลี่ยนสาย' },
      { id: 'd3-klcc', s: '10:30', e: '12:15', cat: 'see', icon: '🏙️', title: 'Petronas Twin Towers + KLCC Park', place: 'ถ่ายรูปด้านนอก เดินสวน', q: PL.klcc, status: 'est', cost: { amt: 0, cur: 'MYR', per: 'person' }, note: 'ไม่รวม Skybridge/Observation Deck · ถ้าตื่นสายหลังคอนเสิร์ต ลดเวลาตรงนี้ แต่เวลาออกไปสนามบินเท่าเดิม' },
      { id: 'd3-lunch', s: '12:15', e: '13:15', cat: 'food', icon: '🍜', title: 'อาหารกลางวัน', place: 'Suria KLCC', q: PL.suria, status: 'me' },
      { id: 'd3-back', s: '13:15', e: '13:45', cat: 'move', seg: 'klcc', icon: '🚈', title: 'กลับ KL Sentral', place: 'LRT ทิศ Putra Heights' },
      { id: 'd3-bag', s: '13:45', e: '14:30', cat: 'rest', icon: '🧳', title: 'รับกระเป๋า ตรวจเอกสาร', place: 'NU Hotel', q: PL.hotel, status: 'me', note: 'พาสปอร์ต · บอร์ดดิ้งพาส AK896 · ของเหลวในกระเป๋าถือ' },
      { id: 'd3-leave', calc: 'airLeave', cat: 'move', seg: 'dep', icon: '🚄', title: 'ออกไปสนามบิน', place: 'KLIA Ekspres → KLIA T2' },
      { id: 'd3-fly', calc: 'retDep', cat: 'flight', icon: '🛫', title: 'เครื่องออก', place: 'KLIA Terminal 2', status: 'me', note: 'AK896 KLIA T2 19:30 → ดอนเมือง T1 20:50 (เวลาไทย)' },
    ],
  },
];

/* รายการที่ต้องยืนยันก่อนออกเดินทาง (ติ๊กได้ในหน้าตั้งค่า) */
const VERIFY = [
  { id: 'ret', t: 'เวลาเครื่องออกขากลับ + เลขไฟลต์', how: 'AK896 19:30 จากแอปจองตั๋ว — ถ้าสายการบินเลื่อนเวลา แก้ในหน้าตั้งค่า', auto: 'ret' },
  { id: 'term', t: 'Terminal ขาไป/ขากลับ (KLIA T1 หรือ T2)', how: 'ตั๋วระบุ KLIA T2 ทั้งไปและกลับ', auto: 'term' },
  { id: 'webci', t: 'เช็กอินออนไลน์ AirAsia ทั้งขาไปและขากลับ', how: 'ในแอป AirAsia MOVE · เปิดเช็กอินก่อนบินตามกฎสายการบิน' },
  { id: 'mdac', t: 'กรอก MDAC ทั้ง 3 คน + พาสปอร์ต', how: 'ทำได้ภายใน 3 วันก่อนถึง = 31 ต.ค.–3 พ.ย. · ฟรี', link: SRC.mdac },
  { id: 'gate', t: 'ประตูเข้าตามตั๋ว (บัตรนั่ง)', how: 'ดูในตั๋ว — ประตู A/B/C/E/F ใช้จุดฝากของคนละที่', link: SRC.lnGuide },
  { id: 'pb', t: 'ของต้องห้ามเข้าสนาม', how: 'พาวเวอร์แบงก์ ≤10,000 mAh · กระเป๋า ≤A4 · ห้ามร่ม กล้อง ไม้เซลฟี่ ขวดแก้ว/โลหะ บุหรี่ไฟฟ้า', link: SRC.lnGuide },
  { id: 'lrt', t: 'รถไฟขากลับหลังคอนเสิร์ต (ทั้ง Sri Petaling และ Kelana Jaya)', how: 'ยังไม่มีประกาศขยายเวลาสำหรับ 4 พ.ย. — เช็ก MyRapid/แอป PULSE วันงาน · ห้ามสมมติว่ามีรถไฟ', link: SRC.rapid },
  { id: 'bags', t: 'จำนวน/ขนาดกระเป๋า เพื่อเลือกขนาด Grab', how: 'ถ้ากระเป๋าใหญ่ 3 ใบ เลือก GrabCar 6 ที่นั่ง (แพงขึ้น)' },
  { id: 'hotel', t: 'NU Hotel ฝากกระเป๋าหลังเช็กเอาต์ได้ไหม', how: 'ถามตอนเช็กอินวันที่ 3' },
  { id: 'tng', t: 'บัตร Touch \'n Go / e-wallet มีเงินพอ + บัตรเครดิตสำหรับที่ฝากของ/ของที่ระลึก', how: 'ที่ฝากของและร้านของที่ระลึกในสนามรับแต่ Visa/Mastercard' },
  { id: 'fx', t: 'อัตราแลกเปลี่ยนจริง', how: 'เปิดแอปธนาคาร/ร้านแลกเงิน แล้วกรอกในหน้าตั้งค่า (แผนนี้ใช้ 8.33 / แอปตั้งต้น 8.20)', auto: 'fx' },
];

const CATS = [
  ['air', '🚄 รถสนามบิน'], ['public', '🚈 รถไฟ/รถสาธารณะ'], ['grab', '🚗 Grab'], ['concert', '🎤 เดินทางไป-กลับคอนเสิร์ต'],
  ['food', '🍜 อาหาร'], ['entry', '🎟️ ค่าเข้าชม'], ['emerg', '🩹 ฉุกเฉิน'], ['other', '🧾 อื่น ๆ'],
];

/* ไอเดียที่เที่ยวเพิ่ม (ยังไม่อยู่ในแพลน) — กด "เพิ่มเข้าแพลน" ได้ในหน้าแพลน
   รายละเอียดเวลาเปิด-ปิด/ราคา ยังไม่ได้ตรวจ ทั้งหมดเป็นสถานะ "รอตรวจสอบ" */
const IDEAS = [
  { id: 'i-batu', icon: '🛕', title: 'Batu Caves', place: 'KTM Komuter จาก KL Sentral ตรงถึง (~30 นาที)', q: PL.batu, dur: 150, why: 'ตัดออกจากแผนเพื่อเก็บแรงก่อนคอนเสิร์ต · บันได 272 ขั้น เข้าฟรี · ปี 2026 KTM ซ่อมราง ตารางไม่แน่นอน ไปได้เช้าวันที่ 4 ถ้าทุกคนยังไหว', fit: 'd2' },
  { id: 'i-museum', icon: '🏺', title: 'Muzium Negara (พิพิธภัณฑ์แห่งชาติ)', place: 'ใกล้ KL Sentral', q: PL.museum, dur: 90, why: 'ใกล้โรงแรม ค่าเข้า RM5 หรือ RM15 (แหล่งไม่ตรงกัน) · ตัวเลือกแทน KLCC ถ้าวันที่ 5 อยากอยู่ใกล้กระเป๋า', fit: 'd3' },
  { id: 'i-alor', icon: '🍢', title: 'Jalan Alor (ถนนอาหารกลางคืน)', place: 'Bukit Bintang', q: 'Jalan Alor, Kuala Lumpur', dur: 90, why: 'ถนนสตรีทฟู้ดดังที่สุดของ KL เหมาะเย็นวันที่ 3 แทน Petaling Street ถ้าอยากได้บรรยากาศคึกคัก', fit: 'd1' },
  { id: 'i-merdeka', icon: '🏛️', title: 'Merdeka Square + อาคาร Sultan Abdul Samad', place: 'เดินจากไชน่าทาวน์ได้', q: 'Merdeka Square, Kuala Lumpur', dur: 45, why: 'ใกล้ Central Market อยู่เส้นเดียวกัน ไม่ย้อนทาง', fit: 'd1' },
  { id: 'i-masjid', icon: '🕌', title: 'Masjid Jamek', place: 'สถานี LRT Masjid Jamek', q: 'Masjid Jamek, Kuala Lumpur', dur: 30, why: 'มัสยิดเก่าริมจุดบรรจบแม่น้ำ อยู่ระหว่างไชน่าทาวน์กับ Merdeka', fit: 'd1' },
  { id: 'i-pavilion', icon: '🛍️', title: 'Pavilion KL / Bukit Bintang', place: 'ย่านช้อปปิ้ง', q: 'Pavilion Kuala Lumpur', dur: 90, why: 'ห้างใหญ่แอร์เย็น เหมาะเป็นแผนสำรองตอนฝนตก', fit: 'd3' },
  { id: 'i-thean', icon: '🏮', title: 'วัด Thean Hou', place: 'เนินเขาใกล้ Brickfields', q: 'Thean Hou Temple, Kuala Lumpur', dur: 60, why: 'วัดจีนสวย วิวเมือง ใกล้โรงแรม (นั่ง Grab สั้น ๆ) เหมาะเช้าวันที่ 5', fit: 'd3' },
  { id: 'i-brick', icon: '🌶️', title: 'Little India (Brickfields)', place: 'เดินจากโรงแรมได้', q: 'Little India Brickfields', dur: 60, why: 'อยู่หน้าโรงแรม กินข้าว/ซื้อขนมได้โดยไม่ต้องนั่งรถ', fit: 'd3' },
  { id: 'i-lake', icon: '🌳', title: 'Perdana Botanical Garden', place: 'ใกล้ Muzium Negara', q: 'Perdana Botanical Garden', dur: 60, why: 'สวนใหญ่ใกล้พิพิธภัณฑ์ เดินต่อกันได้ (ช่วงเช้าก่อนร้อน)', fit: 'd3' },
];
