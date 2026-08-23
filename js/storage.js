import { migrateData } from './expenses.js';

const DATA_KEY = 'expenses-app:data:v1';
const BACKUP_KEY = 'expenses-app:pre-import-backup:v1';
const GITHUB_SETTINGS_KEY = 'expenses-app:github-settings:v1';
const THEME_KEY = 'expenses-app:theme';

export async function loadInitialData() {
  const local = localStorage.getItem(DATA_KEY);
  if (local) {
    try { return migrateData(JSON.parse(local)); } catch (error) { console.warn('Local data invalid', error); }
  }
  return loadSeed();
}

export async function loadSeed() {
  const url = new URL('./data/expenses.json', document.baseURI);
  const response = await fetch(url);
  if (!response.ok) throw new Error(`Не удалось загрузить seed JSON (${response.status}).`);
  const data = migrateData(await response.json());
  saveData(data);
  return data;
}

export function saveData(data) {
  localStorage.setItem(DATA_KEY, JSON.stringify(data));
}

export function backupData(data) {
  localStorage.setItem(BACKUP_KEY, JSON.stringify({ createdAt: new Date().toISOString(), data }));
}

export function getBackup() {
  const raw = localStorage.getItem(BACKUP_KEY);
  return raw ? JSON.parse(raw) : null;
}

export function getGithubSettings() {
  try { return JSON.parse(localStorage.getItem(GITHUB_SETTINGS_KEY)) || {}; } catch { return {}; }
}

export function saveGithubSettings(settings) {
  localStorage.setItem(GITHUB_SETTINGS_KEY, JSON.stringify(settings));
}

export function getTheme() { return localStorage.getItem(THEME_KEY) || 'auto'; }
export function setTheme(theme) { localStorage.setItem(THEME_KEY, theme); }
