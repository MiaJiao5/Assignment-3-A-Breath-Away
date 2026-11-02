# Credits

## Project and copy

A Breath Away extends the React/Vite prototype developed in this repository. The project owner supplied the app concept, product copy, bilingual requirements, visual references and interaction revisions. Codex assisted with code, translation integration, original SVG illustrations, procedural audio, testing and documentation. The assignment's interaction brief is the course context; the app's detailed product copy is not claimed to come from that brief. The owner created the initial prototype in Google AI Studio and used Codex for later refinement; see PROCESS.md.

## Software

- [React](https://react.dev/) and React DOM render the application.
- [Three.js](https://threejs.org/) renders the procedural planet and character scene, including its RoomEnvironment helper.
- [Vite](https://vite.dev/), [TypeScript](https://www.typescriptlang.org/), and [Tailwind CSS](https://tailwindcss.com/) support development, builds, and styling.
- The browser's Web Audio API generates interface sounds and ambient noise, and controls the recorded planet music with smooth gain envelopes. Web Speech provides optional system narration when no voice recording is configured.
- The mushroom cushion, spiral portal, surface anchors, particles, and footprints are drawn with Three.js; the twelve biome-specific plant illustrations use original SVG paths, gradients and soft-glow filters created with Codex assistance. No third-party plant image asset is required.
- [Playwright](https://playwright.dev/) supports the browser regression checks.

See package.json for the dependency inventory and package-lock.json for the exact npm resolutions used by the README run instructions and deployment. The earlier bun.lock is also retained. Dependencies retain their respective licenses.

## Fonts and visuals

The landing title uses genuine Google Fonts [Allura Regular](https://github.com/google/fonts/tree/main/ofl/allura) by the Allura Project Authors (copyright 2010) at weight 400. The unmodified font and SIL Open Font License are bundled as `public/fonts/Allura-Regular.ttf` and `Allura-OFL.txt`. The face is preloaded and served locally; no generic cursive fallback or synthesized bold is used for the rendered title. Earlier Ballet, Tangerine and Pinyon fonts and licenses remain as unused historical assets.

The owner found typography reference images on Xiaohongshu and used them to communicate the desired lettering style to AI tools. The original post links and creator names were not retained. These images served as visual references and are not included in this repository. The final title uses the licensed Allura font, with AI-assisted SVG layout and pastel gradients; the font itself is not claimed as an original AI-generated typeface.

The planet forms and farewell visual direction began with the owner's own ideas. GPT helped develop those ideas into visual descriptions, which the owner revised before giving them to Codex for implementation. The final planet surfaces and farewell companion are rendered in code rather than using downloaded planet or character illustrations.

Section and popup headings use [Cormorant Garamond](https://github.com/google/fonts/tree/main/ofl/cormorantgaramond) by Christian Thalmann / the Cormorant Project Authors at Medium weight. Body text and controls use [Nunito Sans](https://github.com/google/fonts/tree/main/ofl/nunitosans) by the Nunito Sans Project Authors at Regular and Medium/SemiBold weights. Both original variable fonts and their SIL Open Font Licenses are bundled in `public/fonts/`. Noto Sans SC and Noto Serif SC are requested through Google Fonts as Chinese fallbacks, followed by local system fonts. The planet textures, background gradients, aura orb, headphone SVG, particles, and spirit visuals are produced by application code. No stock photography or third-party image asset is required.

## Supplied music

The project owner reports generating these four music tracks with Gemini and confirms permission to share the supplied outputs publicly. The precise generation model/version and prompts were not recorded. Copies in `public/audio/` preserve the supplied files without transcoding or trimming:

| Planet | Recording |
| --- | --- |
| Omega / Amber Sun | Copper Afternoon |
| Delta / Mint Breeze | Sunlight on the Moss |
| Sigma / Zero-Gravity Sky | Midday Horizon |
| Psi / Quiet Starsea | Last Active Sensor |

The project owner generated the headphone-page narration with the Week 6 Python text-to-speech workflow in VS Code, and confirms permission to share these synthetic voices. The course materials used are [Week 6 speech examples](https://github.com/sd5913/pfad/tree/2026/week06/speech), especially `README.md` and `synthesise.py`; no Python service or microphone is required by this app. The English generation metadata identifies [Kokoro-82M](https://huggingface.co/hexgrad/Kokoro-82M), voice `af_heart`, speed 0.9 and 24 kHz. Chinese model/voice settings were not recorded. Supplied outputs: `voice_en_kokoro.wav` for English and `voice_zh.mp3` for Chinese. They are copied without conversion to `intro-voice-en.wav` and `intro-voice-zh.mp3`. Successful recorded playback replaces system narration completely; system speech remains a failure fallback.

The opening music was also generated by the owner with Gemini, with permission to share confirmed by the owner. The supplied `Begining music.mp3` is copied unchanged to `public/audio/beginning-music.mp3`. It fades in after the headphone-page confirmation at 70% media volume, accompanies the questionnaire, and fades out during the transition into the first planet.

Movement uses **Fluffy Little Footsteps**, an original 118 ms sound generated in code from a warm sine-wave landing, soft filtered noise and an airy rustle. Web Audio plays the generated buffer once per actual left/right foot contact, with small pitch, gain and stereo variations; it does not loop a recording. The matching one-shot is included as `public/audio/fluffy-little-footstep.wav`, with a four-second listening preview in `docs/audio/fluffy-little-footsteps-preview.wav`. Run `node scripts/generate-fluffy-footsteps.cjs` with Node.js 22.18+ or 24 to regenerate both WAV files from the same source used in the app. No external audio API, downloaded sample or commercial footstep recording is used. The unused legacy footstep recording has been removed from the current submission.

The farewell companion is an original code-based SVG illustration with one continuous ivory cloud silhouette, independent waving and blinking groups, and subtle dimensional shading. It uses the current planet's existing background without altering the theme mapping.
