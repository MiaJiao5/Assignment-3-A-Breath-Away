# A Breath Away

A small, dreamy escape: answer three gentle questions, wander around a planet with a fluffy companion, sit wherever you like, and let a thought float into the stars.

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

Each planet opens with a short bilingual guide covering movement, sitting, and messages. Confirm the guide to enable movement; the language switch stays accessible while reading. Before sitting, the movement panel contains only a 120px joystick and a short instruction. Use the joystick, WASD, or arrow keys to walk the character across the planet while the globe rolls gently in the opposite direction. Right/left walking rolls the surface left/right; forward/backward walking rolls it backward/forward. The character, landmarks, and contact shadow share the same surface transform, so feet stay aligned in every direction. Walking continues around the entire sphere without artificial borders. The camera follows the local surface frame so the companion remains visible through full circuits and pole crossings.

A softly glowing curved trail and an arch over the Listening Stone guide the first walk on each planet. Walk closer and tap the stone to sit, or tap the companion to sit anywhere. There is no persistent Sit or Choose a Planet button while wandering. Sitting cancels movement and smoothly brings the camera behind the companion, looking over its back toward the nearby horizon. The trail fades after the first rest. Resume Wandering restores movement and the wider view. Reduced-motion preferences skip camera animation.

The language control remains available. The Sound On / mute toggle has been removed; sitting still starts the ambient music. Leave for Now appears only after three continuous seconds of sitting, disappears when standing, and is absent from onboarding and the questionnaire. Language changes do not reset this timer. Message input and Let It Float appear only while sitting; standing hides them while preserving the draft. Leave for Now opens the farewell screen. Take a Little Calm With You returns to the welcome screen; Visit Another Planet opens the planet picker. The portal is also available by walking close and tapping it.


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
```

The tests use an installed Google Chrome in headless mode. Set `BROWSER_PATH` to another Chromium browser executable if needed, `APP_URL` for a different server URL, or `PLAYWRIGHT_MODULE` for an existing Playwright module directory. The suites check both languages across every screen and panel, preference persistence and storage failures, input and questionnaire preservation, planet and character state, uninterrupted audio timers, localized feedback and accessible labels, and controls at mobile widths from 320 to 414 pixels. The movement/resting regression checks counter-rotation in all four directions, surface and shadow alignment, the joystick-only panel, initial glowing guidance, tapping the Listening Stone, the camera behind the seated companion, rest locking, and restoring movement. Screenshots are saved under tests/; generated images are ignored by Git.

See [PROCESS.md](PROCESS.md) for implementation and validation notes, and [CREDITS.md](CREDITS.md) for acknowledgements.
