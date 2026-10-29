# A Breath Away

A small, dreamy escape: answer three gentle questions, wander around a planet with a fluffy companion, sit beside the Listening Stone, and let a thought float into the stars.

## Run locally

Use Node.js 22.18 or newer (also required for the browser test's native TypeScript imports).

```sh
npm install
npm run dev
```

Open http://localhost:3000. The experience runs in the browser; no API key or backend service is needed. WebGL supports the planet scene, and Web Audio generates the music and ambient sounds. Headphones are optional.

```sh
npm run lint
npm run build
npm run preview
```

## Explore

Select an answer and press Continue. Back lets you revisit answers; Skip and Wander goes directly to a planet. Drag the planet, use the joystick and movement buttons, or use WASD / arrow keys. Find the Listening Stone to sit and listen, choose another planet, or write a thought and press Let It Float. Leave for Now opens the farewell screen. Take a Little Calm With You returns to the welcome screen; Visit Another Planet opens the planet picker.

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
```

The test uses an installed Google Chrome in headless mode. Set `BROWSER_PATH` to another Chromium browser executable if needed, `APP_URL` for a different server URL, or `PLAYWRIGHT_MODULE` for an existing Playwright module directory. The suite checks both languages across every screen and panel, preference persistence and storage failures, input and questionnaire preservation, planet and character state, uninterrupted audio timers, localized feedback and accessible labels, and controls at mobile widths from 320 to 414 pixels. It saves a planet screenshot in tests/planet.png; generated images are ignored by Git.

See [PROCESS.md](PROCESS.md) for implementation and validation notes, and [CREDITS.md](CREDITS.md) for acknowledgements.
