import { MONTH_NAMES, monthId, monthName, normalizeText, uid, escapeCsvLikeFormula } from './utils.js';
import { totals, uniqueStrings, validateData } from './expenses.js';

const REQUIRED_HEADERS = ['Дата', 'Вид траты', 'Описание траты', 'Сумма', 'Тип'];
const monthLookup = new Map(MONTH_NAMES.map((name, i) => [name.toLocaleLowerCase('ru'), i + 1]));

function getXLSX() {
  if (!globalThis.XLSX) throw new Error('Библиотека SheetJS не загрузилась. Проверьте подключение к интернету или используйте локальную копию библиотеки.');
  return globalThis.XLSX;
}

export async function parseXlsxFile(file) {
  const XLSX = getXLSX();
  const buffer = await file.arrayBuffer();
  const workbook = XLSX.read(buffer, { type: 'array', cellDates: false, raw: true });
  return parseWorkbook(workbook);
}

export function parseWorkbook(workbook) {
  const XLSX = getXLSX();
  const categories = [];
  const types = [];
  const months = [];

  for (const sheetName of workbook.SheetNames) {
    const ws = workbook.Sheets[sheetName];
    const rows = XLSX.utils.sheet_to_json(ws, { header: 1, defval: null, raw: true });
    if (normalizeText(sheetName).toLocaleLowerCase('ru') === 'виды трат') {
      for (const row of rows) {
        if (normalizeText(row[0])) categories.push(normalizeText(row[0]));
        if (normalizeText(row[1])) types.push(normalizeText(row[1]));
      }
      continue;
    }

    const monthMeta = parseMonthSheetName(sheetName);
    if (!monthMeta) continue;
    const header = findHeader(rows);
    if (!header) continue;

    const expenses = [];
    for (let r = header.row + 1; r < rows.length; r++) {
      const row = rows[r];
      const day = Number(row[header.col]);
      const category = normalizeText(row[header.col + 1]);
      const description = normalizeText(row[header.col + 2]);
      const amount = numberFromCell(row[header.col + 3]);
      const type = normalizeText(row[header.col + 4]);
      if (!Number.isInteger(day) || day < 1 || day > 31 || !category || !type || !(amount > 0)) continue;
      expenses.push({ id: uid(), day, category, description, amount, type });
      categories.push(category);
      types.push(type);
    }

    const incomeInfo = findIncome(rows);
    months.push({
      id: monthId(monthMeta.year, monthMeta.month),
      year: monthMeta.year,
      month: monthMeta.month,
      name: monthName(monthMeta.year, monthMeta.month),
      income: incomeInfo.income,
      incomeNote: incomeInfo.note,
      expenses,
    });
  }

  if (!months.length) throw new Error('В файле не найдены листы месяцев с таблицей расходов.');
  return validateData({
    version: 1,
    settings: { currency: 'RUB', locale: 'ru-RU' },
    categories: uniqueStrings(categories),
    types: uniqueStrings(types),
    months,
  });
}

function parseMonthSheetName(sheetName) {
  const match = normalizeText(sheetName).match(/^([А-Яа-яЁё]+)\s+(\d{4})$/u);
  if (!match) return null;
  const month = monthLookup.get(match[1].toLocaleLowerCase('ru'));
  return month ? { month, year: Number(match[2]) } : null;
}

function findHeader(rows) {
  for (let r = 0; r < rows.length; r++) {
    const row = rows[r];
    for (let c = 0; c <= row.length - REQUIRED_HEADERS.length; c++) {
      if (REQUIRED_HEADERS.every((h, i) => normalizeText(row[c + i]) === h)) return { row: r, col: c };
    }
  }
  return null;
}

function findIncome(rows) {
  for (const row of rows) {
    for (let c = 0; c < row.length; c++) {
      if (normalizeText(row[c]) !== 'Заработок (инв. + зп)') continue;
      const income = numberFromCell(row[c + 1]) || 0;
      let note = '';
      for (let i = c + 2; i < Math.min(row.length, c + 7); i++) {
        const candidate = normalizeText(row[i]);
        if (candidate) { note = candidate; break; }
      }
      return { income, note };
    }
  }
  return { income: 0, note: '' };
}

function numberFromCell(value) {
  if (typeof value === 'number' && Number.isFinite(value)) return value;
  if (typeof value === 'string') {
    const n = Number(value.replace(/\s/g, '').replace(',', '.'));
    return Number.isFinite(n) ? n : null;
  }
  return null;
}

export function exportXlsx(data) {
  const XLSX = getXLSX();
  const wb = XLSX.utils.book_new();

  for (const month of [...data.months].sort((a, b) => b.id.localeCompare(a.id))) {
    const rows = [REQUIRED_HEADERS];
    for (const e of month.expenses) rows.push([e.day, escapeCsvLikeFormula(e.category), escapeCsvLikeFormula(e.description), e.amount, escapeCsvLikeFormula(e.type)]);
    rows.push([]);
    const t = totals(month);
    for (const typeName of data.types) {
      const amount = t.byType.find((x) => x.name === typeName)?.amount || 0;
      rows.push(['', '', '', typeName === 'Личный' ? 'Личные' : typeName === 'Семейный' ? 'Семейные' : typeName, amount]);
    }
    rows.push(['', '', '', 'Общие', t.total]);
    rows.push(['', '', '', 'Заработок (инв. + зп)', month.income, escapeCsvLikeFormula(month.incomeNote)]);
    rows.push(['', '', '', 'Итого', t.balance]);

    const ws = XLSX.utils.aoa_to_sheet(rows);
    ws['!cols'] = [{ wch: 8 }, { wch: 20 }, { wch: 42 }, { wch: 16 }, { wch: 18 }, { wch: 55 }];
    const range = XLSX.utils.decode_range(ws['!ref']);
    for (let r = 1; r <= range.e.r; r++) {
      const cell = ws[XLSX.utils.encode_cell({ r, c: 3 })];
      if (cell && typeof cell.v === 'number') cell.z = '#,##0.00';
      const amountCell = ws[XLSX.utils.encode_cell({ r, c: 4 })];
      if (amountCell && typeof amountCell.v === 'number') amountCell.z = '#,##0.00';
    }
    XLSX.utils.book_append_sheet(wb, ws, month.name.slice(0, 31));
  }

  const max = Math.max(data.categories.length, data.types.length);
  const refs = [];
  for (let i = 0; i < max; i++) refs.push([escapeCsvLikeFormula(data.categories[i] || ''), escapeCsvLikeFormula(data.types[i] || '')]);
  const refsWs = XLSX.utils.aoa_to_sheet(refs);
  refsWs['!cols'] = [{ wch: 25 }, { wch: 20 }];
  XLSX.utils.book_append_sheet(wb, refsWs, 'Виды трат');
  XLSX.writeFile(wb, `Отчеты-${new Date().toISOString().slice(0, 10)}.xlsx`);
}

export function importPreview(data) {
  return {
    months: data.months.map((m) => ({ name: m.name, count: m.expenses.length })),
    totalExpenses: data.months.reduce((sum, m) => sum + m.expenses.length, 0),
  };
}
