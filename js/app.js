/* ============================================
   NutriSnap — Main App Controller
   Initialization, routing, event handling
   ============================================ */

import { initDB, saveMeal, getMealsByDate, getAllMeals, getMeal, deleteMeal as dbDeleteMeal,
         getGoals, saveGoals, getSetting, saveSetting, getAllSettings,
         saveFavorite, getFavorites, deleteFavorite,
         saveChatMessage, getChatHistory, clearChatHistory,
         exportToCSV, getMealPhoto } from './db.js';
import { setApiKey, analyzeFood, analyzeFoodByText, chatWithAI, validateApiKey } from './gemini.js';
import { startCamera, stopCamera, capturePhoto, processImageFile, isCameraAvailable } from './camera.js';
import { renderDashboard, renderScanView, renderHistoryView, renderChatView,
         renderSettingsView, renderScanResults, showToast, showModal, closeModal,
         showMealDetailModal, showFavoritesModal, showManualAddModal,
         setupMealTypeSelector, getSelectedMealType,
         appendChatMessage, showChatTyping, removeChatTyping } from './ui.js';
import { getToday, formatDate, sumNutrition, blobToBase64 } from './utils.js';

// ── App State ──
const state = {
  currentTab: 'dashboard',
  selectedDate: getToday(),
  calendarMonth: new Date().getMonth(),
  calendarYear: new Date().getFullYear(),
  cameraActive: false,
  currentPhoto: null, // { blob, base64 }
  currentAnalysis: null,
  goals: null,
  settings: {}
};

// ── Initialize App ──
async function init() {
  try {
    // Initialize database
    await initDB();

    // Load settings
    state.settings = await getAllSettings();
    state.goals = await getGoals();

    // Apply theme
    const theme = state.settings.theme || 'dark';
    document.documentElement.setAttribute('data-theme', theme);

    // API key comes from device storage only. It is never bundled with
    // the app, because a static site cannot hold a secret.
    if (state.settings.apiKey) {
      setApiKey(state.settings.apiKey);
      hideOnboarding();
      await renderCurrentView();
    } else {
      showOnboarding();
    }

    // Setup navigation
    setupNavigation();

    // Register service worker
    registerServiceWorker();

  } catch (error) {
    console.error('Failed to initialize app:', error);
    showToast('Failed to initialize app. Please refresh.', 'error');
  }
}

// ── Onboarding ──
function showOnboarding() {
  const overlay = document.getElementById('onboarding');
  overlay.classList.remove('hidden');

  const btn = document.getElementById('btn-onboarding-save');
  const input = document.getElementById('onboarding-api-key');
  const skipBtn = document.getElementById('btn-onboarding-skip');

  btn.onclick = async () => {
    const key = input.value.trim();
    if (!key) {
      showToast('Please enter your API key', 'error');
      input.classList.add('shake');
      setTimeout(() => input.classList.remove('shake'), 500);
      return;
    }

    btn.disabled = true;
    btn.textContent = 'Validating...';
    console.log('Validating API key...');

    try {
      const valid = await validateApiKey(key);
      if (valid) {
        await saveSetting('apiKey', key);
        state.settings.apiKey = key;
        setApiKey(key);
        showToast('API key saved! Welcome to NutriSnap 🎉', 'success');
        hideOnboarding();
        await renderCurrentView();
      } else {
        // Still save the key — user can try it and change later in settings
        console.warn('API key validation failed, saving anyway');
        await saveSetting('apiKey', key);
        state.settings.apiKey = key;
        setApiKey(key);
        showToast('Key saved, but validation failed — check your key in Settings if AI features don\'t work', 'info', 5000);
        hideOnboarding();
        await renderCurrentView();
      }
    } catch (err) {
      console.error('Onboarding error:', err);
      // Save anyway so user can get into the app
      await saveSetting('apiKey', key);
      state.settings.apiKey = key;
      setApiKey(key);
      showToast('Key saved! If AI features don\'t work, check your key in Settings.', 'info', 5000);
      hideOnboarding();
      await renderCurrentView();
    }

    btn.disabled = false;
    btn.textContent = 'Get Started';
  };

  skipBtn.onclick = async () => {
    hideOnboarding();
    await renderCurrentView();
    showToast('You can add your API key later in Settings', 'info');
  };
}

function hideOnboarding() {
  const overlay = document.getElementById('onboarding');
  overlay.classList.add('hidden');
}

// ── Navigation ──
function setupNavigation() {
  document.querySelectorAll('.nav-item').forEach(item => {
    item.addEventListener('click', () => {
      const tab = item.dataset.tab;
      if (tab) switchTab(tab);
    });
  });
}

async function switchTab(tab) {
  // Stop camera when leaving scan
  if (state.currentTab === 'scan' && tab !== 'scan') {
    stopCamera();
    state.cameraActive = false;
  }

  state.currentTab = tab;

  // Update nav active state
  document.querySelectorAll('.nav-item').forEach(item => {
    item.classList.toggle('active', item.dataset.tab === tab);
  });

  // Hide all views, show current
  document.querySelectorAll('.view').forEach(v => v.classList.remove('active'));
  const view = document.getElementById(`view-${tab}`);
  if (view) view.classList.add('active');

  await renderCurrentView();
}

async function renderCurrentView() {
  const goals = state.goals || await getGoals();

  switch (state.currentTab) {
    case 'dashboard': {
      const todayMeals = await getMealsByDate(getToday());
      renderDashboard(todayMeals, goals);

      // Setup quick action buttons
      setTimeout(() => {
        document.getElementById('btn-manual-add')?.addEventListener('click', () => {
          showManualAddModal();
          setupManualAddHandlers();
        });
        document.getElementById('btn-favorites')?.addEventListener('click', async () => {
          const favs = await getFavorites();
          showFavoritesModal(favs);
        });
      }, 50);
      break;
    }

    case 'scan': {
      renderScanView();
      setTimeout(() => setupScanHandlers(), 50);
      break;
    }

    case 'history': {
      const mealsOnDate = await getMealsByDate(state.selectedDate);
      const allMeals = await getAllMeals();
      renderHistoryView(state.selectedDate, mealsOnDate, allMeals, goals);
      break;
    }

    case 'chat': {
      const messages = await getChatHistory();
      renderChatView(messages);
      setTimeout(() => setupChatHandlers(), 50);
      break;
    }

    case 'settings': {
      state.settings = await getAllSettings();
      renderSettingsView(state.settings, goals);
      setTimeout(() => setupSettingsHandlers(), 50);
      break;
    }
  }
}

// ── Scan Handlers ──
function setupScanHandlers() {
  const captureBtn = document.getElementById('btn-capture');
  const galleryBtn = document.getElementById('btn-gallery');
  const retakeBtn = document.getElementById('btn-retake');
  const fileInput = document.getElementById('file-input');
  const analyzeTextBtn = document.getElementById('btn-analyze-text');

  // Meal type selector
  setupMealTypeSelector('meal-type-selector');

  // Camera / Capture
  captureBtn?.addEventListener('click', async () => {
    if (!state.cameraActive) {
      // Start camera
      const video = document.getElementById('camera-video');
      const placeholder = document.getElementById('camera-placeholder');
      const success = await startCamera(video);

      if (success) {
        state.cameraActive = true;
        placeholder.style.display = 'none';
        video.style.display = 'block';
        captureBtn.innerHTML = '📸';
      } else {
        showToast('Camera access denied. Try uploading from gallery.', 'error');
        // Fallback to file input
        fileInput?.click();
      }
    } else {
      // Capture photo
      try {
        const photo = await capturePhoto();
        state.currentPhoto = photo;
        showPreview(photo.blob);
        stopCamera();
        state.cameraActive = false;
        await analyzeCurrentPhoto();
      } catch (err) {
        showToast('Failed to capture photo', 'error');
      }
    }
  });

  // Gallery
  galleryBtn?.addEventListener('click', () => {
    fileInput?.click();
  });

  // File selected
  fileInput?.addEventListener('change', async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      const photo = await processImageFile(file);
      state.currentPhoto = photo;
      showPreview(photo.blob);
      stopCamera();
      state.cameraActive = false;
      await analyzeCurrentPhoto();
    } catch (err) {
      showToast('Failed to process image', 'error');
    }
  });

  // Retake
  retakeBtn?.addEventListener('click', () => {
    state.currentPhoto = null;
    state.currentAnalysis = null;
    const video = document.getElementById('camera-video');
    const previewImg = document.getElementById('preview-image');
    const scanResults = document.getElementById('scan-results');
    const retake = document.getElementById('btn-retake');
    const placeholder = document.getElementById('camera-placeholder');

    previewImg.style.display = 'none';
    scanResults.classList.remove('visible');
    scanResults.innerHTML = '';
    retake.style.display = 'none';
    placeholder.style.display = 'flex';
    video.style.display = 'none';
    state.cameraActive = false;
  });

  // Analyze text description
  analyzeTextBtn?.addEventListener('click', async () => {
    const desc = document.getElementById('food-description')?.value?.trim();
    if (!desc) {
      showToast('Please describe your meal first', 'error');
      return;
    }

    if (!state.settings.apiKey) {
      showToast('Please add your API key in Settings first', 'error');
      return;
    }

    showAnalysisLoading(true);

    try {
      const result = await analyzeFoodByText(desc);
      state.currentAnalysis = result;
      renderScanResults(result);
      setupResultHandlers();
    } catch (err) {
      showToast(err.message || 'Analysis failed', 'error');
    } finally {
      showAnalysisLoading(false);
    }
  });
}

function showPreview(blob) {
  const previewImg = document.getElementById('preview-image');
  const video = document.getElementById('camera-video');
  const retakeBtn = document.getElementById('btn-retake');
  const placeholder = document.getElementById('camera-placeholder');

  previewImg.src = URL.createObjectURL(blob);
  previewImg.style.display = 'block';
  video.style.display = 'none';
  retakeBtn.style.display = 'flex';
  placeholder.style.display = 'none';
}

async function analyzeCurrentPhoto() {
  if (!state.currentPhoto) return;

  if (!state.settings.apiKey) {
    showToast('Please add your API key in Settings first', 'error');
    return;
  }

  showAnalysisLoading(true);
  const scanLine = document.getElementById('scan-line');
  if (scanLine) scanLine.style.display = 'block';

  try {
    const result = await analyzeFood(state.currentPhoto.base64);
    state.currentAnalysis = result;
    renderScanResults(result);
    setupResultHandlers();
  } catch (err) {
    showToast(err.message || 'Failed to analyze food', 'error');
  } finally {
    showAnalysisLoading(false);
    if (scanLine) scanLine.style.display = 'none';
  }
}

function showAnalysisLoading(show) {
  const loader = document.getElementById('analysis-loading');
  if (loader) loader.style.display = show ? 'block' : 'none';
}

function setupResultHandlers() {
  const saveBtn = document.getElementById('btn-save-meal');
  const favBtn = document.getElementById('btn-save-favorite');

  saveBtn?.addEventListener('click', async () => {
    if (!state.currentAnalysis) return;

    const mealType = getSelectedMealType('meal-type-selector');

    try {
      await saveMeal({
        mealType,
        foodItems: state.currentAnalysis.foodItems,
        nutrition: state.currentAnalysis.totalNutrition,
        healthScore: state.currentAnalysis.healthScore,
        aiTips: state.currentAnalysis.aiTips,
        photoBlob: state.currentPhoto?.blob || null
      });

      showToast('Meal saved! 🎉', 'success');

      // Reset
      state.currentPhoto = null;
      state.currentAnalysis = null;
      switchTab('dashboard');
    } catch (err) {
      showToast('Failed to save meal', 'error');
    }
  });

  favBtn?.addEventListener('click', async () => {
    if (!state.currentAnalysis) return;

    const name = state.currentAnalysis.mealDescription || 
                 state.currentAnalysis.foodItems?.map(f => f.name).join(', ') ||
                 'Unnamed meal';

    try {
      await saveFavorite({
        name,
        foodItems: state.currentAnalysis.foodItems,
        nutrition: state.currentAnalysis.totalNutrition
      });
      showToast('Saved to favorites ⭐', 'success');
    } catch (err) {
      showToast('Failed to save favorite', 'error');
    }
  });
}

// ── Manual Add Handlers ──
function setupManualAddHandlers() {
  setTimeout(() => {
    setupMealTypeSelector('manual-meal-type');

    document.getElementById('btn-manual-analyze')?.addEventListener('click', async () => {
      const input = document.getElementById('manual-food-input');
      const desc = input?.value?.trim();
      if (!desc) {
        showToast('Please describe your meal', 'error');
        return;
      }

      if (!state.settings.apiKey) {
        showToast('Please add your API key in Settings first', 'error');
        return;
      }

      const btn = document.getElementById('btn-manual-analyze');
      btn.disabled = true;
      btn.textContent = '⏳ Analyzing...';

      try {
        const result = await analyzeFoodByText(desc);
        const mealType = getSelectedMealType('manual-meal-type');

        await saveMeal({
          mealType,
          foodItems: result.foodItems,
          nutrition: result.totalNutrition,
          healthScore: result.healthScore,
          aiTips: result.aiTips
        });

        closeModal();
        showToast('Meal saved! 🎉', 'success');
        await renderCurrentView();
      } catch (err) {
        showToast(err.message || 'Analysis failed', 'error');
      } finally {
        btn.disabled = false;
        btn.textContent = '🔍 Analyze & Save';
      }
    });
  }, 100);
}

// ── Chat Handlers ──
function setupChatHandlers() {
  const input = document.getElementById('chat-input');
  const sendBtn = document.getElementById('btn-send-chat');

  const sendMessage = async () => {
    const text = input?.value?.trim();
    if (!text) return;

    if (!state.settings.apiKey) {
      showToast('Please add your API key in Settings first', 'error');
      return;
    }

    input.value = '';

    // Save & show user message
    const userMsg = await saveChatMessage({ role: 'user', content: text });
    appendChatMessage(userMsg);

    // Show typing indicator
    showChatTyping();

    try {
      // Get context
      const todayMeals = await getMealsByDate(getToday());
      const todayNutrition = sumNutrition(todayMeals);
      const goals = state.goals || await getGoals();

      const response = await chatWithAI(text, {
        todayNutrition,
        goals,
        recentMeals: todayMeals.slice(-5)
      });

      removeChatTyping();

      const assistantMsg = await saveChatMessage({ role: 'assistant', content: response });
      appendChatMessage(assistantMsg);
    } catch (err) {
      removeChatTyping();
      showToast(err.message || 'Failed to get AI response', 'error');
    }
  };

  sendBtn?.addEventListener('click', sendMessage);
  input?.addEventListener('keydown', (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  });

  // Chat suggestions
  document.querySelectorAll('.chat-suggestion')?.forEach(btn => {
    btn.addEventListener('click', () => {
      input.value = btn.dataset.msg;
      sendMessage();
    });
  });
}

// ── Settings Handlers ──
function setupSettingsHandlers() {
  // Save API Key
  document.getElementById('btn-save-api-key')?.addEventListener('click', async () => {
    const key = document.getElementById('input-api-key')?.value?.trim();
    if (!key) {
      showToast('Please enter an API key', 'error');
      return;
    }

    const btn = document.getElementById('btn-save-api-key');
    btn.disabled = true;
    btn.textContent = '...';

    const valid = await validateApiKey(key);
    if (valid) {
      await saveSetting('apiKey', key);
      state.settings.apiKey = key;
      setApiKey(key);
      showToast('API key saved ✓', 'success');
    } else {
      showToast('Invalid API key', 'error');
    }

    btn.disabled = false;
    btn.textContent = 'Save';
  });

  // Save Goals
  document.getElementById('btn-save-goals')?.addEventListener('click', async () => {
    const goals = {
      calories: parseInt(document.getElementById('goal-calories')?.value) || 2000,
      protein: parseInt(document.getElementById('goal-protein')?.value) || 150,
      carbs: parseInt(document.getElementById('goal-carbs')?.value) || 250,
      fat: parseInt(document.getElementById('goal-fat')?.value) || 65,
      fiber: parseInt(document.getElementById('goal-fiber')?.value) || 30,
      sugar: parseInt(document.getElementById('goal-sugar')?.value) || 50
    };

    await saveGoals(goals);
    state.goals = goals;
    showToast('Goals saved ✓', 'success');
  });

  // Theme Toggle
  document.getElementById('toggle-theme')?.addEventListener('change', async (e) => {
    const theme = e.target.checked ? 'dark' : 'light';
    document.documentElement.setAttribute('data-theme', theme);
    await saveSetting('theme', theme);
    state.settings.theme = theme;
  });

  // Export CSV
  document.getElementById('btn-export-csv')?.addEventListener('click', async () => {
    try {
      const csv = await exportToCSV();
      const blob = new Blob([csv], { type: 'text/csv' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `nutrisnap-export-${getToday()}.csv`;
      a.click();
      URL.revokeObjectURL(url);
      showToast('Data exported ✓', 'success');
    } catch (err) {
      showToast('Export failed', 'error');
    }
  });

  // Clear Chat
  document.getElementById('btn-clear-chat')?.addEventListener('click', async () => {
    if (confirm('Delete all chat messages?')) {
      await clearChatHistory();
      showToast('Chat history cleared', 'success');
    }
  });
}

// ── History Helpers ──
async function selectDate(dateStr) {
  state.selectedDate = dateStr;
  const d = new Date(dateStr + 'T00:00:00');
  state.calendarMonth = d.getMonth();
  state.calendarYear = d.getFullYear();
  await renderCurrentView();
}

async function changeMonth(delta) {
  state.calendarMonth += delta;
  if (state.calendarMonth > 11) {
    state.calendarMonth = 0;
    state.calendarYear++;
  } else if (state.calendarMonth < 0) {
    state.calendarMonth = 11;
    state.calendarYear--;
  }
  // Set selected date to first of the new month (or today if in current month)
  const today = new Date();
  if (state.calendarYear === today.getFullYear() && state.calendarMonth === today.getMonth()) {
    state.selectedDate = getToday();
  } else {
    state.selectedDate = `${state.calendarYear}-${String(state.calendarMonth + 1).padStart(2, '0')}-01`;
  }
  await renderCurrentView();
}

// ── Meal Detail ──
async function showMealDetail(mealId) {
  const meal = await getMeal(mealId);
  if (meal) {
    showMealDetailModal(meal);
  }
}

async function deleteMealAndRefresh(mealId) {
  if (confirm('Delete this meal?')) {
    await dbDeleteMeal(mealId);
    closeModal();
    showToast('Meal deleted', 'success');
    await renderCurrentView();
  }
}

// ── Favorites ──
async function addFavoriteAsMeal(favId) {
  const favs = await getFavorites();
  const fav = favs.find(f => f.id === favId);
  if (!fav) return;

  // Determine meal type by time of day
  const hour = new Date().getHours();
  let mealType = 'snack';
  if (hour < 10) mealType = 'breakfast';
  else if (hour < 14) mealType = 'lunch';
  else if (hour < 20) mealType = 'dinner';

  await saveMeal({
    mealType,
    foodItems: fav.foodItems,
    nutrition: fav.nutrition,
    notes: `From favorite: ${fav.name}`
  });

  closeModal();
  showToast('Meal added from favorites! 🎉', 'success');

  if (state.currentTab === 'dashboard') {
    await renderCurrentView();
  }
}

async function removeFavorite(favId) {
  await deleteFavorite(favId);
  showToast('Favorite removed', 'success');
  // Re-render favorites modal
  const favs = await getFavorites();
  showFavoritesModal(favs);
}

// ── Service Worker ──
function registerServiceWorker() {
  if (!('serviceWorker' in navigator)) return;

  // When a new service worker takes control, reload once so the user is
  // running the new code. Without this the page keeps the old modules
  // until it is manually closed and reopened.
  //
  // Only for genuine updates, though. On a first-ever install clients.claim()
  // also fires controllerchange even though there was no controller to
  // replace, and reloading there would race onboarding: the key is saved
  // only after validateApiKey's network round-trip, so a reload landing in
  // that window drops the key the user just typed.
  const hadController = !!navigator.serviceWorker.controller;
  let refreshing = false;
  navigator.serviceWorker.addEventListener('controllerchange', () => {
    if (!hadController || refreshing) return;
    refreshing = true;
    window.location.reload();
  });

  navigator.serviceWorker.register('./sw.js')
    .then((reg) => console.log('Service worker registered:', reg.scope))
    .catch((err) => console.error('Service worker registration failed:', err));
}

// ── Expose to Global (for onclick handlers in HTML) ──
window.app = {
  switchTab,
  selectDate,
  changeMonth,
  showMealDetail,
  deleteMealAndRefresh,
  closeModal: closeModal,
  addFavoriteAsMeal,
  removeFavorite
};

// ── Start App ──
document.addEventListener('DOMContentLoaded', init);
