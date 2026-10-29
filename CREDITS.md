# Credits

## Project and copy

A Breath Away builds on the existing course assignment's React interface, procedural planet scenes, fluffy spirit, movement controls, and synthesized sound engine. The English interface copy and bilingual product requirements were supplied in the assignment brief. The Simplified Chinese translations and internationalization integration were prepared with Codex assistance.

## Software

- [React](https://react.dev/) and React DOM render the application.
- [Three.js](https://threejs.org/) renders the procedural planet and character scene, including its RoomEnvironment helper.
- [Vite](https://vite.dev/), [TypeScript](https://www.typescriptlang.org/), and [Tailwind CSS](https://tailwindcss.com/) support development, builds, and styling.
- The browser's Web Audio API generates the music, interface sounds, and ambient noise. Default planet audio uses synthesized sound rather than recorded tracks.
- [Playwright](https://playwright.dev/) supports the browser regression checks.

See package.json and bun.lock for the project's complete dependency inventory. Dependencies retain their respective licenses.

## Fonts and visuals

Noto Sans SC, Noto Serif SC, and Plus Jakarta Sans are requested through Google Fonts, with local system-font fallbacks. The planet textures, background gradients, particles, and spirit visuals are produced by application code. No new stock photography, image assets, or external recordings were introduced for the bilingual interface.
