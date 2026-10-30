# A Breath Away

A small, dreamy escape: answer three gentle questions, wander around a planet with a fluffy companion, rest by the Listening Stone, and let a thought float into the stars.

## Run locally

Use Node.js 22.18 or newer (also required for the browser test's native TypeScript imports).

```sh
npm install
npm run dev
```

Open http://localhost:3000. The experience runs in the browser; no API key or backend service is needed. WebGL supports the planet scene, and Web Audio generates the music and ambient sounds. Headphones are optional.

For live editing, keep the dev server running and change the files under `src/`. Vite updates the preview when you save. In VS Code, run **Simple Browser: Show** from the Command Palette, enter http://localhost:3000, and move that editor into a side-by-side group. A normal browser window works too. `dist/` contains generated build output; edit the source files rather than `dist/index.html`.

```sh
npm run lint
npm run build
npm run preview
```

## Explore

Questionnaire options show large A/B/C letters on the left with matching emoji in English and Chinese. Click an answer to advance automatically; the third answer takes you into the planet transition. Back lets you revisit answers; Skip and Wander goes directly to a planet.

Each planet opens with a short bilingual guide covering movement, sitting, and messages. Confirm the guide to enable movement; the language switch stays accessible while reading. Thoughts fade in gently and drift left to right over 24 seconds, with automatic thoughts spaced about ten seconds apart. The movement instruction appears above the planet, replacing its previous atmosphere subtitle. Before sitting, the bottom movement panel contains only a 120px joystick. Use the joystick, WASD, or arrow keys to walk the character across the planet while the globe rolls gently in the opposite direction. Right/left walking rolls the surface left/right; forward/backward walking rolls it backward/forward. The character, landmarks, and contact shadow share the same surface transform, so feet stay aligned in every direction. Walking continues around the entire sphere without artificial borders. The camera follows the local surface frame so the companion remains visible through full circuits and pole crossings.

A subtle cream-gold trail and a soft arch guide the first walk to the Listening Stone. Approaching it reveals Sit & Listen above the joystick. Click this button to sit; tapping the stone or companion does not sit automatically. The action fades away when walking farther from the stone, with separate arrival/departure distances to prevent flickering. There is no standalone Choose a Planet action. Sitting cancels movement and smoothly brings the camera behind the companion. The seated framing adapts to the available screen space, keeping the full globe, halo, and surface models visible above the controls. Floating thoughts occupy the sky above the companion. The trail disappears while seated. After Stand Up, a new trail points toward the portal. A physical clearance keeps the companion outside the stone, and its glow strengthens when approached. Stand Up restores movement and the walking camera. Reduced-motion preferences skip camera animation.

The language control remains available. The Sound On / mute toggle has been removed; sitting still starts the ambient music. After the first Stand Up, Leave for Now appears at the top left, mirroring the language switch. A one-time guide explains that leaving is now available whenever needed, including while walking, resting, or viewing a panel. It stays unlocked across subsequent planets until the experience is restarted. Message input and Let It Float fade in after five seconds of listening; standing hides them while preserving the draft. Leave for Now opens the farewell screen. Take a Little Calm With You returns to the welcome screen; Visit Another Planet opens the same portal journey available from the planet.

Walk near the portal to reveal Enter Portal above the joystick. A short starlight animation leads to a circular orbit of unvisited planets, drifting clockwise. Find My Next Planet starts a random draw that slows to a stop under the top pointer, briefly highlights the result, and automatically travels there. The first draw has three destinations; after two total arrivals it has two. With one unvisited planet left, the entry animation leads straight there without a draw. Visited planets are tracked for the current journey in memory, and cancelled transfers do not count as arrivals. After all four planets, Begin Another Journey opens the other three destinations again; restarting from the welcome screen also clears the route. Language changes preserve the orbit, chosen destination, and animation progress. Stay on This Planet or Escape cancels pending travel. The portal veil covers the whole app uniformly, with language and the unlocked exit still available above it.


## English and Simplified Chinese

The top-right **EN | 中文** switch is available on the welcome screen, questionnaire, transition, planet scenes, message area, planet picker, and farewell screen. Its selected segment is highlighted and exposes `aria-pressed`; its accessible group label is translated.

First visits always start in English, regardless of browser language. Only an explicit selection changes the language. The preference is saved under `a_breath_away_language` in localStorage and restored on later visits. Missing, invalid, or inaccessible storage defaults to English. If saving fails, switching still works for the current visit.

Changes appear immediately, preserving the scene, questionnaire answers, planet, character position, listening state, audio loops, and unfinished input. Built-in quotes and active feedback change language; user-written messages remain exactly as entered. Up to 30 released thoughts are saved locally under `brief_roaming_user_stardust_v1`. Nothing is uploaded by this application.

All interface copy lives in [translations.ts](src/i18n/translations.ts). [LanguageContext.tsx](src/i18n/LanguageContext.tsx) supplies the current dictionary. Planet IDs, mapping rules, colors, and audio configuration stay in the language-independent data and audio modules.

## Browser regression checks

Start the dev server in one terminal, then run:

```sh
npm install --no-save --package-lock=false playwright
node tests/i18n-browser.cjs
node tests/rest-browser.cjs
node tests/portal-discovery.cjs
node tests/seated-framing.cjs
```

The tests use an installed Google Chrome in headless mode. Set `BROWSER_PATH` to another Chromium browser executable if needed, `APP_URL` for a different server URL, or `PLAYWRIGHT_MODULE` for an existing Playwright module directory. The suites check both languages across every screen and panel, preference persistence and storage failures, input and questionnaire preservation, planet and character state, uninterrupted audio timers, localized feedback and accessible labels, and controls at mobile widths from 320 to 414 pixels. The movement/resting regression checks counter-rotation in all four directions, surface and shadow alignment, the joystick-only panel, initial glowing guidance, tapping the Listening Stone, the camera behind the seated companion, rest locking, and restoring movement. Screenshots are saved under tests/; generated images are ignored by Git.

The seated framing regression projects the full pulsing halo and model bounds into the camera view at mobile and desktop sizes. It checks that the bottom stays visible, thought lanes remain above the character, controls fit, and drafts survive resizing and language changes.

See [PROCESS.md](PROCESS.md) for implementation and validation notes, and [CREDITS.md](CREDITS.md) for acknowledgements.
