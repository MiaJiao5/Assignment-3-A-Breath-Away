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
8. The switch works throughout onboarding, questionnaire, transition, planet, message input, planet picker, and farewell. The farewell action unlocks at the top left after the first Stand Up, with a one-time explanation.
9. Empty-input errors, release feedback, simulated audio failures, input labels, dialog labels, and the language group's accessible name update with the selected language.

Screenshots were inspected for layout. These automated checks verify audio lifecycle continuity; they do not evaluate perceived music quality or replace listening on a physical device. Mobile checks use emulated viewport sizes rather than physical phones.

## Surface movement and guided resting

The original movement kept the companion at a fixed world position and rotated the planet. Character movement now combines walking over the surface with a gentle counter-rotation of the globe. Integrated joystick travel updates the companion?s transported tangent frame, which aligns its body and contact shadow with the local surface normal. Heading is relative to this frame, so vertical input no longer produces mismatched feet. Each surface step applies 45% of its inverse rotation to the shared planet parent. This gives rolling in the direction opposite the walk without pinning the character in place. Camera offsets also use the transformed world-space normal, preserving the rear resting view. Rotation freezes on sitting. The previous longitude/latitude limits are removed. Movement now transports a quaternion tangent frame over the sphere, so pole crossings and complete circuits remain continuous. The camera follows that frame while keeping the resting view, foot contact, and world-space shadow aligned. The old duplicate step and swipe movement loops have been removed.

The pre-rest movement panel contains only the joystick. Its translated instruction appears at the top of the scene in place of the atmosphere subtitle. The keyboard remains available. On each planet, a thin, translucent cream-gold curve and a soft arch guide the initial walk to the Listening Stone. The Sit & Listen action appears in a reserved slot above the joystick when the character is nearby, and becomes Stand Up after sitting. Tapping the companion or stone does not sit automatically. The arrival threshold is 0.38 radians and the departure threshold is 0.46 radians, preventing flicker near the boundary. The reserved slot avoids scene movement when the button appears or disappears. Direction, landmark, and collapse buttons remain absent.

Rest cancels held input and spring velocity. The render loop and landmark interaction handlers enforce this lock. The companion turns away from the audience, and the camera moves behind it using the same local surface frame. The complete seated framing described below keeps the globe visible. Stand Up restores the walking view. Reduced-motion preferences use the destination view immediately. Language changes neither restart the camera nor affect audio timers.

The joystick hides during rest. The message form appears only while seated, and its submit handler also checks the resting state. Drafts persist when the form hides. Language remains available. The Sound On / mute toggle is removed, while sitting continues to start the music. The farewell action unlocks after the first Stand Up and remains available while roaming. A bilingual one-time guide points to its fixed top-left location.

The updated rest-browser.cjs checks actual keyboard and pointer movement, opposing globe rotation in all four directions, frozen rotation during rest, the root's radius and alignment with the surface normal, contact-shadow distance, initial guidance, contextual stone interaction, a rear camera angle, blocked scene input while resting, resume, drafts, languages, and mobile layouts. Before/after screenshots are inspected. The bilingual regression covers the full application flow and audio continuity using the updated sitting interaction.

## Entry guide and clearer controls

Each planet entry presents a concise bilingual guide. The scene and header become inert while the guide is open; keyboard/joystick movement, physics, and scene interactions also check an explicit interaction flag. Confirmation clears stale input and enables movement. Language selection stays available above the guide. A new planet selection shows its entry guide as well.

The joystick is enlarged from 86px to 120px with a 52px knob and an increased travel radius. Questionnaire options place a larger A/B/C letter at the left, followed by a shared emoji and localized text. Emoji are stored separately from labels so both languages use exactly the same icons.

The browser regressions cover instruction confirmation, blocked movement before confirmation, bilingual guide copy, the larger joystick, matching question emoji, no early farewell action, the five-second message delay, persistent exit access after the first Stand Up, and the one-time exit guide. Existing movement, counter-rotation, resting, audio, and draft checks remain in place.

## Continuous roaming and raised layout

The globe, movement instructions, and joystick are raised using a shorter planet header and additional space below the planet scene. The exit action occupies its own fixed top-left position after the first Stand Up, so appearing does not shift the scene. The camera follows the transported surface frame, maintaining consistent input directions and visibility on the far side and across poles. The resting regression includes held input for complete horizontal and vertical circuits, checks that the old boundaries no longer stop movement, and measures surface visibility and foot/shadow alignment throughout.

## Stone clearance and the next destination

Surface movement projects any step that would enter the Listening Stone's protective footprint back to its boundary. The minimum center separation is 0.585 world units, accounting for the seated body, stone footprint, and a small gap. The globe counter-rotates only for the accepted movement. Glancing input slides around the boundary, while pushing directly into the stone cannot make the models overlap.

Approaching the stone gently brightens its material and lantern and reveals the contextual sit action. Guidance hides throughout rest. Resuming sets the next target to the portal, reparents the beacon there, and recomputes the soft trail. App state owns this phase so language changes and returning from farewell keep the target consistent. A new planet starts with stone guidance again.

## Calmer seated messages and persistent exit access

The planet is shown with a 38-degree field of view for a modest visual enlargement while retaining the same world-space collision distances. The resting action is now Stand Up. The message area reserves its height from the start of rest and reveals its form after five seconds with a 1.2-second fade, avoiding a camera-layout jump. The timer follows scene and pose, so language switches preserve it and drafts remain untouched.

Automatic thoughts begin after the scene settles, then appear about every ten seconds in two alternating lanes in the sky above the companion. Each drifts left to right for 24 seconds with a long fade in and fade out. Finished animations remove their items, and leaving rest clears the lane. Built-in text remains localized without remounting active thoughts; user text stays unchanged.

After the first Stand Up, exit access unlocks for the remainder of the journey. Leave for Now is placed at the top left, level with the language switch. A one-time bilingual overlay explains it; both exit and language controls remain usable above that overlay. Movement resumes after acknowledgement. Restarting the experience resets the introductory exit guidance.

## Portal interaction and clockwise planet draw

Approaching the portal reveals Enter Portal in the same reserved action slot used by Sit & Listen. Portal proximity has separate arrival/departure thresholds to prevent flicker. Clicking the 3D portal focuses the action rather than triggering travel.

PlanetDiscovery starts with a short CSS starlight tunnel. It filters the current planet and all previously visited planets out of its destinations. Three or two candidates orbit clockwise; planet labels counter-rotate to stay upright. Pressing the draw action samples one destination once, adds four clockwise turns, and eases the orbit to the exact angle that aligns the winner with the fixed top pointer. A short highlighted pause precedes automatic travel. With one candidate, the entry animation travels directly without showing the draw. The parent records visits only on actual planet arrival. Cancelling never changes the visited set. After four arrivals, an explicit new-route action retains the current planet as visited and opens the other three again. Full restart clears the route. Visit history is in memory for the current journey.

The component owns entry, ready, spinning, arriving, and complete phases. RequestAnimationFrame updates a CSS orbit angle without React rendering every frame. Language changes update labels and callback references without restarting effects, drawing again, or resetting the angle. Unmount and cancellation clean up animation frames and travel timers. Escape also works with focus on the global language switch. Reduced-motion preferences remove decorative motion and shorten the entry, draw, and arrival delays.

The portal overlay is a direct child of the app frame. Its single translucent backdrop covers the header and scene together, fixing the old horizontal boundary where the veil began below the header. The underlying header and scene are inert while the portal is open. Language and the unlocked exit remain above it; the card keeps its actions visible while its content can scroll on shorter screens.

The portal regression covers entry-before-draw, clockwise idle and draw movement, exact winner alignment, distinct arrivals with 3/2/1 remaining candidates, direct final travel, cancellation during entry and spin, completion and route reset, language continuity, full-frame backdrop bounds, mobile action placement, reduced motion, and cancellation through the global exit.

## Complete seated framing

The previous close camera let the globe extend beyond the canvas, leaving a hard horizontal cut above the controls. The seated camera now fits bounding spheres for the maximum pulsing halo, companion and its stars, Listening Stone, and portal. It computes distance and vertical focus in the local rear camera frame using the current viewport, with space reserved above for thoughts and a margin below the globe. The walking camera, world scale, collision distances, movement, and audio remain independent of this composition. ResizeObserver continues to update the canvas when the input or feedback changes its available height.

Thoughts share the stage coordinate system and stay in its upper sky area. Both automatic and user-released thoughts use the same raised lanes. A soft edge mask prevents their glow from forming a sharp band at the sky boundary. The framing regression checks projected halo/model bounds, thought position, rear-facing composition, form visibility, and preserved drafts at 320/390/414-pixel mobile widths and a desktop viewport.

Validation passed: TypeScript checks, the production build, seated framing checks, movement/resting regression, and bilingual regression including audio continuity. Mobile and desktop screenshots were inspected for the globe's complete lower edge and thought placement.
