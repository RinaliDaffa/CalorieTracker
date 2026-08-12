# 🥗 NutriSnap — Free AI Calorie Tracker

A completely free, AI-powered calorie tracker that runs as a Progressive Web App (PWA) on your iPhone. Take a photo of your food and get instant nutrition analysis powered by Google Gemini AI.

## ✨ Features

- 📸 **AI Food Scanner** — Take/upload food photos for instant nutrition breakdown
- 📊 **Daily Dashboard** — Track calories, protein, carbs, fat with animated progress rings
- 🍽️ **Meal Logging** — Organized by breakfast, lunch, dinner, snacks
- 💬 **AI Chat** — Personal nutrition assistant that knows your diet
- 📅 **History & Calendar** — Browse past days, see weekly trends
- 🎯 **Goal Setting** — Customizable daily calorie & macro targets
- ⭐ **Favorites** — Save frequent meals for one-tap logging
- ✏️ **Manual Entry** — Add meals by description when you don't have a photo
- 📤 **CSV Export** — Download your full meal history
- 🌙 **Dark & Light Mode** — Beautiful premium design
- 📱 **PWA** — Installable on iPhone, works offline

## 🚀 Quick Start

### 1. Get a Free API Key

1. Go to [Google AI Studio](https://aistudio.google.com/)
2. Sign in with your Google account (no credit card needed)
3. Click **"Get API Key"** → **"Create API Key"**
4. Copy the key

### 2. Run the App

The simplest way to run locally:

```bash
cd CalorieTracker
npx -y serve .
```

Then open `http://localhost:3000` in your browser.

### 3. Enter Your API Key

When the app opens, paste your Gemini API key and click "Get Started".

## 📱 Install on iPhone

1. Open the app URL in **Safari** (not Chrome!)
2. Tap the **Share** button (square with upward arrow ↑)
3. Scroll down and tap **"Add to Home Screen"**
4. Tap **"Add"** in the top right
5. The app icon appears on your home screen — tap to launch fullscreen!

## 🌐 Deploy for Free

To access from your iPhone, you need the app hosted over HTTPS. Here are free options:

### GitHub Pages (Recommended)

1. Push this folder to a GitHub repository
2. Go to Settings → Pages
3. Set source to "Deploy from branch" → `main` → `/ (root)`
4. Your app will be at `https://yourusername.github.io/CalorieTracker/`

### Netlify

1. Go to [netlify.com](https://www.netlify.com/) and sign up free
2. Drag-and-drop the `CalorieTracker` folder to deploy
3. Get your free `.netlify.app` URL

### Cloudflare Pages

1. Connect your GitHub repo at [pages.cloudflare.com](https://pages.cloudflare.com/)
2. Auto-deploys on every push

## 🏗️ Project Structure

```
CalorieTracker/
├── index.html          # App shell (single-page app)
├── manifest.json       # PWA manifest
├── sw.js               # Service worker (offline support)
├── css/
│   ├── index.css       # Design system & variables
│   ├── components.css  # UI component styles
│   └── animations.css  # Micro-animations
├── js/
│   ├── app.js          # Main controller & routing
│   ├── gemini.js       # Gemini AI API integration
│   ├── db.js           # IndexedDB persistence
│   ├── camera.js       # Camera & image handling
│   ├── charts.js       # Canvas progress rings & charts
│   ├── ui.js           # UI rendering
│   └── utils.js        # Helpers & constants
├── icons/
│   ├── icon-192.png
│   └── icon-512.png
└── README.md
```

## 💡 Tips

- **Best accuracy**: Take clear, well-lit photos of your food
- **Multiple items**: The AI can identify multiple food items in one photo
- **Ask the AI**: Use the chat to ask questions like "Am I getting enough protein today?"
- **Favorites**: Save meals you eat often — add them with one tap next time
- **Offline**: The app works offline for viewing your history and dashboard

## 🔒 Privacy

- All your data stays on your device (IndexedDB)
- No server, no database, no tracking
- Your API key is stored locally and only sent to Google's API
- On the free tier, Google may use API inputs to improve their products

## 📄 License

MIT — Free to use, modify, and share.
