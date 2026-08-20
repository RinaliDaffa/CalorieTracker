/* ============================================
   NutriSnap — Database Module
   IndexedDB wrapper for persistent storage
   ============================================ */

import { DEFAULT_GOALS, generateId, formatDate } from './utils.js';

const DB_NAME = 'nutrisnap';
const DB_VERSION = 1;

let dbInstance = null;

// ── Open Database ──
function openDB() {
  if (dbInstance) return Promise.resolve(dbInstance);

  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onupgradeneeded = (event) => {
      const db = event.target.result;

      // Meals store
      if (!db.objectStoreNames.contains('meals')) {
        const mealsStore = db.createObjectStore('meals', { keyPath: 'id' });
        mealsStore.createIndex('date', 'date', { unique: false });
        mealsStore.createIndex('mealType', 'mealType', { unique: false });
        mealsStore.createIndex('dateAndType', ['date', 'mealType'], { unique: false });
      }

      // Photos store (blobs, separate for performance)
      if (!db.objectStoreNames.contains('photos')) {
        db.createObjectStore('photos', { keyPath: 'mealId' });
      }

      // Goals store
      if (!db.objectStoreNames.contains('goals')) {
        db.createObjectStore('goals', { keyPath: 'id' });
      }

      // Settings store
      if (!db.objectStoreNames.contains('settings')) {
        db.createObjectStore('settings', { keyPath: 'key' });
      }

      // Favorites store
      if (!db.objectStoreNames.contains('favorites')) {
        const favStore = db.createObjectStore('favorites', { keyPath: 'id' });
        favStore.createIndex('name', 'name', { unique: false });
      }

      // Chat history store
      if (!db.objectStoreNames.contains('chats')) {
        const chatStore = db.createObjectStore('chats', { keyPath: 'id' });
        chatStore.createIndex('timestamp', 'timestamp', { unique: false });
      }
    };

    request.onsuccess = (event) => {
      dbInstance = event.target.result;
      resolve(dbInstance);
    };

    request.onerror = (event) => {
      reject(new Error(`Failed to open database: ${event.target.error}`));
    };
  });
}

// ── Generic DB Operations ──
async function getStore(storeName, mode = 'readonly') {
  const db = await openDB();
  const tx = db.transaction(storeName, mode);
  return tx.objectStore(storeName);
}

async function dbPut(storeName, data) {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(storeName, 'readwrite');
    const store = tx.objectStore(storeName);
    const request = store.put(data);
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

async function dbGet(storeName, key) {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(storeName, 'readonly');
    const store = tx.objectStore(storeName);
    const request = store.get(key);
    request.onsuccess = () => resolve(request.result || null);
    request.onerror = () => reject(request.error);
  });
}

async function dbGetAll(storeName) {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(storeName, 'readonly');
    const store = tx.objectStore(storeName);
    const request = store.getAll();
    request.onsuccess = () => resolve(request.result || []);
    request.onerror = () => reject(request.error);
  });
}

async function dbDelete(storeName, key) {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(storeName, 'readwrite');
    const store = tx.objectStore(storeName);
    const request = store.delete(key);
    request.onsuccess = () => resolve();
    request.onerror = () => reject(request.error);
  });
}

async function dbGetByIndex(storeName, indexName, value) {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(storeName, 'readonly');
    const store = tx.objectStore(storeName);
    const index = store.index(indexName);
    const request = index.getAll(value);
    request.onsuccess = () => resolve(request.result || []);
    request.onerror = () => reject(request.error);
  });
}

// ── Meal Operations ──
export async function saveMeal(mealData) {
  const meal = {
    id: mealData.id || generateId(),
    date: mealData.date || formatDate(new Date()),
    mealType: mealData.mealType || 'snack',
    timestamp: mealData.timestamp || Date.now(),
    foodItems: mealData.foodItems || [],
    nutrition: mealData.nutrition || {},
    healthScore: mealData.healthScore || null,
    aiTips: mealData.aiTips || '',
    notes: mealData.notes || '',
    hasPhoto: !!mealData.photoBlob
  };

  await dbPut('meals', meal);

  // Save photo separately if provided
  if (mealData.photoBlob) {
    await dbPut('photos', {
      mealId: meal.id,
      blob: mealData.photoBlob,
      timestamp: meal.timestamp
    });
  }

  return meal;
}

export async function getMeal(id) {
  return dbGet('meals', id);
}

export async function getMealsByDate(dateStr) {
  const meals = await dbGetByIndex('meals', 'date', dateStr);
  return meals.sort((a, b) => a.timestamp - b.timestamp);
}

export async function getMealsByDateRange(startDate, endDate) {
  const allMeals = await dbGetAll('meals');
  return allMeals
    .filter(m => m.date >= startDate && m.date <= endDate)
    .sort((a, b) => a.timestamp - b.timestamp);
}

export async function deleteMeal(id) {
  await dbDelete('meals', id);
  // Also delete associated photo
  try {
    await dbDelete('photos', id);
  } catch (e) {
    // Photo may not exist
  }
}

export async function getMealPhoto(mealId) {
  const photo = await dbGet('photos', mealId);
  return photo ? photo.blob : null;
}

export async function getAllMeals() {
  const meals = await dbGetAll('meals');
  return meals.sort((a, b) => b.timestamp - a.timestamp);
}

// ── Goals Operations ──
export async function saveGoals(goals) {
  await dbPut('goals', { id: 'current', ...goals, updatedAt: Date.now() });
}

export async function getGoals() {
  const goals = await dbGet('goals', 'current');
  return goals || { id: 'current', ...DEFAULT_GOALS };
}

// ── Settings Operations ──
export async function saveSetting(key, value) {
  await dbPut('settings', { key, value, updatedAt: Date.now() });
}

export async function getSetting(key) {
  const result = await dbGet('settings', key);
  return result ? result.value : null;
}

export async function getAllSettings() {
  const settings = await dbGetAll('settings');
  const map = {};
  settings.forEach(s => { map[s.key] = s.value; });
  return map;
}

// ── Favorites Operations ──
export async function saveFavorite(favorite) {
  const fav = {
    id: favorite.id || generateId(),
    name: favorite.name,
    foodItems: favorite.foodItems,
    nutrition: favorite.nutrition,
    createdAt: favorite.createdAt || Date.now()
  };
  await dbPut('favorites', fav);
  return fav;
}

export async function getFavorites() {
  const favs = await dbGetAll('favorites');
  return favs.sort((a, b) => b.createdAt - a.createdAt);
}

export async function deleteFavorite(id) {
  return dbDelete('favorites', id);
}

// ── Chat History ──
export async function saveChatMessage(message) {
  const msg = {
    id: generateId(),
    role: message.role, // 'user' or 'assistant'
    content: message.content,
    timestamp: Date.now()
  };
  await dbPut('chats', msg);
  return msg;
}

export async function getChatHistory(limit = 50) {
  const chats = await dbGetAll('chats');
  return chats
    .sort((a, b) => a.timestamp - b.timestamp)
    .slice(-limit);
}

export async function clearChatHistory() {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction('chats', 'readwrite');
    const store = tx.objectStore('chats');
    const request = store.clear();
    request.onsuccess = () => resolve();
    request.onerror = () => reject(request.error);
  });
}

// ── Export to CSV ──
// Food names come from the model, so a cell can begin with =, +, - or @.
// Spreadsheets read those as formulas the moment the file is opened — the
// classic CSV-injection path. A leading apostrophe pins the cell to text;
// quoting alone does not, because Excel strips the quotes first.
function csvCell(value) {
  const text = String(value ?? '');
  const safe = /^[=+\-@\t\r]/.test(text) ? `'${text}` : text;
  return `"${safe.replace(/"/g, '""')}"`;
}

export async function exportToCSV() {
  const meals = await getAllMeals();

  const headers = [
    'Date', 'Time', 'Meal Type', 'Food Items',
    'Calories', 'Protein (g)', 'Carbs (g)', 'Fat (g)',
    'Fiber (g)', 'Sugar (g)', 'Health Score', 'Notes'
  ];

  const rows = meals.map(m => [
    m.date,
    new Date(m.timestamp).toLocaleTimeString(),
    m.mealType,
    (m.foodItems || []).map(f => f.name).join('; '),
    m.nutrition?.calories || 0,
    m.nutrition?.protein || 0,
    m.nutrition?.carbs || 0,
    m.nutrition?.fat || 0,
    m.nutrition?.fiber || 0,
    m.nutrition?.sugar || 0,
    m.healthScore || '',
    m.notes || ''
  ]);

  const csvContent = [
    headers.join(','),
    ...rows.map(r => r.map(csvCell).join(','))
  ].join('\n');

  return csvContent;
}

// ── Request Persistent Storage (iOS) ──
export async function requestPersistentStorage() {
  if (navigator.storage && navigator.storage.persist) {
    const granted = await navigator.storage.persist();
    console.log(`Persistent storage ${granted ? 'granted' : 'denied'}`);
    return granted;
  }
  return false;
}

// ── Storage Estimate ──
export async function getStorageEstimate() {
  if (navigator.storage && navigator.storage.estimate) {
    const estimate = await navigator.storage.estimate();
    return {
      usage: estimate.usage,
      quota: estimate.quota,
      usagePercent: ((estimate.usage / estimate.quota) * 100).toFixed(1)
    };
  }
  return null;
}

// ── Initialize Database ──
export async function initDB() {
  await openDB();
  await requestPersistentStorage();

  // Set default goals if none exist
  const goals = await dbGet('goals', 'current');
  if (!goals) {
    await saveGoals(DEFAULT_GOALS);
  }

  console.log('NutriSnap DB initialized');
}
