# Credits

## Project and copy

A Breath Away builds on the existing course assignment's React interface, procedural planet scenes, fluffy spirit, movement controls, and synthesized sound engine. The English interface copy and bilingual product requirements were supplied in the assignment brief. The Simplified Chinese translations and internationalization integration were prepared with Codex assistance.

## Software

- [React](https://react.dev/) and React DOM render the application.
- [Three.js](https://threejs.org/) renders the procedural planet and character scene, including its RoomEnvironment helper.
- [Vite](https://vite.dev/), [TypeScript](https://www.typescriptlang.org/), and [Tailwind CSS](https://tailwindcss.com/) support development, builds, and styling.
- The browser's Web Audio API generates interface sounds and ambient noise, and controls the recorded planet music with smooth gain envelopes. Web Speech provides optional system narration when no voice recording is configured.
- The mushroom cushion, spiral portal, surface anchors, particles, and footprints are drawn with Three.js; the twelve biome-specific plant illustrations use original SVG paths, gradients and soft-glow filters created with Codex assistance. No third-party plant image asset is required.
- [Playwright](https://playwright.dev/) supports the browser regression checks.

See package.json and bun.lock for the project's complete dependency inventory. Dependencies retain their respective licenses.

## Fonts and visuals

The landing title uses Pinyon Script by Nicole Fally / the PinyonScript Project Authors, distributed from the [Google Fonts repository](https://github.com/google/fonts/tree/main/ofl/pinyonscript) under the SIL Open Font License. The original font and its license are bundled in `public/fonts/` so the title does not rely on a remote font request. The previously used Ballet font by Omnibus-Type / Maximiliano Sproviero and its license remain in that directory.

Section and popup headings use [Cormorant Garamond](https://github.com/google/fonts/tree/main/ofl/cormorantgaramond) by Christian Thalmann / the Cormorant Project Authors at Medium weight. Body text and controls use [Nunito Sans](https://github.com/google/fonts/tree/main/ofl/nunitosans) by the Nunito Sans Project Authors at Regular and Medium/SemiBold weights. Both original variable fonts and their SIL Open Font Licenses are bundled in `public/fonts/`. Noto Sans SC and Noto Serif SC are requested through Google Fonts as Chinese fallbacks, followed by local system fonts. The planet textures, background gradients, aura orb, headphone SVG, particles, and spirit visuals are produced by application code. No stock photography or third-party image asset is required.

## Supplied music

The project owner supplied these four recordings. Copies in `public/audio/` preserve the original audio without transcoding or trimming:

| Planet | Recording |
| --- | --- |
| Omega / Amber Sun | Copper Afternoon |
| Delta / Mint Breeze | Sunlight on the Moss |
| Sigma / Zero-Gravity Sky | Midday Horizon |
| Psi / Quiet Starsea | Last Active Sensor |

The project owner also supplied the headphone-page recordings: `voice_en_kokoro.wav` for English and `voice_zh.mp3` for Chinese. They are copied without conversion to `intro-voice-en.wav` and `intro-voice-zh.mp3`. Successful recorded playback replaces system narration completely; system speech remains a failure fallback.
