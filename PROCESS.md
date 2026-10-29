# Development process

## Product intent

A Breath Away offers a few calm minutes of wandering, listening, and leaving a small thought behind. The English-first bilingual interface is part of the core experience. The Simplified Chinese copy keeps the same gentle, slightly playful tone and uses concise labels for mobile screens.

## Implementation

The existing React scene flow, Three.js planet, spirit animations, mood mapping, and Web Audio synthesis remain in place. A typed Language union (en / zh), a central translation dictionary, and a shared React context supply all display copy. This includes questions, options, planet descriptions, controls, tooltips, placeholders, accessibility labels, built-in floating quotes, and feedback.

The language provider owns only the language preference. It never replaces the application or keys the scene by language. Switching updates rendered text without changing the scene, movement references, selected planet, input, audio configuration, or music timers. The document language and title also update. UI messages store semantic keys so an already-visible error or notification can change language; user text remains separate and is never translated or trimmed for display.

The language pill occupies a reserved row above the header, with selected-state semantics and keyboard focus styling. Header actions wrap below it. Panels leave the switch accessible. Long labels wrap, inputs can shrink, and shorter screens allow vertical scrolling. Questionnaire selections remain visible until Continue; Back preserves answers, and Skip and Wander uses the existing planet-mapping rules. The transition timer is independent of language and cancels if the visitor leaves during the transition.

localStorage access is guarded. The browser locale is never consulted when selecting the initial language. A valid saved Chinese preference restores Chinese; otherwise the initial language is English. A storage failure does not prevent switching during the visit.

## Validation

npm run lint (TypeScript) and npm run build passed. The build still reports the existing Vite configuration and large-bundle warnings.

tests/i18n-browser.cjs ran successfully in headless Chrome with software WebGL. The automated regression checks cover:

1. A fresh visit starts in English even with the browser locale set to Chinese.
2. Chinese and English dictionaries have matching translation keys, and switching updates screen copy and selected-state semantics.
3. A saved language is restored after reload, with English as the default when storage is blocked.
4. All three questions, selected answers, Back navigation, progress, and the transition remain functional across switches.
5. An unfinished message survives switching; a released message retains its original content, including surrounding spaces.
6. Listening continues with the same audio loop timers and without extra start/stop calls; the canvas, coordinate reference, and settled character position are preserved.
7. Labels and controls fit 320, 375, 390, and 414 pixel viewports; header actions do not overlap the switch. Welcome, questionnaire, planet, picker, and farewell layouts are checked at narrow widths.
8. The switch works throughout onboarding, questionnaire, transition, planet, message input, planet picker, and farewell. Leaving during transition remains on the farewell screen.
9. Empty-input errors, release feedback, simulated audio failures, input labels, dialog labels, and the language group's accessible name update with the selected language.

Screenshots were inspected for layout. These automated checks verify audio lifecycle continuity; they do not evaluate perceived music quality or replace listening on a physical device. Mobile checks use emulated viewport sizes rather than physical phones.
