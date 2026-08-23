export const MONTH_NAMES = [
  'Январь','Февраль','Март','Апрель','Май','Июнь',
  'Июль','Август','Сентябрь','Октябрь','Ноябрь','Декабрь'
];

export function uid() {
  if (globalThis.crypto?.randomUUID) return crypto.randomUUID();
  return 'id-' + Date.now().toString(36) + '-' + Math.random().toString(36).slice(2, 11);
}

export function monthId(year, month) {
  return `${year}-${String(month).padStart(2, '0')}`;
}

export function monthName(year, month) {
  return `${MONTH_NAMES[month - 1]} ${year}`;
}

export function daysInMonth(year, month) {
  return new Date(year, month, 0).getDate();
}

export function formatMoney(value, settings = { locale: 'ru-RU', currency: 'RUB' }) {
  const n = Number(value) || 0;
  return new Intl.NumberFormat(settings.locale || 'ru-RU', {
    style: 'currency',
    currency: settings.currency || 'RUB',
    minimumFractionDigits: Number.isInteger(n) ? 0 : 2,
    maximumFractionDigits: 2,
  }).format(n);
}

export function downloadBlob(blob, filename) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.append(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

export function downloadText(text, filename, type = 'application/json;charset=utf-8') {
  downloadBlob(new Blob([text], { type }), filename);
}

export function normalizeText(value) {
  return String(value ?? '').trim();
}

export function parsePositiveNumber(value) {
  const normalized = String(value ?? '').replace(/\s/g, '').replace(',', '.');
  const n = Number(normalized);
  return Number.isFinite(n) && n > 0 ? n : null;
}

export function clone(value) {
  return globalThis.structuredClone ? globalThis.structuredClone(value) : JSON.parse(JSON.stringify(value));
}

export function timestampFilePart(date = new Date()) {
  return `${date.getFullYear()}-${String(date.getMonth()+1).padStart(2,'0')}-${String(date.getDate()).padStart(2,'0')}`;
}

export function escapeCsvLikeFormula(text) {
  const s = String(text ?? '');
  return /^[=+\-@]/.test(s) ? `'${s}` : s;
}
