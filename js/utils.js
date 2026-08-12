/* ============================================
   NutriSnap — Utility Functions
   Date helpers, formatters, constants
   ============================================ */

// ── Nutrition Constants ──
export const MEAL_TYPES = ['breakfast', 'lunch', 'dinner', 'snack'];

export const MEAL_ICONS = {
  breakfast: '🌅',
  lunch: '☀️',
  dinner: '🌙',
  snack: '🍿'
};

export const MEAL_LABELS = {
  breakfast: 'Breakfast',
  lunch: 'Lunch',
  dinner: 'Dinner',
  snack: 'Snack'
};

export const DEFAULT_GOALS = {
  calories: 2000,
  protein: 150,   // grams
  carbs: 250,     // grams
  fat: 65,        // grams
  fiber: 30,      // grams
  sugar: 50       // grams
};

export const MACRO_COLORS = {
  calories: { primary: '#10b981', gradient: 'linear-gradient(135deg, #10b981, #06d6a0)' },
  protein:  { primary: '#3b82f6', gradient: 'linear-gradient(135deg, #3b82f6, #6366f1)' },
  carbs:    { primary: '#f59e0b', gradient: 'linear-gradient(135deg, #f59e0b, #f97316)' },
  fat:      { primary: '#ef4444', gradient: 'linear-gradient(135deg, #ef4444, #f97316)' },
  fiber:    { primary: '#8b5cf6', gradient: 'linear-gradient(135deg, #8b5cf6, #a78bfa)' },
  sugar:    { primary: '#ec4899', gradient: 'linear-gradient(135deg, #ec4899, #f43f5e)' }
};

export const MACRO_UNITS = {
  calories: 'kcal',
  protein: 'g',
  carbs: 'g',
  fat: 'g',
  fiber: 'g',
  sugar: 'g'
};

// ── Date Helpers ──
export function getToday() {
  return formatDate(new Date());
}

export function formatDate(date) {
  const d = new Date(date);
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

export function formatDateDisplay(dateStr) {
  const date = new Date(dateStr + 'T00:00:00');
  const today = new Date();
  const yesterday = new Date(today);
  yesterday.setDate(yesterday.getDate() - 1);

  if (formatDate(date) === formatDate(today)) return 'Today';
  if (formatDate(date) === formatDate(yesterday)) return 'Yesterday';

  return date.toLocaleDateString('en-US', {
    weekday: 'short',
    month: 'short',
    day: 'numeric'
  });
}

export function formatTime(date) {
  return new Date(date).toLocaleTimeString('en-US', {
    hour: 'numeric',
    minute: '2-digit',
    hour12: true
  });
}

export function formatDateTime(date) {
  return `${formatDateDisplay(formatDate(new Date(date)))} at ${formatTime(date)}`;
}

export function getDayOfWeek(dateStr) {
  return new Date(dateStr + 'T00:00:00').toLocaleDateString('en-US', { weekday: 'short' });
}

export function getWeekDates(referenceDate = new Date()) {
  const dates = [];
  const start = new Date(referenceDate);
  start.setDate(start.getDate() - start.getDay()); // Start from Sunday

  for (let i = 0; i < 7; i++) {
    const d = new Date(start);
    d.setDate(d.getDate() + i);
    dates.push(formatDate(d));
  }
  return dates;
}

export function getMonthDates(year, month) {
  const dates = [];
  const firstDay = new Date(year, month, 1);
  const lastDay = new Date(year, month + 1, 0);

  // Pad start of month to align with day of week
  const startPad = firstDay.getDay();
  for (let i = startPad - 1; i >= 0; i--) {
    const d = new Date(firstDay);
    d.setDate(d.getDate() - i - 1);
    dates.push({ date: formatDate(d), inMonth: false });
  }

  for (let d = 1; d <= lastDay.getDate(); d++) {
    dates.push({ date: formatDate(new Date(year, month, d)), inMonth: true });
  }

  // Pad end
  const remaining = 42 - dates.length; // 6 rows × 7 days
  for (let i = 1; i <= remaining; i++) {
    const d = new Date(lastDay);
    d.setDate(d.getDate() + i);
    dates.push({ date: formatDate(d), inMonth: false });
  }

  return dates;
}

// ── Number Formatting ──
export function formatNumber(num) {
  if (num === null || num === undefined) return '0';
  return Math.round(num).toLocaleString('en-US');
}

export function formatDecimal(num, decimals = 1) {
  if (num === null || num === undefined) return '0';
  return Number(num).toFixed(decimals);
}

// ── Progress Helpers ──
export function calcProgress(current, goal) {
  if (!goal || goal <= 0) return 0;
  return Math.min((current / goal) * 100, 100);
}

export function getProgressColor(percentage) {
  if (percentage <= 60) return '#10b981';  // Green — on track
  if (percentage <= 85) return '#f59e0b';  // Amber — approaching
  if (percentage <= 100) return '#10b981'; // Green — near goal
  return '#ef4444';                        // Red — over
}

export function getProgressStatus(percentage) {
  if (percentage <= 30) return 'low';
  if (percentage <= 70) return 'moderate';
  if (percentage <= 100) return 'good';
  return 'over';
}

// ── Calorie Helpers ──
export function calcCaloriesFromMacros(protein, carbs, fat) {
  return (protein * 4) + (carbs * 4) + (fat * 9);
}

// ── Image Helpers ──
export function compressImage(file, maxWidth = 1024, quality = 0.7) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        let { width, height } = img;

        if (width > maxWidth) {
          height = (height * maxWidth) / width;
          width = maxWidth;
        }

        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        ctx.drawImage(img, 0, 0, width, height);

        canvas.toBlob(
          (blob) => resolve(blob),
          'image/jpeg',
          quality
        );
      };
      img.onerror = reject;
      img.src = e.target.result;
    };
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

export function blobToBase64(blob) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const base64 = reader.result.split(',')[1];
      resolve(base64);
    };
    reader.onerror = reject;
    reader.readAsDataURL(blob);
  });
}

export function base64ToBlob(base64, mimeType = 'image/jpeg') {
  const byteChars = atob(base64);
  const byteArrays = [];
  for (let offset = 0; offset < byteChars.length; offset += 512) {
    const slice = byteChars.slice(offset, offset + 512);
    const byteNumbers = new Array(slice.length);
    for (let i = 0; i < slice.length; i++) {
      byteNumbers[i] = slice.charCodeAt(i);
    }
    byteArrays.push(new Uint8Array(byteNumbers));
  }
  return new Blob(byteArrays, { type: mimeType });
}

// ── ID Generation ──
export function generateId() {
  return Date.now().toString(36) + Math.random().toString(36).substr(2, 9);
}

// ── Debounce ──
export function debounce(fn, delay = 300) {
  let timer;
  return (...args) => {
    clearTimeout(timer);
    timer = setTimeout(() => fn(...args), delay);
  };
}

// ── Deep Clone ──
export function deepClone(obj) {
  return structuredClone ? structuredClone(obj) : JSON.parse(JSON.stringify(obj));
}

// ── Sum nutrition data across meals ──
export function sumNutrition(meals) {
  const totals = {
    calories: 0,
    protein: 0,
    carbs: 0,
    fat: 0,
    fiber: 0,
    sugar: 0
  };

  for (const meal of meals) {
    if (meal.nutrition) {
      totals.calories += meal.nutrition.calories || 0;
      totals.protein += meal.nutrition.protein || 0;
      totals.carbs += meal.nutrition.carbs || 0;
      totals.fat += meal.nutrition.fat || 0;
      totals.fiber += meal.nutrition.fiber || 0;
      totals.sugar += meal.nutrition.sugar || 0;
    }
  }

  return totals;
}
