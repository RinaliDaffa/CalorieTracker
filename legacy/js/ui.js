/* ============================================
   NutriSnap — UI Module
   DOM rendering and interaction handling
   ============================================ */

import {
  formatNumber, formatTime, formatDateDisplay, formatDate,
  calcProgress, getProgressColor, MEAL_ICONS, MEAL_LABELS,
  MACRO_COLORS, MACRO_UNITS, sumNutrition, getToday
} from './utils.js';
import { drawProgressRing, drawProgressBar, drawWeeklyChart, getHealthScoreEmoji, getHealthScoreLabel } from './charts.js';
import { escapeHtml, formatChatContent } from './core/escape.js';

// ── Toast Notifications ──
let toastTimeout = null;

export function showToast(message, type = 'info', duration = 3000) {
  const container = document.getElementById('toast-container');
  if (!container) return;

  const toast = document.createElement('div');
  toast.className = `toast ${type}`;
  // escapeHtml is not optional here: toast messages carry model-derived
  // text. validateAnalysis interpolates the model's own item.name into its
  // error strings, gemini.js throws those as err.message, and app.js hands
  // err.message straight to showToast — so a food name photographed off an
  // adversarial label would otherwise reach innerHTML as live markup.
  toast.innerHTML = `
    <span>${type === 'success' ? '✓' : type === 'error' ? '✗' : 'ℹ'}</span>
    <span>${escapeHtml(message)}</span>
  `;

  container.appendChild(toast);

  setTimeout(() => {
    toast.classList.add('removing');
    setTimeout(() => toast.remove(), 200);
  }, duration);
}

// ── Render Dashboard ──
export function renderDashboard(todayMeals, goals) {
  const view = document.getElementById('view-dashboard');
  const totals = sumNutrition(todayMeals);

  const caloriePercent = calcProgress(totals.calories, goals.calories);
  const remaining = Math.max(0, goals.calories - totals.calories);

  view.innerHTML = `
    <div class="section stagger-in">
      <!-- Greeting -->
      <div style="margin-bottom: var(--space-lg);">
        <h2 style="font-size: var(--fs-2xl);">${getGreeting()} 👋</h2>
        <p style="font-size: var(--fs-sm); margin-top: 4px;">${formatDateDisplay(getToday())} — Let's track your nutrition</p>
      </div>

      <!-- Calorie Ring -->
      <div class="glass-card no-press calorie-ring-container">
        <div class="calorie-ring-wrapper">
          <canvas id="calorie-ring" width="180" height="180"></canvas>
          <div class="calorie-ring-inner">
            <span class="calorie-ring-value">${formatNumber(totals.calories)}</span>
            <span class="calorie-ring-label">kcal eaten</span>
          </div>
        </div>
        <div class="calorie-ring-remaining">
          ${remaining > 0 ? `${formatNumber(remaining)} kcal remaining` : '🎯 Goal reached!'}
        </div>
      </div>

      <!-- Macro Cards -->
      <div class="grid-4" style="margin-top: var(--space-base);">
        ${renderMiniMacro('Protein', totals.protein, goals.protein, MACRO_COLORS.protein.primary)}
        ${renderMiniMacro('Carbs', totals.carbs, goals.carbs, MACRO_COLORS.carbs.primary)}
        ${renderMiniMacro('Fat', totals.fat, goals.fat, MACRO_COLORS.fat.primary)}
        ${renderMiniMacro('Fiber', totals.fiber, goals.fiber, MACRO_COLORS.fiber.primary)}
      </div>

      <!-- Quick Actions -->
      <div class="section" style="margin-top: var(--space-xl);">
        <div class="section-header">
          <span class="section-title">Quick Add</span>
        </div>
        <div class="quick-actions hide-scrollbar">
          <button class="quick-action-btn" onclick="window.app.switchTab('scan')">
            <span class="quick-action-icon">📸</span>
            <span>Scan Food</span>
          </button>
          <button class="quick-action-btn" id="btn-manual-add">
            <span class="quick-action-icon">✏️</span>
            <span>Type It</span>
          </button>
          <button class="quick-action-btn" id="btn-favorites">
            <span class="quick-action-icon">⭐</span>
            <span>Favorites</span>
          </button>
          <button class="quick-action-btn" onclick="window.app.switchTab('chat')">
            <span class="quick-action-icon">💬</span>
            <span>Ask AI</span>
          </button>
        </div>
      </div>

      <!-- Today's Meals -->
      <div class="section">
        <div class="section-header">
          <span class="section-title">Today's Meals</span>
          <span class="section-action text-secondary">${todayMeals.length} entries</span>
        </div>
        ${todayMeals.length > 0
          ? `<div class="glass-card no-press" style="padding: 0; overflow: hidden;">
              ${todayMeals.map(m => renderMealCard(m)).join('')}
            </div>`
          : `<div class="empty-state">
              <div class="empty-state-icon">🍽️</div>
              <div class="empty-state-title">No meals yet</div>
              <div class="empty-state-text">Scan your first meal to start tracking</div>
            </div>`
        }
      </div>
    </div>
  `;

  // Draw calorie ring
  const calorieCanvas = document.getElementById('calorie-ring');
  if (calorieCanvas) {
    drawProgressRing(calorieCanvas, Math.min(caloriePercent, 100), '#10b981', {
      size: 90,
      lineWidth: 10
    });
  }

  // Draw macro progress bars
  document.querySelectorAll('.macro-progress-bar').forEach(el => {
    const percent = parseFloat(el.dataset.percent);
    const color = el.dataset.color;
    drawProgressBar(el, percent, color, 4);
  });
}

function renderMiniMacro(label, current, goal, color) {
  const percent = calcProgress(current, goal);
  return `
    <div class="glass-card macro-card">
      <div class="macro-label">${label}</div>
      <div class="macro-value" style="color: ${color};">
        ${formatNumber(current)}<span class="macro-unit">g</span>
      </div>
      <div class="macro-progress-bar" data-percent="${percent}" data-color="${color}"></div>
      <div class="macro-goal">${formatNumber(goal)}g goal</div>
    </div>
  `;
}

function renderMealCard(meal) {
  const icon = MEAL_ICONS[meal.mealType] || '🍽️';
  const label = MEAL_LABELS[meal.mealType] || meal.mealType;
  const items = (meal.foodItems || []).map(f => escapeHtml(f.name)).join(', ');

  return `
    <div class="meal-card" data-meal-id="${meal.id}" onclick="window.app.showMealDetail('${meal.id}')">
      <div class="meal-card-photo no-photo">${icon}</div>
      <div class="meal-card-info">
        <div class="meal-card-name">${label}</div>
        <div class="meal-card-items">${items || 'No items'}</div>
        <div class="meal-card-meta">
          <span class="meal-card-time">${formatTime(meal.timestamp)}</span>
        </div>
      </div>
      <div class="meal-card-cals">
        <div class="meal-card-cals-value">${formatNumber(meal.nutrition?.calories)}</div>
        <div class="meal-card-cals-label">kcal</div>
      </div>
    </div>
  `;
}

// ── Render Scan View ──
export function renderScanView() {
  const view = document.getElementById('view-scan');
  view.innerHTML = `
    <div class="scan-container stagger-in">
      <h3 style="text-align: center; margin-bottom: var(--space-sm);">Scan Your Food</h3>
      <p style="text-align: center; font-size: var(--fs-sm); color: var(--text-tertiary); margin-bottom: var(--space-base);">
        Take a photo or upload from gallery
      </p>

      <!-- Camera Viewfinder -->
      <div class="camera-viewfinder" id="camera-viewfinder">
        <video id="camera-video" autoplay playsinline muted></video>
        <img id="preview-image" class="preview-img" style="display: none;" alt="Food preview" />
        <div class="camera-overlay" id="camera-overlay">
          <div class="camera-corners">
            <div class="camera-corners-bottom"></div>
          </div>
          <div class="scan-line" id="scan-line" style="display: none;"></div>
        </div>
        <div id="camera-placeholder" style="display: flex; align-items: center; justify-content: center; height: 100%; flex-direction: column; gap: var(--space-sm);">
          <span style="font-size: 48px; opacity: 0.4;">📷</span>
          <span style="font-size: var(--fs-sm); color: var(--text-tertiary);">Tap camera to start</span>
        </div>
      </div>

      <!-- Scan Actions -->
      <div class="scan-actions">
        <button class="scan-btn-secondary" id="btn-gallery" title="Upload from gallery">
          🖼️
        </button>
        <button class="scan-btn-capture pulse" id="btn-capture" title="Take photo">
          📸
        </button>
        <button class="scan-btn-secondary" id="btn-retake" title="Retake" style="display: none;">
          🔄
        </button>
      </div>

      <!-- Meal Type Selector -->
      <div class="meal-type-selector" id="meal-type-selector">
        <button class="meal-type-option active" data-type="breakfast">🌅 Breakfast</button>
        <button class="meal-type-option" data-type="lunch">☀️ Lunch</button>
        <button class="meal-type-option" data-type="dinner">🌙 Dinner</button>
        <button class="meal-type-option" data-type="snack">🍿 Snack</button>
      </div>

      <!-- Or type description -->
      <div class="glass-card no-press" style="margin-top: var(--space-sm);">
        <p style="font-size: var(--fs-sm); font-weight: var(--fw-semibold); margin-bottom: var(--space-sm);">Or describe your meal</p>
        <textarea class="text-input-area" id="food-description" placeholder="e.g., A bowl of rice with grilled chicken and vegetables..." rows="2"></textarea>
        <button class="btn btn-primary btn-block" id="btn-analyze-text" style="margin-top: var(--space-sm);">
          🔍 Analyze
        </button>
      </div>

      <!-- Analysis Loading -->
      <div id="analysis-loading" style="display: none; text-align: center; padding: var(--space-xl);">
        <div class="spinner spinner-lg" style="margin: 0 auto var(--space-base);"></div>
        <p style="font-size: var(--fs-sm); color: var(--text-secondary);">Analyzing your food with AI...</p>
      </div>

      <!-- Scan Results -->
      <div class="scan-results" id="scan-results">
        <!-- Filled dynamically -->
      </div>

      <!-- Hidden file input -->
      <input type="file" id="file-input" accept="image/*" capture="environment" style="display: none;" />
    </div>
  `;
}

// ── Render Scan Results ──
export function renderScanResults(analysisData) {
  const container = document.getElementById('scan-results');
  if (!container || !analysisData) return;

  const { foodItems, totalNutrition, healthScore, aiTips, mealDescription } = analysisData;

  // healthScore is null when the model omitted it or sent something that
  // was not a number (js/core/nutrition.js). Rendering the badge anyway
  // gives "🔴 null/10 Poor" — a fabricated bad score rather than a missing
  // one, which is worse than showing nothing.
  const hasHealthScore = typeof healthScore === 'number';
  const healthScoreHTML = hasHealthScore ? `
          <div class="health-score">
            <span>${getHealthScoreEmoji(healthScore)}</span>
            <span class="health-score-number">${healthScore}/10</span>
            <span style="font-size: var(--fs-xs); color: var(--text-tertiary);">${getHealthScoreLabel(healthScore)}</span>
          </div>` : '';

  container.innerHTML = `
    <div class="stagger-in" style="display: flex; flex-direction: column; gap: var(--space-base);">
      <!-- Meal Summary -->
      <div class="glass-card no-press">
        <div style="display: flex; align-items: center; justify-content: space-between; margin-bottom: var(--space-md);">
          <h4>Analysis Result</h4>${healthScoreHTML}
        </div>
        <p style="font-size: var(--fs-sm); color: var(--text-secondary); margin-bottom: var(--space-md);">${escapeHtml(mealDescription || '')}</p>

        <!-- Food Items -->
        ${foodItems.map(item => `
          <div class="food-item-row">
            <div>
              <div class="food-item-name">${escapeHtml(item.name)}</div>
              <div class="food-item-serving">${escapeHtml(item.servingSize || '')}</div>
            </div>
            <div class="food-item-cals">${formatNumber(item.calories)} kcal</div>
          </div>
        `).join('')}
      </div>

      <!-- Total Nutrition -->
      <div class="glass-card no-press">
        <h4 style="margin-bottom: var(--space-md);">Total Nutrition</h4>
        <table class="nutrition-table">
          <tr>
            <td><span class="macro-dot" style="background: ${MACRO_COLORS.calories.primary};"></span>Calories</td>
            <td>${formatNumber(totalNutrition.calories)} kcal</td>
          </tr>
          <tr>
            <td><span class="macro-dot" style="background: ${MACRO_COLORS.protein.primary};"></span>Protein</td>
            <td>${formatNumber(totalNutrition.protein)} g</td>
          </tr>
          <tr>
            <td><span class="macro-dot" style="background: ${MACRO_COLORS.carbs.primary};"></span>Carbs</td>
            <td>${formatNumber(totalNutrition.carbs)} g</td>
          </tr>
          <tr>
            <td><span class="macro-dot" style="background: ${MACRO_COLORS.fat.primary};"></span>Fat</td>
            <td>${formatNumber(totalNutrition.fat)} g</td>
          </tr>
          <tr>
            <td><span class="macro-dot" style="background: ${MACRO_COLORS.fiber.primary};"></span>Fiber</td>
            <td>${formatNumber(totalNutrition.fiber || 0)} g</td>
          </tr>
          <tr>
            <td><span class="macro-dot" style="background: ${MACRO_COLORS.sugar.primary};"></span>Sugar</td>
            <td>${formatNumber(totalNutrition.sugar || 0)} g</td>
          </tr>
        </table>
      </div>

      <!-- AI Tips -->
      ${aiTips ? `
        <div class="glass-card no-press" style="border-left: 3px solid var(--accent-primary);">
          <div style="display: flex; gap: var(--space-sm); align-items: start;">
            <span style="font-size: 20px;">💡</span>
            <p style="font-size: var(--fs-sm); color: var(--text-secondary); line-height: var(--lh-relaxed);">${escapeHtml(aiTips)}</p>
          </div>
        </div>
      ` : ''}

      <!-- Action Buttons -->
      <div style="display: flex; gap: var(--space-md);">
        <button class="btn btn-primary flex-1" id="btn-save-meal">
          ✓ Save Meal
        </button>
        <button class="btn btn-secondary" id="btn-save-favorite" title="Save as favorite">
          ⭐
        </button>
      </div>
    </div>
  `;

  container.classList.add('visible');
}

// ── Render History View ──
export function renderHistoryView(selectedDate, mealsOnDate, allMeals, goals) {
  const view = document.getElementById('view-history');
  const now = new Date(selectedDate + 'T00:00:00');
  const year = now.getFullYear();
  const month = now.getMonth();
  const monthName = now.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });

  // Get dates with data
  const datesWithData = new Set(allMeals.map(m => m.date));

  // Build calendar
  const firstDay = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const today = getToday();

  let calendarHTML = '';
  const dayLabels = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
  calendarHTML += dayLabels.map(d => `<div class="calendar-header-cell">${d}</div>`).join('');

  // Empty cells before first day
  for (let i = 0; i < firstDay; i++) {
    calendarHTML += `<div class="calendar-day other-month"></div>`;
  }

  for (let d = 1; d <= daysInMonth; d++) {
    const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
    const isToday = dateStr === today;
    const isSelected = dateStr === selectedDate;
    const hasData = datesWithData.has(dateStr);

    let classes = 'calendar-day';
    if (isToday) classes += ' today';
    if (isSelected) classes += ' selected';
    if (hasData) classes += ' has-data';

    calendarHTML += `<div class="${classes}" onclick="window.app.selectDate('${dateStr}')">${d}</div>`;
  }

  // Totals for selected day
  const totals = sumNutrition(mealsOnDate);

  // Weekly chart data
  const weekData = getWeekChartData(selectedDate, allMeals);

  view.innerHTML = `
    <div class="stagger-in" style="display: flex; flex-direction: column; gap: var(--space-base);">
      <!-- Calendar -->
      <div class="glass-card no-press">
        <div class="calendar-nav">
          <button class="calendar-nav-btn" onclick="window.app.changeMonth(-1)">◀</button>
          <span class="calendar-month-label">${monthName}</span>
          <button class="calendar-nav-btn" onclick="window.app.changeMonth(1)">▶</button>
        </div>
        <div class="calendar-grid">
          ${calendarHTML}
        </div>
      </div>

      <!-- Day Summary -->
      <div class="glass-card no-press">
        <h4 style="margin-bottom: var(--space-md);">${formatDateDisplay(selectedDate)}</h4>
        ${mealsOnDate.length > 0 ? `
          <div class="grid-2" style="margin-bottom: var(--space-md);">
            <div style="text-align: center;">
              <div style="font-size: var(--fs-2xl); font-weight: var(--fw-bold); color: var(--accent-primary); font-family: var(--font-heading);">${formatNumber(totals.calories)}</div>
              <div style="font-size: var(--fs-xs); color: var(--text-tertiary);">Calories</div>
            </div>
            <div style="text-align: center;">
              <div style="font-size: var(--fs-2xl); font-weight: var(--fw-bold); font-family: var(--font-heading);">${mealsOnDate.length}</div>
              <div style="font-size: var(--fs-xs); color: var(--text-tertiary);">Meals logged</div>
            </div>
          </div>
          <div class="grid-3">
            <div style="text-align: center;">
              <div style="font-weight: var(--fw-semibold); color: ${MACRO_COLORS.protein.primary};">${formatNumber(totals.protein)}g</div>
              <div style="font-size: var(--fs-xs); color: var(--text-tertiary);">Protein</div>
            </div>
            <div style="text-align: center;">
              <div style="font-weight: var(--fw-semibold); color: ${MACRO_COLORS.carbs.primary};">${formatNumber(totals.carbs)}g</div>
              <div style="font-size: var(--fs-xs); color: var(--text-tertiary);">Carbs</div>
            </div>
            <div style="text-align: center;">
              <div style="font-weight: var(--fw-semibold); color: ${MACRO_COLORS.fat.primary};">${formatNumber(totals.fat)}g</div>
              <div style="font-size: var(--fs-xs); color: var(--text-tertiary);">Fat</div>
            </div>
          </div>
        ` : `
          <div class="empty-state" style="padding: var(--space-lg) 0;">
            <div class="empty-state-icon" style="font-size: 32px;">📭</div>
            <div class="empty-state-text">No meals on this day</div>
          </div>
        `}
      </div>

      <!-- Weekly Trend -->
      <div class="glass-card no-press">
        <h4 style="margin-bottom: var(--space-md);">Weekly Calories</h4>
        <canvas id="weekly-chart"></canvas>
      </div>

      <!-- Meals on this day -->
      ${mealsOnDate.length > 0 ? `
        <div class="glass-card no-press" style="padding: 0; overflow: hidden;">
          ${mealsOnDate.map(m => renderMealCard(m)).join('')}
        </div>
      ` : ''}
    </div>
  `;

  // Draw weekly chart
  const weeklyCanvas = document.getElementById('weekly-chart');
  if (weeklyCanvas) {
    const parentWidth = weeklyCanvas.parentElement.clientWidth - 32;
    drawWeeklyChart(weeklyCanvas, weekData, {
      width: parentWidth > 0 ? parentWidth : 300,
      height: 140,
      goalLine: goals.calories
    });
  }
}

function getWeekChartData(dateStr, allMeals) {
  const date = new Date(dateStr + 'T00:00:00');
  const dayOfWeek = date.getDay();
  const weekStart = new Date(date);
  weekStart.setDate(date.getDate() - dayOfWeek);

  const today = getToday();
  const dayLabels = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

  return dayLabels.map((label, i) => {
    const d = new Date(weekStart);
    d.setDate(weekStart.getDate() + i);
    const ds = formatDate(d);
    const dayMeals = allMeals.filter(m => m.date === ds);
    const total = sumNutrition(dayMeals);
    return {
      label,
      value: total.calories,
      isToday: ds === today
    };
  });
}

// ── Render Chat View ──
export function renderChatView(messages) {
  const view = document.getElementById('view-chat');

  view.innerHTML = `
    <div class="chat-container">
      <div class="chat-messages hide-scrollbar" id="chat-messages">
        ${messages.length === 0 ? `
          <div style="text-align: center; padding: var(--space-2xl) var(--space-base);">
            <div style="font-size: 48px; margin-bottom: var(--space-base);">🤖</div>
            <h3 style="margin-bottom: var(--space-sm);">NutriSnap AI</h3>
            <p style="font-size: var(--fs-sm); color: var(--text-tertiary); max-width: 260px; margin: 0 auto var(--space-lg);">
              Ask me anything about nutrition, your diet, or food recommendations!
            </p>
            <div style="display: flex; flex-direction: column; gap: var(--space-sm); max-width: 280px; margin: 0 auto;">
              <button class="btn btn-secondary btn-sm chat-suggestion" data-msg="What should I eat to get more protein?">
                💪 More protein ideas
              </button>
              <button class="btn btn-secondary btn-sm chat-suggestion" data-msg="How am I doing on my diet today?">
                📊 Today's diet summary
              </button>
              <button class="btn btn-secondary btn-sm chat-suggestion" data-msg="Suggest a healthy snack under 200 calories">
                🥗 Healthy snack ideas
              </button>
            </div>
          </div>
        ` : messages.map(m => `
          <div class="chat-bubble ${m.role}">
            ${formatChatContent(m.content)}
            <span class="chat-time">${formatTime(m.timestamp)}</span>
          </div>
        `).join('')}
      </div>
      <div class="chat-input-container">
        <input type="text" class="chat-input" id="chat-input" placeholder="Ask about nutrition..." />
        <button class="chat-send-btn" id="btn-send-chat">➤</button>
      </div>
    </div>
  `;

  // Scroll to bottom
  const chatMessages = document.getElementById('chat-messages');
  if (chatMessages) {
    chatMessages.scrollTop = chatMessages.scrollHeight;
  }
}

export function appendChatMessage(message) {
  const chatMessages = document.getElementById('chat-messages');
  if (!chatMessages) return;

  // Remove welcome message if it's the first real message
  const welcome = chatMessages.querySelector('[style*="text-align: center"]');
  if (welcome) welcome.remove();

  const bubble = document.createElement('div');
  bubble.className = `chat-bubble ${message.role} bounce-in`;
  bubble.innerHTML = `
    ${formatChatContent(message.content)}
    <span class="chat-time">${formatTime(message.timestamp)}</span>
  `;

  chatMessages.appendChild(bubble);
  chatMessages.scrollTop = chatMessages.scrollHeight;
}

export function showChatTyping() {
  const chatMessages = document.getElementById('chat-messages');
  if (!chatMessages) return;

  const typing = document.createElement('div');
  typing.className = 'chat-bubble assistant';
  typing.id = 'chat-typing';
  typing.innerHTML = `
    <div class="chat-typing">
      <span></span><span></span><span></span>
    </div>
  `;

  chatMessages.appendChild(typing);
  chatMessages.scrollTop = chatMessages.scrollHeight;
}

export function removeChatTyping() {
  const typing = document.getElementById('chat-typing');
  if (typing) typing.remove();
}

// ── Render Settings View ──
export function renderSettingsView(settings, goals) {
  const view = document.getElementById('view-settings');
  const theme = settings.theme || 'dark';
  const apiKeySet = !!settings.apiKey;

  view.innerHTML = `
    <div class="stagger-in" style="display: flex; flex-direction: column; gap: var(--space-sm);">
      <h2 style="margin-bottom: var(--space-md);">Settings</h2>

      <!-- API Key -->
      <div class="settings-group">
        <div class="settings-group-title">AI Configuration</div>
        <div class="glass-card no-press">
          <div style="margin-bottom: var(--space-md);">
            <label style="font-weight: var(--fw-medium); display: block; margin-bottom: var(--space-sm);">Gemini API Key</label>
            <div style="display: flex; gap: var(--space-sm);">
              <input type="password" id="input-api-key" value="${settings.apiKey || ''}"
                placeholder="Enter your API key" style="flex: 1;" />
              <button class="btn btn-primary btn-sm" id="btn-save-api-key">Save</button>
            </div>
            <p style="font-size: var(--fs-xs); color: var(--text-tertiary); margin-top: var(--space-sm);">
              Get a free key at <a href="https://aistudio.google.com/" target="_blank" rel="noopener">Google AI Studio</a>
            </p>
            ${apiKeySet ? '<p style="font-size: var(--fs-xs); color: var(--accent-primary); margin-top: 4px;">✓ API key configured</p>' : ''}
          </div>
        </div>
      </div>

      <!-- Daily Goals -->
      <div class="settings-group">
        <div class="settings-group-title">Daily Goals</div>
        <div class="glass-card no-press">
          <div class="goal-input-group">
            <label>🔥 Calories</label>
            <input type="number" id="goal-calories" value="${goals.calories}" min="500" max="10000" step="50" />
            <span class="goal-unit">kcal</span>
          </div>
          <div class="goal-input-group">
            <label>💪 Protein</label>
            <input type="number" id="goal-protein" value="${goals.protein}" min="10" max="500" step="5" />
            <span class="goal-unit">g</span>
          </div>
          <div class="goal-input-group">
            <label>🌾 Carbs</label>
            <input type="number" id="goal-carbs" value="${goals.carbs}" min="10" max="1000" step="10" />
            <span class="goal-unit">g</span>
          </div>
          <div class="goal-input-group">
            <label>🥑 Fat</label>
            <input type="number" id="goal-fat" value="${goals.fat}" min="10" max="300" step="5" />
            <span class="goal-unit">g</span>
          </div>
          <div class="goal-input-group">
            <label>🥦 Fiber</label>
            <input type="number" id="goal-fiber" value="${goals.fiber}" min="5" max="100" step="5" />
            <span class="goal-unit">g</span>
          </div>
          <div class="goal-input-group">
            <label>🍬 Sugar</label>
            <input type="number" id="goal-sugar" value="${goals.sugar}" min="5" max="200" step="5" />
            <span class="goal-unit">g</span>
          </div>
          <button class="btn btn-primary btn-block" id="btn-save-goals" style="margin-top: var(--space-md);">
            Save Goals
          </button>
        </div>
      </div>

      <!-- Appearance -->
      <div class="settings-group">
        <div class="settings-group-title">Appearance</div>
        <div class="glass-card no-press">
          <div class="settings-item">
            <div>
              <div class="settings-item-label">Dark Mode</div>
              <div class="settings-item-desc">Toggle between dark and light theme</div>
            </div>
            <label class="toggle">
              <input type="checkbox" id="toggle-theme" ${theme === 'dark' ? 'checked' : ''} />
              <span class="toggle-slider"></span>
            </label>
          </div>
        </div>
      </div>

      <!-- Data -->
      <div class="settings-group">
        <div class="settings-group-title">Data</div>
        <div class="glass-card no-press">
          <div class="settings-item" style="border: none;">
            <div>
              <div class="settings-item-label">Export Data</div>
              <div class="settings-item-desc">Download your meal history as CSV</div>
            </div>
            <button class="btn btn-secondary btn-sm" id="btn-export-csv">📤 Export</button>
          </div>
          <div class="settings-item" style="border: none;">
            <div>
              <div class="settings-item-label">Storage Used</div>
              <div class="settings-item-desc">Photos, meals and your API key on this device. "Evictable" means iOS may clear it after about a week unused — install to the Home Screen to keep it.</div>
            </div>
            <span id="storage-estimate" style="font-size: var(--fs-sm); color: var(--text-tertiary);">Checking...</span>
          </div>
          <div class="settings-item" style="border: none;">
            <div>
              <div class="settings-item-label">Clear Chat History</div>
              <div class="settings-item-desc">Delete all AI chat messages</div>
            </div>
            <button class="btn btn-danger btn-sm" id="btn-clear-chat">🗑️ Clear</button>
          </div>
        </div>
      </div>

      <!-- Install PWA -->
      <div class="settings-group">
        <div class="settings-group-title">Install App</div>
        <div class="pwa-prompt">
          <div class="pwa-prompt-title">📱 Add to Home Screen</div>
          <div class="pwa-prompt-steps">
            <ol>
              <li>Open this page in <strong>Safari</strong></li>
              <li>Tap the <strong>Share</strong> button (□↑)</li>
              <li>Scroll down and tap <strong>"Add to Home Screen"</strong></li>
              <li>Tap <strong>"Add"</strong> — done!</li>
            </ol>
          </div>
        </div>
      </div>

      <!-- About -->
      <div style="text-align: center; padding: var(--space-lg); opacity: 0.5;">
        <p style="font-size: var(--fs-xs);">NutriSnap v1.0</p>
        <p style="font-size: var(--fs-xs);">Powered by Google Gemini AI</p>
      </div>
    </div>
  `;
}

// ── Modal Helpers ──
export function showModal(title, content) {
  const backdrop = document.getElementById('modal-backdrop');
  const modalContent = document.getElementById('modal-inner');

  modalContent.innerHTML = `
    <div class="modal-handle"></div>
    <div class="modal-title">${title}</div>
    ${content}
  `;

  backdrop.classList.add('visible');

  // Close on backdrop click
  backdrop.onclick = (e) => {
    if (e.target === backdrop) closeModal();
  };
}

export function closeModal() {
  const backdrop = document.getElementById('modal-backdrop');
  backdrop.classList.remove('visible');
}

// ── Show Meal Detail Modal ──
export function showMealDetailModal(meal, photoBlob) {
  const icon = MEAL_ICONS[meal.mealType] || '🍽️';
  const label = MEAL_LABELS[meal.mealType] || meal.mealType;
  const items = meal.foodItems || [];

  const photoURL = photoBlob ? URL.createObjectURL(photoBlob) : null;
  const photoHTML = photoURL
    ? `<div style="margin-bottom: var(--space-md);">
        <img id="meal-detail-photo" src="${photoURL}" alt="Photo of this meal"
             style="width: 100%; border-radius: var(--radius-lg); max-height: 200px; object-fit: cover;" />
       </div>`
    : '';

  const content = `
    <div style="display: flex; flex-direction: column; gap: var(--space-base);">
      ${photoHTML}
      <div style="display: flex; align-items: center; gap: var(--space-md);">
        <span style="font-size: 32px;">${icon}</span>
        <div>
          <div style="font-weight: var(--fw-semibold);">${label}</div>
          <div style="font-size: var(--fs-sm); color: var(--text-tertiary);">${formatTime(meal.timestamp)}</div>
        </div>
        ${meal.healthScore ? `
          <div class="health-score" style="margin-left: auto;">
            ${getHealthScoreEmoji(meal.healthScore)} ${meal.healthScore}/10
          </div>
        ` : ''}
      </div>

      <!-- Food Items -->
      ${items.length > 0 ? `
        <div>
          <h4 style="margin-bottom: var(--space-sm); font-size: var(--fs-base);">Food Items</h4>
          ${items.map(item => `
            <div class="food-item-row">
              <div>
                <div class="food-item-name">${escapeHtml(item.name)}</div>
                <div class="food-item-serving">${escapeHtml(item.servingSize || '')}</div>
              </div>
              <div class="food-item-cals">${formatNumber(item.calories)} kcal</div>
            </div>
          `).join('')}
        </div>
      ` : ''}

      <!-- Nutrition -->
      ${meal.nutrition ? `
        <table class="nutrition-table">
          <tr><td><span class="macro-dot" style="background: ${MACRO_COLORS.calories.primary};"></span>Calories</td><td>${formatNumber(meal.nutrition.calories)} kcal</td></tr>
          <tr><td><span class="macro-dot" style="background: ${MACRO_COLORS.protein.primary};"></span>Protein</td><td>${formatNumber(meal.nutrition.protein)} g</td></tr>
          <tr><td><span class="macro-dot" style="background: ${MACRO_COLORS.carbs.primary};"></span>Carbs</td><td>${formatNumber(meal.nutrition.carbs)} g</td></tr>
          <tr><td><span class="macro-dot" style="background: ${MACRO_COLORS.fat.primary};"></span>Fat</td><td>${formatNumber(meal.nutrition.fat)} g</td></tr>
          <tr><td><span class="macro-dot" style="background: ${MACRO_COLORS.fiber.primary};"></span>Fiber</td><td>${formatNumber(meal.nutrition.fiber || 0)} g</td></tr>
          <tr><td><span class="macro-dot" style="background: ${MACRO_COLORS.sugar.primary};"></span>Sugar</td><td>${formatNumber(meal.nutrition.sugar || 0)} g</td></tr>
        </table>
      ` : ''}

      <!-- AI Tips -->
      ${meal.aiTips ? `
        <div style="border-left: 3px solid var(--accent-primary); padding-left: var(--space-md);">
          <p style="font-size: var(--fs-sm); color: var(--text-secondary);">💡 ${escapeHtml(meal.aiTips)}</p>
        </div>
      ` : ''}

      <!-- Actions -->
      <div style="display: flex; gap: var(--space-md);">
        <button class="btn btn-danger flex-1" onclick="window.app.deleteMealAndRefresh('${meal.id}')">
          🗑️ Delete
        </button>
        <button class="btn btn-secondary flex-1" onclick="window.app.closeModal()">
          Close
        </button>
      </div>
    </div>
  `;

  showModal(`${icon} ${label}`, content);

  if (photoURL) revokeWhenLoaded(document.getElementById('meal-detail-photo'), photoURL);
}

// ── Object URL Lifetime ──
// An object URL pins its blob in memory until it is revoked or the document
// unloads. Meal photos are full-size and history gets tapped repeatedly, so
// without this every tap leaks another one. Revoking on load rather than
// straight after assigning `src` is deliberate — the image has to have read
// the URL before it goes away.
export function revokeWhenLoaded(img, url) {
  if (!img) {
    URL.revokeObjectURL(url);
    return;
  }
  const release = () => URL.revokeObjectURL(url);
  img.addEventListener('load', release, { once: true });
  img.addEventListener('error', release, { once: true });
}

// ── Favorites Modal ──
export function showFavoritesModal(favorites, onSelect) {
  const content = favorites.length > 0 ? `
    <div style="display: flex; flex-direction: column; gap: var(--space-sm);">
      ${favorites.map(fav => `
        <div class="favorite-card">
          <div class="favorite-info">
            <div class="favorite-name">${escapeHtml(fav.name)}</div>
            <div class="favorite-macros">${formatNumber(fav.nutrition?.calories)} kcal · ${formatNumber(fav.nutrition?.protein)}g P · ${formatNumber(fav.nutrition?.carbs)}g C · ${formatNumber(fav.nutrition?.fat)}g F</div>
          </div>
          <div class="favorite-actions">
            <button class="btn btn-primary btn-sm" onclick="window.app.addFavoriteAsMeal('${fav.id}')">+ Add</button>
            <button class="btn btn-danger btn-sm" onclick="window.app.removeFavorite('${fav.id}')">✗</button>
          </div>
        </div>
      `).join('')}
    </div>
  ` : `
    <div class="empty-state">
      <div class="empty-state-icon">⭐</div>
      <div class="empty-state-title">No favorites yet</div>
      <div class="empty-state-text">Save a meal as favorite after scanning it</div>
    </div>
  `;

  showModal('⭐ Favorites', content);
}

// ── Manual Add Modal ──
export function showManualAddModal() {
  const content = `
    <div style="display: flex; flex-direction: column; gap: var(--space-base);">
      <p style="font-size: var(--fs-sm); color: var(--text-secondary);">
        Describe what you ate and the AI will estimate the nutrition.
      </p>
      <textarea class="text-input-area" id="manual-food-input" placeholder="e.g., 2 eggs, toast with butter, and a glass of orange juice" rows="3"></textarea>

      <div class="meal-type-selector" id="manual-meal-type">
        <button class="meal-type-option active" data-type="breakfast">🌅 Breakfast</button>
        <button class="meal-type-option" data-type="lunch">☀️ Lunch</button>
        <button class="meal-type-option" data-type="dinner">🌙 Dinner</button>
        <button class="meal-type-option" data-type="snack">🍿 Snack</button>
      </div>

      <button class="btn btn-primary btn-block" id="btn-manual-analyze">
        🔍 Analyze & Save
      </button>
    </div>
  `;

  showModal('✏️ Add Meal Manually', content);

  // Setup meal type selector
  setupMealTypeSelector('manual-meal-type');
}

// ── Utility ──
function getGreeting() {
  const h = new Date().getHours();
  if (h < 12) return 'Good morning';
  if (h < 17) return 'Good afternoon';
  return 'Good evening';
}

export function setupMealTypeSelector(containerId) {
  const container = document.getElementById(containerId);
  if (!container) return;

  container.querySelectorAll('.meal-type-option').forEach(btn => {
    btn.addEventListener('click', () => {
      container.querySelectorAll('.meal-type-option').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
    });
  });
}

export function getSelectedMealType(containerId) {
  const container = document.getElementById(containerId);
  if (!container) return 'snack';
  const active = container.querySelector('.meal-type-option.active');
  return active ? active.dataset.type : 'snack';
}
