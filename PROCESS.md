# Development process

## Product intent

A Breath Away offers a few calm minutes of wandering, listening, and leaving a small thought behind. The English-first bilingual interface is part of the core experience. The Simplified Chinese copy keeps the same gentle, slightly playful tone and uses concise labels for mobile screens.

## Implementation

The existing React scene flow, Three.js planet, spirit animations, mood mapping, and Web Audio synthesis remain in place. A typed Language union (en / zh), a central translation dictionary, and a shared React context supply all display copy. This includes questions, options, planet descriptions, controls, tooltips, placeholders, accessibility labels, built-in floating quotes, and feedback.

The language provider owns only the language preference. It never replaces the application or keys the scene by language. Switching updates rendered text without changing the scene, movement references, selected planet, input, audio configuration, or music timers. The document language and title also update. UI messages store semantic keys so an already-visible error or notification can change language; user text remains separate and is never translated or trimmed for display.

The language pill occupies a reserved row above the header, with selected-state semantics and keyboard focus styling. Header actions wrap below it. Panels leave the switch accessible. Long labels wrap, inputs can shrink, and shorter screens allow vertical scrolling. Questionnaire answers advance immediately on selection; Back preserves answers, and Skip and Wander uses the existing planet-mapping rules. The transition timer is independent of language and cancels if the visitor leaves during the transition.

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
8. The switch works throughout onboarding, questionnaire, transition, planet, message input, planet picker, and farewell. The farewell action is absent from onboarding, the questionnaire, and transition, and appears only after three seconds of sitting.
9. Empty-input errors, release feedback, simulated audio failures, input labels, dialog labels, and the language group's accessible name update with the selected language.

Screenshots were inspected for layout. These automated checks verify audio lifecycle continuity; they do not evaluate perceived music quality or replace listening on a physical device. Mobile checks use emulated viewport sizes rather than physical phones.

## Surface movement and guided resting

The original movement kept the companion at a fixed world position and rotated the planet. Character movement now combines walking over the surface with a gentle counter-rotation of the globe. Longitude and latitude determine the companion's root position; an orthonormal tangent frame aligns its body and contact shadow with the local surface normal. Heading is relative to this frame, so vertical input no longer produces mismatched feet. Each surface step applies 45% of its inverse rotation to the shared planet parent. This gives rolling in the direction opposite the walk without pinning the character in place. Camera offsets also use the transformed world-space normal, preserving the rear resting view. Rotation freezes on sitting. The previous longitude/latitude limits are removed. Movement now transports a quaternion tangent frame over the sphere, so pole crossings and complete circuits remain continuous. The camera follows that frame while keeping the resting view, foot contact, and world-space shadow aligned. The old duplicate step and swipe movement loops have been removed.

The pre-rest movement panel contains only the joystick and a translated instruction. The keyboard remains available. On each planet, a gold light curve and a softly pulsing arch guide the initial walk to the Listening Stone. Tapping it from nearby sits the companion down; tapping the companion itself still allows resting anywhere. There are no persistent sitting, direction, landmark, or collapse buttons in the movement panel.

Rest cancels held input and spring velocity. The render loop and landmark interaction handlers enforce this lock. The companion turns away from the audience, and the camera moves behind it using the same local surface frame, giving a view over its back toward the horizon. Resume Wandering restores the wide view. Reduced-motion preferences use the destination view immediately. Language changes neither restart the camera nor affect audio timers.

The joystick hides during rest. The message form appears only while seated, and its submit handler also checks the resting state. Drafts persist when the form hides. Language remains available. The Sound On / mute toggle is removed, while sitting continues to start the music. The farewell action appears after three continuous seconds of sitting and hides on standing. Its timer depends only on the scene and pose, so language switches do not restart it.

The updated rest-browser.cjs checks actual keyboard and pointer movement, opposing globe rotation in all four directions, frozen rotation during rest, the root's radius and alignment with the surface normal, contact-shadow distance, initial guidance, contextual stone interaction, a rear camera angle, blocked scene input while resting, resume, drafts, languages, and mobile layouts. Before/after screenshots are inspected. The bilingual regression covers the full application flow and audio continuity using the updated sitting interaction.

## Entry guide and clearer controls

Each planet entry presents a concise bilingual guide. The scene and header become inert while the guide is open; keyboard/joystick movement, physics, and scene interactions also check an explicit interaction flag. Confirmation clears stale input and enables movement. Language selection stays available above the guide. A new planet selection shows its entry guide as well.

The joystick is enlarged from 86px to 120px with a 52px knob and an increased travel radius. Questionnaire options place a larger A/B/C letter at the left, followed by a shared emoji and localized text. Emoji are stored separately from labels so both languages use exactly the same icons.

The browser regressions cover instruction confirmation, blocked movement before confirmation, bilingual guide copy, the larger joystick, matching question emoji, no early farewell action, the three-second delay, and hiding the farewell action when standing. Existing movement, counter-rotation, resting, audio, and draft checks remain in place.

## Continuous roaming and raised layout

The globe, movement instructions, and joystick are raised using a shorter planet header and additional space below the planet scene. The farewell button occupies reserved header space so appearing after three seconds does not shift the scene. The camera follows the transported surface frame, maintaining consistent input directions and visibility on the far side and across poles. The resting regression includes held input for complete horizontal and vertical circuits, checks that the old boundaries no longer stop movement, and measures surface visibility and foot/shadow alignment throughout.
