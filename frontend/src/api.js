import { getDB } from './db.js';
import { buildKeysetQuery, nextCursorFrom, PAGE_SIZE } from './pagination';
import { Capacitor, registerPlugin } from '@capacitor/core';
import { Filesystem, Directory } from '@capacitor/filesystem';

const FilePlugin = registerPlugin('FilePlugin');

// ── 차량 이미지 인메모리 캐시 ─────────────────────────────────────────
let _imgUrl = null;
let _imgOrigUrl = null;

async function fileToBase64(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result.split(',')[1]);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

async function readImageBlob(path) {
  const res = await Filesystem.readFile({ path, directory: Directory.Data });
  const dataStr = typeof res.data === 'string' ? res.data : await res.data.text();
  const binary = atob(dataStr);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
  return new Blob([bytes], { type: 'image/jpeg' });
}

export async function initImages() {
  for (const [path, set] of [
    ['car_image.jpg',      (v) => { _imgUrl = v; }],
    ['car_image_orig.jpg', (v) => { _imgOrigUrl = v; }],
  ]) {
    try {
      const blob = await readImageBlob(path);
      set(URL.createObjectURL(blob));
    } catch {
      set(null);
    }
  }
}

// ── 상수 (FastAPI main.py에서 이식) ──────────────────────────────────

export const MAINTENANCE_ITEMS = [
  "엔진오일 및 오일필터",
  "에어클리너 필터",
  "에어컨필터(항균필터)",
  "점화플러그",
  "브레이크 패드 (앞)",
  "브레이크 패드 (뒤)",
  "브레이크 오일",
  "타이어",
  "타이어 위치",
  "와이퍼 블레이드",
  "엔진부동액(냉각수)",
  "에어컨(냉매, 콤프레서, 콘덴서 등)",
  "배터리",
  "점검",
  "일반수리",
  "기타",
];

export const OTHER_ITEMS = [
  "자동차 보험",
  "자동차검사",
  "세차",
  "주차비",
  "통행료",
  "실외용품",
  "실내용품",
  "교통범칙금",
  "기타",
];

export const CAR_TYPE_OPTIONS = [
  { code: "microcar",  label: "경차" },
  { code: "small",     label: "소형차" },
  { code: "compact",   label: "준중형차" },
  { code: "midsize",   label: "중형차" },
  { code: "large",     label: "준대형차" },
  { code: "fullsize",  label: "대형차" },
  { code: "suv",       label: "SUV" },
  { code: "rv",        label: "RV" },
  { code: "van",       label: "밴" },
  { code: "truck",     label: "트럭" },
  { code: "other",     label: "기타" },
];

export const CAR_FUEL_OPTIONS = [
  { code: "gasoline", label: "휘발유",             ui_term: "주유", qty_unit: "L",   price_unit: "원/L",   economy_unit: "km/L",   economy_label: "연비" },
  { code: "diesel",   label: "경유",               ui_term: "주유", qty_unit: "L",   price_unit: "원/L",   economy_unit: "km/L",   economy_label: "연비" },
  { code: "hev",      label: "하이브리드",          ui_term: "주유", qty_unit: "L",   price_unit: "원/L",   economy_unit: "km/L",   economy_label: "연비" },
  { code: "lpg",      label: "LPG",                ui_term: "충전", qty_unit: "L",   price_unit: "원/L",   economy_unit: "km/L",   economy_label: "연비" },
  { code: "ev",       label: "전기",               ui_term: "충전", qty_unit: "kWh", price_unit: "원/kWh", economy_unit: "km/kWh", economy_label: "전비" },
  { code: "fcev",     label: "수소전지",            ui_term: "충전", qty_unit: "kg",  price_unit: "원/kg",  economy_unit: "km/kg",  economy_label: "연비" },
  { code: "bifuel",   label: "바이퓨얼 (휘발유+LPG)", ui_term: "주유", qty_unit: "L", price_unit: "원/L", economy_unit: "km/L",   economy_label: "연비" },
  { code: "phev",     label: "플러그인 하이브리드", ui_term: "주유", qty_unit: "L",  price_unit: "원/L",   economy_unit: "km/L",   economy_label: "연비" },
];

// ── 헬퍼 ─────────────────────────────────────────────────────────────

function rows(result) {
  return result.values ?? [];
}

function firstRow(result) {
  return (result.values ?? [])[0] ?? null;
}

function calcFuelEconomy(intervalKm, liters) {
  if (liters && liters > 0 && intervalKm > 0) {
    return Math.round((intervalKm / liters) * 100) / 100;
  }
  return null;
}

function cutoffDate(days) {
  const d = new Date();
  d.setDate(d.getDate() - days);
  return d.toISOString().slice(0, 10);
}

// ── API ──────────────────────────────────────────────────────────────

export const api = {

  // ── 대시보드 ────────────────────────────────────────────────────────
  getDashboard: async () => {
    const db = getDB();
    const carBirthRow = firstRow(await db.query("SELECT value FROM settings WHERE key='car_birth'", []));
    const carBirth = carBirthRow?.value || '';
    let totalDays = null;
    if (carBirth) {
      totalDays = Math.floor((Date.now() - new Date(carBirth).getTime()) / 86400000);
    }

    const recentFuel = rows(await db.query(
      "SELECT * FROM fuel ORDER BY date DESC, id DESC LIMIT 5", []
    ));

    const lastMaintenance = firstRow(await db.query(
      "SELECT * FROM maintenance ORDER BY date DESC, id DESC LIMIT 1", []
    ));

    const lastOther = firstRow(await db.query(
      "SELECT * FROM other ORDER BY date DESC, id DESC LIMIT 1", []
    ));

    const cutoff = cutoffDate(30);
    const fuel30d  = firstRow(await db.query("SELECT SUM(amount) as total FROM fuel WHERE date >= ?",        [cutoff]))?.total || 0;
    const maint30d = firstRow(await db.query("SELECT SUM(amount) as total FROM maintenance WHERE date >= ?", [cutoff]))?.total || 0;
    const other30d = firstRow(await db.query("SELECT SUM(amount) as total FROM other WHERE date >= ?",       [cutoff]))?.total || 0;

    const avgRow = firstRow(await db.query(
      "SELECT AVG(fuel_economy) as avg FROM fuel" +
      " WHERE fuel_economy IS NOT NULL AND fuel_economy > 0 AND fuel_economy <= 50" +
      " AND odometer > 0 AND (interval_km IS NULL OR interval_km < odometer * 0.95)", []
    ));

    const odomRow = firstRow(await db.query(`
      SELECT odometer FROM (
        SELECT date, odometer FROM fuel       WHERE odometer IS NOT NULL
        UNION ALL
        SELECT date, odometer FROM maintenance WHERE odometer IS NOT NULL
        UNION ALL
        SELECT date, odometer FROM other       WHERE odometer IS NOT NULL
      ) ORDER BY date DESC, odometer DESC LIMIT 1
    `, []));

    return {
      car_birth:        carBirth,
      total_days:       totalDays,
      recent_fuel:      recentFuel,
      last_maintenance: lastMaintenance,
      last_other:       lastOther,
      cost_last_30d:    fuel30d + maint30d + other30d,
      avg_economy:      avgRow?.avg ? Math.round(avgRow.avg * 100) / 100 : null,
      latest_odometer:  odomRow?.odometer ?? null,
    };
  },

  // ── 주유 ────────────────────────────────────────────────────────────
  getFuel: async () => {
    const db = getDB();
    return rows(await db.query("SELECT * FROM fuel ORDER BY date DESC, id DESC", []));
  },

  createFuel: async (data) => {
    const db = getDB();
    const last = firstRow(await db.query(
      "SELECT odometer, liters FROM fuel ORDER BY date DESC, id DESC LIMIT 1", []
    ));
    let interval_km = null;
    let fuel_economy = null;
    if (last && data.odometer > 0) {
      const diff = data.odometer - last.odometer;
      if (diff > 0) {
        interval_km = diff;
        fuel_economy = calcFuelEconomy(diff, data.liters);
      }
    }
    const res = await db.run(
      "INSERT INTO fuel (date, type, amount, unit_price, liters, odometer, interval_km, fuel_economy, location, memo)" +
      " VALUES (?,?,?,?,?,?,?,?,?,?)",
      [data.date, data.type ?? '가득주유', data.amount, data.unit_price ?? null,
       data.liters ?? null, data.odometer, interval_km, fuel_economy,
       data.location ?? null, data.memo ?? null]
    );
    return firstRow(await db.query("SELECT * FROM fuel WHERE id=?", [res.changes?.lastId]));
  },

  updateFuel: async (id, data) => {
    const db = getDB();
    await db.run(
      "UPDATE fuel SET date=?, type=?, amount=?, unit_price=?, liters=?, odometer=?, location=?, memo=? WHERE id=?",
      [data.date, data.type, data.amount, data.unit_price ?? null,
       data.liters ?? null, data.odometer, data.location ?? null, data.memo ?? null, id]
    );
    const prev = firstRow(await db.query(
      "SELECT odometer, liters FROM fuel WHERE date <= ? AND id != ? ORDER BY date DESC, id DESC LIMIT 1",
      [data.date, id]
    ));
    const next = firstRow(await db.query(
      "SELECT id, odometer, liters FROM fuel WHERE date >= ? AND id != ? ORDER BY date ASC, id ASC LIMIT 1",
      [data.date, id]
    ));
    let interval_km = null;
    let fuel_economy = null;
    if (prev && data.odometer > 0) {
      const diff = data.odometer - prev.odometer;
      if (diff > 0) {
        interval_km = diff;
        fuel_economy = calcFuelEconomy(diff, data.liters);
      }
    }
    await db.run("UPDATE fuel SET interval_km=?, fuel_economy=? WHERE id=?", [interval_km, fuel_economy, id]);
    if (next) {
      const nextInterval = next.odometer - data.odometer;
      const nextEconomy = nextInterval > 0 ? calcFuelEconomy(nextInterval, next.liters) : null;
      await db.run("UPDATE fuel SET interval_km=?, fuel_economy=? WHERE id=?", [nextInterval, nextEconomy, next.id]);
    }
    return firstRow(await db.query("SELECT * FROM fuel WHERE id=?", [id]));
  },

  deleteFuel: async (id) => {
    const db = getDB();
    await db.run("DELETE FROM fuel WHERE id=?", [id]);
    return null;
  },

  // ── 목록 페이지네이션 (keyset) ─────────────────────────────────────
  // 기존 getFuel/getMaintenance/getOther 전체조회는 그대로 둔다(폼 계산·통계용).
  getFuelPage: async ({ cursor = null, limit = PAGE_SIZE } = {}) => {
    const db = getDB()
    const { sql, params } = buildKeysetQuery('fuel', cursor, limit)
    const rs = rows(await db.query(sql, params))
    return { rows: rs, nextCursor: nextCursorFrom(rs, limit) }
  },

  getMaintenancePage: async ({ cursor = null, limit = PAGE_SIZE } = {}) => {
    const db = getDB()
    const { sql, params } = buildKeysetQuery('maintenance', cursor, limit)
    const rs = rows(await db.query(sql, params))
    return { rows: rs, nextCursor: nextCursorFrom(rs, limit) }
  },

  getOtherPage: async ({ cursor = null, limit = PAGE_SIZE } = {}) => {
    const db = getDB()
    const { sql, params } = buildKeysetQuery('other', cursor, limit)
    const rs = rows(await db.query(sql, params))
    return { rows: rs, nextCursor: nextCursorFrom(rs, limit) }
  },

  // ── 정비 ────────────────────────────────────────────────────────────
  getMaintenance: async () => {
    const db = getDB();
    return rows(await db.query("SELECT * FROM maintenance ORDER BY date DESC, id DESC", []));
  },

  getMaintenanceItems: () => MAINTENANCE_ITEMS,

  createMaintenance: async (data) => {
    const db = getDB();
    const res = await db.run(
      "INSERT INTO maintenance (date, category, item, amount, odometer, location, memo) VALUES (?,?,?,?,?,?,?)",
      [data.date, '정비', data.item, data.amount ?? 0, data.odometer,
       data.location ?? null, data.memo ?? null]
    );
    return firstRow(await db.query("SELECT * FROM maintenance WHERE id=?", [res.changes?.lastId]));
  },

  updateMaintenance: async (id, data) => {
    const db = getDB();
    await db.run(
      "UPDATE maintenance SET date=?, item=?, amount=?, odometer=?, location=?, memo=? WHERE id=?",
      [data.date, data.item, data.amount ?? 0, data.odometer,
       data.location ?? null, data.memo ?? null, id]
    );
    return firstRow(await db.query("SELECT * FROM maintenance WHERE id=?", [id]));
  },

  deleteMaintenance: async (id) => {
    const db = getDB();
    await db.run("DELETE FROM maintenance WHERE id=?", [id]);
    return null;
  },

  // ── 기타 ────────────────────────────────────────────────────────────
  getOther: async () => {
    const db = getDB();
    return rows(await db.query("SELECT * FROM other ORDER BY date DESC, id DESC", []));
  },

  getOtherItems: () => OTHER_ITEMS,

  createOther: async (data) => {
    const db = getDB();
    const res = await db.run(
      "INSERT INTO other (date, category, item, amount, odometer, location, memo) VALUES (?,?,?,?,?,?,?)",
      [data.date, '기타', data.item, data.amount ?? 0, data.odometer ?? null,
       data.location ?? null, data.memo ?? null]
    );
    return firstRow(await db.query("SELECT * FROM other WHERE id=?", [res.changes?.lastId]));
  },

  updateOther: async (id, data) => {
    const db = getDB();
    await db.run(
      "UPDATE other SET date=?, item=?, amount=?, odometer=?, location=?, memo=? WHERE id=?",
      [data.date, data.item, data.amount ?? 0, data.odometer ?? null,
       data.location ?? null, data.memo ?? null, id]
    );
    return firstRow(await db.query("SELECT * FROM other WHERE id=?", [id]));
  },

  deleteOther: async (id) => {
    const db = getDB();
    await db.run("DELETE FROM other WHERE id=?", [id]);
    return null;
  },

  // ── 설정 ────────────────────────────────────────────────────────────
  getSettings: async () => {
    const db = getDB();
    const result = rows(await db.query("SELECT key, value FROM settings", []));
    const data = Object.fromEntries(result.map(r => [r.key, r.value]));
    return {
      car_birth: data.car_birth ?? '',
      car_type:  data.car_type  ?? '',
      car_brand: data.car_brand ?? '',
      car_model: data.car_model ?? '',
      car_plate: data.car_plate ?? '',
      car_fuel:  data.car_fuel  ?? '',
    };
  },

  updateSettings: async (data) => {
    const db = getDB();
    const fields = {
      car_birth: data.car_birth ?? '',
      car_type:  data.car_type  ?? '',
      car_brand: data.car_brand ?? '',
      car_model: data.car_model ?? '',
      car_plate: data.car_plate ?? '',
      car_fuel:  data.car_fuel  ?? '',
    };
    await db.beginTransaction();
    for (const [key, value] of Object.entries(fields)) {
      await db.run("INSERT OR REPLACE INTO settings (key, value) VALUES (?,?)", [key, value], false);
    }
    await db.commitTransaction();
    return fields;
  },

  getSettingsOptions: () => ({
    car_type: CAR_TYPE_OPTIONS,
    car_fuel: CAR_FUEL_OPTIONS,
  }),

  // ── 가져오기 / 내보내기 ──────────────────────────────────────────────
  importPreview: (data) => {
    const errors = [];
    const checkDate = (val, label) => {
      if (!/^\d{4}-\d{2}-\d{2}$/.test(val) || isNaN(new Date(val).getTime())) {
        errors.push(`${label}: 날짜 형식 오류 (${val})`);
      }
    };
    (data.fuel        ?? []).forEach((r, i) => checkDate(r.date, `주유 ${i + 1}번`));
    (data.maintenance ?? []).forEach((r, i) => checkDate(r.date, `정비 ${i + 1}번`));
    (data.other       ?? []).forEach((r, i) => checkDate(r.date, `기타 ${i + 1}번`));
    return {
      counts:  { fuel: (data.fuel ?? []).length, maintenance: (data.maintenance ?? []).length, other: (data.other ?? []).length },
      records: { fuel: data.fuel ?? [], maintenance: data.maintenance ?? [], other: data.other ?? [] },
      vehicle: data.vehicle ?? null,
      errors,
    };
  },

  importConfirm: async (data) => {
    const db = getDB();
    await db.beginTransaction();
    try {
      if (data.vehicle) {
        const v = data.vehicle;
        const vFields = { car_birth: v.car_birth, car_type: v.car_type, car_brand: v.car_brand,
                          car_model: v.car_model, car_plate: v.car_plate, car_fuel: v.car_fuel };
        for (const [key, value] of Object.entries(vFields)) {
          if (value) await db.run("INSERT OR REPLACE INTO settings (key, value) VALUES (?,?)", [key, value], false);
        }
      }
      const fuelSorted = [...(data.fuel ?? [])].sort((a, b) => a.date.localeCompare(b.date));
      for (const record of fuelSorted) {
        const last = firstRow(await db.query(
          "SELECT odometer, liters FROM fuel ORDER BY date DESC, id DESC LIMIT 1", []
        ));
        let interval_km = null;
        let fuel_economy = null;
        if (last && record.odometer > 0) {
          const diff = record.odometer - last.odometer;
          if (diff > 0) {
            interval_km = diff;
            fuel_economy = calcFuelEconomy(diff, record.liters);
          }
        }
        await db.run(
          "INSERT INTO fuel (date, type, amount, unit_price, liters, odometer, interval_km, fuel_economy, location, memo) VALUES (?,?,?,?,?,?,?,?,?,?)",
          [record.date, record.type ?? '가득주유', record.amount, record.unit_price ?? null,
           record.liters ?? null, record.odometer, interval_km, fuel_economy,
           record.location ?? null, record.memo ?? ''],
          false
        );
      }
      for (const record of (data.maintenance ?? [])) {
        await db.run(
          "INSERT INTO maintenance (date, category, item, amount, odometer, location, memo) VALUES (?,?,?,?,?,?,?)",
          [record.date, '정비', record.item, record.amount ?? 0,
           record.odometer, record.location ?? null, record.memo ?? ''],
          false
        );
      }
      for (const record of (data.other ?? [])) {
        await db.run(
          "INSERT INTO other (date, category, item, amount, odometer, location, memo) VALUES (?,?,?,?,?,?,?)",
          [record.date, '기타', record.item, record.amount ?? 0,
           record.odometer ?? null, record.location ?? null, record.memo ?? ''],
          false
        );
      }
      await db.commitTransaction();
    } catch (e) {
      await db.rollbackTransaction();
      throw e;
    }
    return {
      imported: {
        fuel:        (data.fuel        ?? []).length,
        maintenance: (data.maintenance ?? []).length,
        other:       (data.other       ?? []).length,
      }
    };
  },

  exportData: async () => {
    const db = getDB();
    const settingsRows = rows(await db.query("SELECT key, value FROM settings", []));
    const settings = Object.fromEntries(settingsRows.map(r => [r.key, r.value]));
    const fuelRows  = rows(await db.query("SELECT date, type, amount, unit_price, liters, odometer, memo FROM fuel ORDER BY date ASC, id ASC", []));
    const maintRows = rows(await db.query("SELECT date, item, amount, odometer, memo FROM maintenance ORDER BY date ASC, id ASC", []));
    const otherRows = rows(await db.query("SELECT date, item, amount, odometer, memo FROM other ORDER BY date ASC, id ASC", []));
    return {
      vehicle: {
        car_birth: settings.car_birth ?? '',
        car_type:  settings.car_type  ?? '',
        car_brand: settings.car_brand ?? '',
        car_model: settings.car_model ?? '',
        car_plate: settings.car_plate ?? '',
        car_fuel:  settings.car_fuel  ?? '',
      },
      fuel:        fuelRows,
      maintenance: maintRows,
      other:       otherRows,
    };
  },

  exportToFile: async () => {
    const data = await api.exportData();
    const json = JSON.stringify(data, null, 2);
    const date = new Date().toISOString().slice(0, 10).replace(/-/g, '');
    const filename = `chapil_backup_${date}.json`;
    if (Capacitor.getPlatform() === 'android') {
      try {
        await FilePlugin.saveFile({ filename, content: json });
        return filename;
      } catch (err) {
        if ((err.message ?? '').includes('cancelled')) return null;
        throw err;
      }
    }
    const blob = new Blob([json], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    setTimeout(() => URL.revokeObjectURL(url), 1000);
    return filename;
  },

  // Android 전용 (MediaStore). iOS 빌드 시 호출하지 말 것
  autoBackupToFile: async () => {
    const data = await api.exportData();
    const json = JSON.stringify(data, null, 2);
    const date = new Date().toISOString().slice(0, 10).replace(/-/g, '');
    const filename = `chapil_backup_${date}.json`;
    await FilePlugin.autoBackup({ filename, content: json });
    return filename;
  },

  importFromFile: (file) => new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const data = JSON.parse(e.target.result);
        resolve(api.importPreview(data));
      } catch {
        reject(new Error('올바른 JSON 파일이 아닙니다'));
      }
    };
    reader.onerror = () => reject(new Error('파일 읽기 실패'));
    reader.readAsText(file, 'utf-8');
  }),

  importFromXlsx: async (file) => {
    const XLSX = await import('xlsx');
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = (e) => {
        try {
          const data = new Uint8Array(e.target.result);
          const workbook = XLSX.read(data, { type: 'array' });
          
          const fuel_records = [];
          const maint_records = [];
          const other_records = [];
          const errors = [];
          
          const _str = (val) => val != null ? String(val).trim() : '';
          const _toInt = (val) => {
            if (!val) return null;
            const str = String(val).replace(/,/g, '');
            const num = parseInt(parseFloat(str), 10);
            return isNaN(num) ? null : num;
          };
          const _toFloat = (val) => {
            if (!val) return null;
            const str = String(val).replace(/,/g, '');
            const num = parseFloat(str);
            return isNaN(num) ? null : num;
          };
          const _parseDate = (val) => {
            // Excel dates might be numeric
            if (typeof val === 'number') {
              const d = XLSX.SSF.parse_date_code(val);
              if (d) {
                const mm = String(d.m).padStart(2, '0');
                const dd = String(d.d).padStart(2, '0');
                return `${d.y}-${mm}-${dd}`;
              }
            }
            const str = String(val).trim();
            if (!str) return '';
            return str.replace(/\./g, '-');
          };
          const _checkDate = (val) => /^\d{4}-\d{2}-\d{2}$/.test(val) && !isNaN(new Date(val).getTime());
          
          if (workbook.SheetNames.includes("주유(충전)")) {
            const sheet = workbook.Sheets["주유(충전)"];
            const rows = XLSX.utils.sheet_to_json(sheet, { header: 1, defval: null });
            for (let i = 1; i < rows.length; i++) {
              const row = rows[i];
              if (!row || row[0] == null || _str(row[0]) === '') continue;
              try {
                const cols = row.map(_str);
                const raw_date = row[0]; // use original value for date parsing
                const ftype = cols[1] || "가득주유";
                const amount = _toInt(cols[2]) || 0;
                const unit_price = _toInt(cols[3]);
                const liters = _toFloat(cols[4]);
                const odometer = _toInt(cols[6]) || 0;
                const location = cols[7] || null;
                const memo = cols.length > 10 ? cols[10] : "";
                
                const parsed_date = _parseDate(raw_date);
                if (!_checkDate(parsed_date)) throw new Error(`날짜 형식 오류 (${_str(raw_date)})`);
                
                fuel_records.push({
                  date: parsed_date, type: ftype, amount, unit_price,
                  liters, odometer, location, memo
                });
              } catch (err) {
                errors.push(`주유 ${i + 1}행: ${err.message || '오류'}`);
              }
            }
          }
          
          if (workbook.SheetNames.includes("정비")) {
            const sheet = workbook.Sheets["정비"];
            const rows = XLSX.utils.sheet_to_json(sheet, { header: 1, defval: null });
            for (let i = 1; i < rows.length; i++) {
              const row = rows[i];
              if (!row || row[0] == null || _str(row[0]) === '') continue;
              try {
                const cols = row.map(_str);
                const parsed_date = _parseDate(row[0]);
                if (!_checkDate(parsed_date)) throw new Error(`날짜 형식 오류 (${_str(row[0])})`);
                
                const item = cols.length > 2 ? cols[2] : "";
                const amount = _toInt(cols[3]) || 0;
                const odometer = _toInt(cols[4]) || 0;
                const location = cols.length > 5 ? cols[5] : null;
                const memo = cols.length > 6 ? cols[6] : "";
                
                maint_records.push({
                  date: parsed_date, item, amount, odometer, location, memo
                });
              } catch (err) {
                errors.push(`정비 ${i + 1}행: ${err.message || '오류'}`);
              }
            }
          }
          
          if (workbook.SheetNames.includes("기타")) {
            const sheet = workbook.Sheets["기타"];
            const rows = XLSX.utils.sheet_to_json(sheet, { header: 1, defval: null });
            for (let i = 1; i < rows.length; i++) {
              const row = rows[i];
              if (!row || row[0] == null || _str(row[0]) === '') continue;
              try {
                const cols = row.map(_str);
                const parsed_date = _parseDate(row[0]);
                if (!_checkDate(parsed_date)) throw new Error(`날짜 형식 오류 (${_str(row[0])})`);
                
                const item = cols.length > 2 ? cols[2] : "";
                const amount = _toInt(cols[3]) || 0;
                const odometer = _toInt(cols[4]) || null;
                const location = cols.length > 5 ? cols[5] : null;
                const memo = cols.length > 6 ? cols[6] : "";
                
                other_records.push({
                  date: parsed_date, item, amount, odometer, location, memo
                });
              } catch (err) {
                errors.push(`기타 ${i + 1}행: ${err.message || '오류'}`);
              }
            }
          }
          
          resolve({
            counts: { fuel: fuel_records.length, maintenance: maint_records.length, other: other_records.length },
            records: { fuel: fuel_records, maintenance: maint_records, other: other_records },
            vehicle: null,
            errors
          });
          
        } catch (err) {
          reject(new Error('올바른 엑셀 파일이 아닙니다'));
        }
      };
      reader.onerror = () => reject(new Error('파일 읽기 실패'));
      reader.readAsArrayBuffer(file);
    });
  },

  // ── 차량 이미지 ──────────────────────────────────────────────────────
  uploadCarImage: async (file) => {
    const b64 = await fileToBase64(file);
    await Filesystem.writeFile({ path: 'car_image.jpg', data: b64, directory: Directory.Data });
    if (_imgUrl) URL.revokeObjectURL(_imgUrl);
    _imgUrl = URL.createObjectURL(file);
  },

  uploadCarImageOriginal: async (file) => {
    const b64 = await fileToBase64(file);
    await Filesystem.writeFile({ path: 'car_image_orig.jpg', data: b64, directory: Directory.Data });
    if (_imgOrigUrl) URL.revokeObjectURL(_imgOrigUrl);
    _imgOrigUrl = URL.createObjectURL(file);
  },

  deleteCarImage: async () => {
    for (const path of ['car_image.jpg', 'car_image_orig.jpg']) {
      await Filesystem.deleteFile({ path, directory: Directory.Data }).catch(() => {});
    }
    if (_imgUrl)     URL.revokeObjectURL(_imgUrl);
    if (_imgOrigUrl) URL.revokeObjectURL(_imgOrigUrl);
    _imgUrl = null;
    _imgOrigUrl = null;
  },

  carImageUrl:         () => _imgUrl,
  carImageOriginalUrl: () => _imgOrigUrl,
};
