# A Breath Away

A small interactive escape for students and people working at a desk who would like a few quiet minutes. Answer three gentle questions, explore a pastel planet with a fluffy companion, sit by a Listening Stone, and let a thought float away.

The intention is a calm, understandable loop: **choose or move -> the world responds -> see and hear what changed -> decide whether to rest, explore or leave**.

## Screenshots

<p>
  <img src="docs/screenshots/cover.png" width="220" alt="The three-line pastel calligraphy cover of A Breath Away" />
  <img src="docs/screenshots/listening.png" width="220" alt="The fluffy companion sitting on a planet beside its Listening Stone" />
</p>

## Run from a fresh terminal

Use Node.js 24 LTS, or Node.js 22.18 or newer, with npm. No API key, Python environment, paid account, microphone or model download is needed to run this browser experience. Generated music and narration are included in `public/audio/`.

```sh
git clone https://github.com/MiaJiao5/Assignment-3-A-Breath-Away.git
cd Assignment-3-A-Breath-Away
npm ci
npm run dev
```

Open the Local URL printed by Vite, normally **http://localhost:3000**. If that port is already occupied, use the next URL Vite prints. Keep the terminal running while previewing.

To check and preview a production build:

```sh
npm run lint
npm run build
npm run preview
```

Open the preview URL printed in the terminal, normally http://localhost:4173. Do not open `dist/index.html` directly as a local file. Edit files in `src/`; Vite refreshes the development preview when they change. Dependencies and exact npm resolutions are recorded in `package.json` and `package-lock.json`.

## Main interaction

| Your action | Response and feedback |
| --- | --- |
| Begin, listen to the short introduction, and confirm the headphone invitation | Audio unlocks, and the three-question calibration begins. Each answer gives a quiet chime and advances to the next question. Back revisits the previous step. |
| Drag the bottom joystick, or use WASD / arrow keys | The companion walks, the globe rolls, alternating footsteps follow the actual gait, and nearby plants react. A glowing trail leads to the Listening Stone. |
| Approach the stone and choose Sit & Listen | Movement stops, the camera gently moves closer, and that planet's music fades in. After five seconds, the thought input appears. |
| Type a thought and choose Let It Float | The exact text appears above the companion and is saved locally. Empty or whitespace-only input gives a gentle, translated prompt. |
| Choose Stand Up | Music fades out and exploration resumes. After the first rest, Leave stays available at the top left. The trail now leads to the portal. |
| Approach the portal after resting on this planet | Enter Portal reveals an animated draw among unvisited planets. Cancel or Escape returns to the current planet. |
| Choose Leave | A farewell preserves the planet's colors. Take This Calm With You restarts at the cover; Visit Another Planet continues the journey. |

The first planet has a one-time control guide. Portals stay locked until the visitor has rested on the current planet. The four worlds have different vegetation, music and five unique bilingual star-dust messages each. Only one built-in thought floats at a time; all five appear in shuffled order before repeating.

## English and Simplified Chinese

First visits always start in English, regardless of browser language. The top-right EN / Chinese switch works throughout the experience, including panels. An explicit preference is stored as `a_breath_away_language` in localStorage. Missing, invalid or unavailable storage defaults to English; switching still works for that visit.

Switching preserves the scene, questionnaire answers, planet, position, listening state, music progress and unfinished input. The brand title stays in English in both modes. User-written messages are never translated. Up to 30 released thoughts are stored only in that browser under `brief_roaming_user_stardust_v1`; the app does not upload them. Clearing this site's browser storage removes them.

## Publishing and phone testing

GitHub Pages deployment is prepared in [.github/workflows/deploy.yml](.github/workflows/deploy.yml). A live link will be added here after the first successful deployment.

1. In this repository's **Settings > Pages**, select **GitHub Actions** as the source.
2. Commit and push the complete source, assets and workflow to `main`.
3. Wait for **Build and deploy to GitHub Pages** to finish in the Actions tab.
4. Open the URL shown by that deployment on a phone, or send it to a tester. The browser app needs no installation and the computer need not stay on.

The workflow builds for this repository's subpath. All music and voice URLs follow Vite's base URL, so the same source also works locally at `/`. For a manual subpath preview:

```sh
npm run build -- --base /Assignment-3-A-Breath-Away/
npm run preview -- --base /Assignment-3-A-Breath-Away/
```

Open http://localhost:4173/Assignment-3-A-Breath-Away/. For same-Wi-Fi development testing, Vite also prints a Network URL; use that computer address on the phone, rather than `localhost`. Local access depends on the computer's firewall and network.

The required trial with another person has **not yet been completed**. Send the working link without explaining the controls first, observe where the person hesitates, then record a real observation and decision in [PROCESS.md](PROCESS.md). Automated browser tests do not replace that trial.

## Known limitations

- A modern browser with WebGL and Web Audio is needed. Software rendering and older phones can be slow; physical-phone audio and touch testing are still pending.
- Audio begins after a deliberate user gesture. Missing or unavailable narration falls back to system speech or quiet subtitles; unavailable planet music shows a localized message while exploration remains usable. Voice quality depends on the device if fallback speech is used.
- Thoughts and preferences remain on one browser and are not synchronized across devices. Denied storage does not prevent the current session.
- A previously run long-circuit movement regression reported a small Listening Stone clearance shortfall (0.5831 versus 0.585 world units). This remains a known check failure; it is not presented as a passing test.
- Hosting and a user trial are prepared but not yet completed. Do not treat a planned URL as a verified live demonstration.

## Development checks

The normal build and type check are the commands above. Optional browser regressions use Playwright with an installed Chrome:

```sh
npm install --no-save --package-lock=false playwright
node tests/cover-v2.cjs
node tests/i18n-browser.cjs
node tests/fluffy-footsteps.cjs
node tests/biomes.cjs
```

Set `APP_URL` to the running development server if it uses a different port, or `PLAYWRIGHT_MODULE` to an existing Playwright installation. `tests/pages-deployment.cjs` exercises the built site under its repository subpath, including real audio playback and empty-input feedback. Additional targeted scripts under `tests/` cover narration, guide behavior, camera framing, planet travel and farewell return. Generated test screenshots are ignored by Git; the two curated screenshots above are included for the submission.

Read [PROCESS.md](PROCESS.md) for design changes, AI use, tests and the pending user trial. [CREDITS.md](CREDITS.md) records software, fonts, course material and generated audio sources.
