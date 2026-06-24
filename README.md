# 🚀 Asteroid Dodger — Space Survival

A fast-paced browser game where you pilot a rocket through an endless asteroid field. Built with React, Canvas 2D, and procedural audio — all in a single HTML file.

**🎮 [Play Now on GitHub Pages](#)** *(update this link after deploying)*

---

## 🕹️ How to Play

| Platform | Controls |
|----------|----------|
| **Desktop** | Arrow keys or WASD to move · ESC or P to pause · Enter/Space to start/restart |
| **Mobile** | Touch & drag to steer · Tap top-right corner to pause · Tap to start/restart |

**Goal:** Dodge asteroids as long as possible. Score increases over time and scales with difficulty. Get near-miss bonuses and build combos!

---

## ✨ Features

- **60fps canvas rendering** with DPR-aware scaling
- **Juicy feedback** — screen shake, particle explosions, engine glow, thrust flames, trail effects
- **Procedural audio** — explosion booms, combo chimes, start fanfare (Web Audio API, zero files)
- **Combo system** — every 5 consecutive dodges triggers a score bonus
- **Near-miss bonuses** — fly close to asteroids for extra points
- **Local high scores** — top 10 saved to localStorage
- **4 game states** — Start screen → Playing → Paused → Game Over with instant restart
- **Adaptive difficulty** — asteroids spawn faster and in larger groups over time
- **Responsive** — works on any screen size, desktop and mobile
- **Offline** — zero network requests, plays from `file://` too

---

## 🚀 Deploy to GitHub Pages (Play from Your Repo)

### Step 1: Create the Repository

```bash
# Create a new repo on GitHub, then:
git init
git add .
git commit -m "Initial commit: Asteroid Dodger game"
git branch -M main
git remote add origin https://github.com/YOUR_USERNAME/YOUR_REPO_NAME.git
git push -u origin main
```

### Step 2: Enable GitHub Pages

1. Go to your repo on GitHub
2. Click **Settings** → **Pages**
3. Under **Source**, select **GitHub Actions**
4. That's it! The included `.github/workflows/deploy.yml` will auto-deploy on every push to `main`

### Step 3: Play!

After the workflow runs (takes ~30 seconds), your game will be live at:

```
https://YOUR_USERNAME.github.io/YOUR_REPO_NAME/
```

Update the "Play Now" link at the top of this README with your URL.

### Manual Deploy (Alternative)

If you prefer to deploy manually without GitHub Actions:

```bash
# Build the game
npm run build

# Create a gh-pages branch with just the dist/ contents
npx gh-pages -d dist
```

Then in **Settings → Pages → Source**, select the `gh-pages` branch.

---

## 🛠️ Local Development

```bash
# Install dependencies
npm install

# Start dev server with hot reload
npm run dev

# Build for production
npm run build

# Preview production build
npm run preview
```

---

## 📁 Project Structure

```
src/
  game/
    engine.ts    # Game loop, physics, collision, particles, rendering
    audio.ts     # Procedural Web Audio API sound effects
    Game.tsx     # React canvas wrapper + input handling
  App.tsx        # Entry point
  index.css      # Global styles
  main.tsx       # React mount
index.html       # HTML shell
.github/
  workflows/
    deploy.yml   # GitHub Pages auto-deploy workflow
```

---

## 🔧 Tech Stack

- **React 19** + **TypeScript** — component shell
- **Canvas 2D** — all game rendering
- **Web Audio API** — procedural sound effects
- **Vite** + **vite-plugin-singlefile** — bundles to a single HTML file
- **Tailwind CSS** — utility styles
- **localStorage** — persistent high scores

---

## 🌍 Other Deployment Options

Since the build output is a single `dist/index.html` file, you can deploy it anywhere:

| Platform | How |
|----------|-----|
| **Netlify** | Drag & drop `dist/` folder at [netlify.com/drop](https://app.netlify.com/drop) |
| **Vercel** | Connect repo, auto-deploys |
| **Cloudflare Pages** | Connect repo, auto-deploys |
| **itch.io** | Upload `dist/index.html` as an HTML5 game |
| **Local** | Just open `dist/index.html` in a browser — works offline! |

---

## License

MIT — build whatever you want with it.
