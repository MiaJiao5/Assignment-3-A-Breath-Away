# A Breath Away

A small, dreamy escape: answer three gentle questions, wander around a planet with a fluffy companion, rest by the Listening Stone, and let a thought float into the stars.

## Run locally

Use Node.js 22.18 or newer (also required for the browser test's native TypeScript imports).

```sh
npm install
npm run dev
```

Open http://localhost:3000. The experience runs in the browser; no API key or backend service is needed. WebGL supports the planet scene, Web Audio generates ambience and effects, and the four supplied MP3 tracks play through a shared audio context. Headphones are optional.

For live editing, keep the dev server running and change the files under `src/`. Vite updates the preview when you save. In VS Code, run **Simple Browser: Show** from the Command Palette, enter http://localhost:3000, and move that editor into a side-by-side group. A normal browser window works too. `dist/` contains generated build output; edit the source files rather than `dist/index.html`.

```sh
npm run lint
npm run build
npm run preview
```

## Explore

The opening contains only a centered serif title, a breathing four-color aura with grain, and a light cloud button. The companion is first revealed on arrival at a planet. Begin Your Little Escape opens a separate headphone interlude and unlocks browser audio. The headphone icon floats inside three expanding sound ripples; two subtitle lines fade in over three seconds, starting 1.2 seconds apart. Narration starts after 0.5 seconds. I'm Ready always continues to the questionnaire; tapping blank space also works once narration and subtitles have finished. Language changes replace the narration with the selected language without restarting the subtitle animation. The first question's Back action returns to the interlude.

The questionnaire uses three tiny progress dots, unboxed questions, and frosted choices with matching emoji in English and Chinese. A/B/C remain internal answer values rather than visible labels. Click an answer to advance automatically; the third answer takes you into an abstract light-flow transition. Back lets you revisit answers; Skip and Wander goes directly to a planet.

Each planet opens with a concise bilingual guide explaining only the bottom joystick/keyboard controls, the Listening Stone's sit/music/zoom action, and the portal's travel action. It omits repeated headphone, ecology and message paragraphs. Scrollbars are visually hidden, with touch scrolling retained on very short displays. Confirm the guide to enable movement; the language switch stays accessible while reading. Thoughts fade in gently and drift left to right over 24 seconds in three vertically separated lanes, with automatic thoughts spaced about ten seconds apart. Before sitting, the bottom movement panel contains only a translucent 88px joystick. Use the joystick, WASD, or arrow keys to walk while the globe rolls gently in the opposite direction. The character, landmarks, and contact shadow share the same surface transform, so feet stay aligned in every direction. Walking continues around the entire sphere without artificial borders. The camera follows the local surface frame so the companion remains visible through full circuits and pole crossings.

The four worlds use richer sunset/rose, forest/mint, cornflower/lavender, and indigo/magenta backgrounds. Tinted cream planets and a cool outline keep the white companion distinct. Each planet owns an independent `props` array in its configuration: type, clockwise angle from the top, latitude, scale and palette. Omega has red maples, golden wheat and orange berry bushes; Delta has layered cloud trees, grass tufts and mint mushrooms; Sigma has connected little clouds, dandelions and pastel pinwheels; Psi has translucent jellyfish mushrooms, rounded crystals and moon reeds. Rounded SVG gradients and color-matched soft glows are anchored on the 3D surface. Walking nearby releases themed leaves, dew, fluff or bubbles, with a quiet chime and a small sway, bounce or glow response. Entry hysteresis and a cooldown prevent stationary repeats. Footprints stay attached to the rolling surface and fade over 1.5 seconds. Reduced motion suppresses particles, footprints and decorative sway.

| Planet | Decoration angles | Listening Stone / Portal |
| --- | --- | --- |
| Omega | 25, 80, 145, 210, 275, 330 degrees | 55 / 180 degrees |
| Delta | 15, 65, 125, 190, 245, 305 degrees | 95 / 220 degrees |
| Sigma | 40, 115, 175, 250, 315 degrees | 75 / 145 degrees |
| Psi | 10, 70, 135, 200, 265, 325 degrees | 105 / 295 degrees |

Travel replaces the ecology and repositions landmarks in the existing scene, updating the guide, proximity checks and collision normal without recreating WebGL. Language switching preserves the ecology and its interaction state. The left exit and right language switch share the same subtle glass background. Questionnaire choices are separated by 20px for easier scanning.

A subtle cream-gold trail and a soft arch guide the first walk to the Listening Stone. Approaching it reveals Sit & Listen above the joystick. Click this button to sit; tapping the stone or companion does not sit automatically. The action fades away when walking farther from the stone, with separate arrival/departure distances to prevent flickering. There is no standalone Choose a Planet action. Sitting cancels movement and smoothly pushes the camera behind the companion to a local view at roughly 1.3 times its walking screen size. The camera fits the companion and mushroom cushion, rather than the entire globe; the globe may extend outside the frame and feathers gently above the controls. Floating thoughts occupy the sky above the companion. The trail disappears while seated. After Stand Up, a new trail points toward the portal. A physical clearance keeps the companion outside the stone, and its glow strengthens when approached. Stand Up restores movement and the walking camera. Reduced-motion preferences skip camera animation.

After the opening gesture unlocks browser audio, a nearly subliminal filtered pink-noise breeze and low A-major-seventh drone sit beneath the three-question calibration, breathing on a six-second LFO cycle without a lead melody. Each answer produces a soft two-note water-ripple/chime overtone. Completing or skipping the questionnaire briefly lifts the bed and adds a short filtered-air whoosh. The same bed continues very quietly on the planet, ducks further when sitting, and supports a separate planet melody that fades in over 2.8 seconds. Stand Up fades that melody away over 2.2 seconds, then pauses it and restores the quiet environmental level.

The four supplied MP3 files under `public/audio/` are the default seated music: Copper Afternoon (Omega), Sunlight on the Moss (Delta), Midday Horizon (Sigma), and Last Active Sensor (Psi). `PLANET_AUDIO_URLS` in `src/data/roamingData.ts` selects each file. The shared hidden `<audio>` element loops it through an independent gain bus, using smoothstep curves with a 2.8-second fade-in and 2.2-second stand-up fade-out. The curve starts and ends gently rather than rising sharply near its end. Each new sit starts at the beginning; language switching preserves progress. Session guards cancel obsolete playback and fade cleanup. Clearing a URL opts that planet back into the procedural melody.

The owner's headphone-page recordings replace the earlier system narration: `voice_en_kokoro.wav` is copied as `/audio/intro-voice-en.wav`, and `voice_zh.mp3` as `/audio/intro-voice-zh.mp3`. `INTRO_VOICE_URLS` in `src/audio/introVoice.ts` selects the recording for the current interface language. The hidden `intro-voice-en` and `intro-voice-zh` players route through separate GainNodes with a 1.5-second fade-in. System speech never overlaps successful recorded playback; it is only a fallback when a URL is null or a recording fails. The continue button always works and leaving the headphone page stops its recording.

The language control remains available. The Sound On / mute toggle has been removed; sitting still starts the ambient music. After the first Stand Up, Leave for Now appears at the top left, mirroring the language switch. A one-time guide explains that leaving is now available whenever needed, including while walking, resting, or viewing a panel. It stays unlocked across subsequent planets until the experience is restarted. Message input and Let It Float fade in after five seconds of listening; standing hides them while preserving the draft. Leave for Now opens the farewell screen. Take a Little Calm With You returns to the welcome screen; Visit Another Planet opens the same portal journey available from the planet.

Walk near the portal to reveal Enter Portal above the joystick. A short starlight animation leads to a circular orbit of unvisited planets, drifting clockwise. Find My Next Planet starts a random draw that slows to a stop under the top pointer, briefly highlights the result, and automatically travels there. The first draw has three destinations; after two total arrivals it has two. With one unvisited planet left, the entry animation leads straight there without a draw. Visited planets are tracked for the current journey in memory, and cancelled transfers do not count as arrivals. After all four planets, Begin Another Journey opens the other three destinations again; restarting from the welcome screen also clears the route. Language changes preserve the orbit, chosen destination, and animation progress. Stay on This Planet or Escape cancels pending travel. The portal veil covers the whole app uniformly, with language and the unlocked exit still available above it.


## English and Simplified Chinese

The top-right **EN | 中文** switch is available on the cover, headphone interlude, questionnaire, transition, planet scenes, message area, planet picker, and farewell screen. It uses a faint glass background and stronger text weight/opacity for the selected language, with `aria-pressed` and a translated accessible group label.

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
node tests/visual-garden.cjs
node tests/interlude-audio.cjs
node tests/narration-recording.cjs
node tests/biomes.cjs
node tests/planet-guide.cjs
```

The tests use an installed Google Chrome in headless mode. Set `BROWSER_PATH` to another Chromium browser executable if needed, `APP_URL` for a different server URL, or `PLAYWRIGHT_MODULE` for an existing Playwright module directory. The suites check both languages across every screen and panel, preference persistence and storage failures, input and questionnaire preservation, planet and character state, uninterrupted audio timers, localized feedback and accessible labels, and controls at mobile widths from 320 to 414 pixels. The movement/resting regression checks counter-rotation in all four directions, surface and shadow alignment, the joystick-only panel, initial glowing guidance, tapping the Listening Stone, the camera behind the seated companion, rest locking, and restoring movement. Screenshots are saved under tests/; generated images are ignored by Git.

The seated framing regression projects the companion and cushion into the camera view at mobile and desktop sizes. It checks a measurable local push-in, guarded camera distance, thought lanes above the character, fitting controls, and drafts surviving resizing and language changes. The interlude/audio suite also checks all four actual MP3 files, looping, language continuity, rapid re-sitting, and bounded zoom at 320, 390, 414px and desktop sizes. Recorded narration tests use existing tracks only as playback fixtures, then simulate a failed optional recording to verify a single graceful speech fallback.

See [PROCESS.md](PROCESS.md) for implementation and validation notes, and [CREDITS.md](CREDITS.md) for acknowledgements.
