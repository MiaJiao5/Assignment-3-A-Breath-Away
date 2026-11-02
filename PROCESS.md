# Development process

## Starting idea

I wanted to make a brief musical escape for office workers taking short breaks between tasks or meetings. The intended use is a break of up to ten minutes, including moments when someone wants to step away and relax but cannot leave their workplace for long. This is the design scenario, rather than a measured claim about every worker's schedule.

The experience combines a short check-in, gentle exploration and an explicit action for sitting and listening. The aim is a small change of pace and a moment to unwind before returning to work. A visitor can stop after one planet instead of completing the whole journey.

## Design and code changes made during development

The initial Google AI Studio prototype grew into a guided sequence: cover, headphone introduction, three questions, planet exploration and farewell. I revised the following interactions before the reported user trial:

- **Clearer sitting action:** approaching the Listening Stone reveals Sit & Listen above the joystick. The deliberate click stops movement, fades in music and moves the camera closer. Stand Up reverses that state. This makes the connection between input, response and feedback visible and audible.
- **A quicker questionnaire:** clicking an answer advances immediately and plays a soft chime, while Back preserves the ability to revise choices. This reduces the steps needed before a short listening break.
- **Continuous language switching:** a shared translation context changes interface copy without remounting the scene, resetting input or restarting music. First visits use English; explicit preferences can be remembered.
- **More coherent visuals:** the farewell uses one waving spirit, and the cover uses a lighter script font. The four planets gained different plant collections and music, although the trial later showed that their overall spherical forms still felt too similar.

One piece I can explain is `handleSitAndListen` in [App.tsx](src/App.tsx): the button changes the spirit's pose to `sitting` and starts that planet's music. The stage reads the pose to lock movement and change the camera. The resulting sound, posture and view tell the visitor that the action succeeded.

## User trial

Three friends tried the app on their phones. They first explored on their own, without an explanation of the controls. I offered hints after they had finished. They described the overall flow as smooth and suggested the local improvements below. This is a combined summary of their feedback, without identifying them. Exact phone models, browsers and session lengths were not recorded.

| Feedback from the trial | Design response |
| --- | --- |
| After submitting a thought while seated, the text did not feel as though it had been released. | **Message bubbles and release animation:** I added three selectable bubble shapes: Cloud, Circle and Rounded Rectangle. When released, each message floats upward like a balloon along a gentle S-shaped path, drifting subtly from side to side. It gradually shrinks and becomes transparent before disappearing into the sky, making the action feel more like letting a thought go. |
| The planets felt like differently coloured balls, and the experience became less interesting by the second planet. | **Distinct planet shapes:** I gave the four planets different forms: a sphere for Amber Sun, an organic blob for Mint Breeze, a rounded triangle for Zero-Gravity Sky and a rounded square for Quiet Starsea. I preserved the original soft 3D aesthetic while making each world more visually distinctive. |
| The text/action at the bottom of the farewell page was too low and difficult to tap. | **Farewell layout:** I moved the page text and bottom buttons slightly upward, adjusted the spacing and made the layout responsive to different mobile screen sizes. This addresses the reported difficulty reaching the bottom actions and keeps the content visible and easy to tap. |

**Implementation status:** all three responses are implemented and checked in the browser following the later detailed briefs. No follow-up participant testing or improved satisfaction is claimed.

For the first response, a compact bilingual selector defaults to Cloud. Each release keeps its selected SVG silhouette and original text, travels along an S-shaped path, and gradually shrinks and fades over nine seconds. Circle text wraps and adjusts its font size within the circular outline. Standing or leaving cancels a release. Browser checks cover all three shapes, narrow phone layouts, empty input, language and draft preservation, reduced motion, and continuous music without a scene reset. These checks verify the implementation; they do not replace a follow-up trial with the participants.

For the planet-form response, the rendered mesh, character contact, landmarks, plants, footprints and guidance now use a shared procedural surface model. Collision checks use actual surface distances so the Listening Stone and portal remain reachable on each form. Deterministic color, bump and roughness maps add wheat bands, leaf/dew marks, cloud layers and cosmic inlays without extra downloaded assets. The companion's geometry, material and listening animation are retained. Mathematical checks cover normals, seams and radial bounds; browser checks exercise movement, sitting, both landmarks, travel, and sampled rotations on phone and desktop viewports.

For the farewell response, the text and actions move upward with flexible spacing and safe-area padding. Both actions have a touch target of at least 48px, and the entire Visit Another Planet row is clickable. Browser checks at 375 × 667, 390 × 844, 414 × 896 and 430 × 932 confirm that the content stays visible in both languages. Shorter screens can use a scrolling fallback. The original background, font families, glow effects and spirit illustration are retained; interface text was subsequently enlarged slightly for readability.

## AI tools and decisions

- **Google AI Studio:** used to create the initial app prototype. The exact initial model/version and complete prompt history were not recorded.
- **Codex:** used for later React/Three.js implementation, bilingual integration, Web Audio effects, styling, debugging, browser checks and documentation. I supplied the concept, intended users, visual references, interaction requirements and revision decisions.
- **GPT / ChatGPT:** used to develop my own planet and farewell ideas into more detailed visual descriptions. I revised those descriptions before passing them to Codex to implement. This supported my design process rather than replacing my decisions.
- **Gemini:** used to generate the four planet tracks and opening music. I selected and supplied the resulting files. The exact music model/version and prompt settings were not retained; the app does not call Gemini at runtime.
- **Week 6 Python text-to-speech workflow in VS Code:** used to create the English and Chinese narration before adding the rendered audio to the app. English metadata identifies Kokoro-82M with voice `af_heart`, speed 0.9 and 24 kHz output. Chinese model/voice settings were not recorded. Course and model credits are in CREDITS.md.

**Suggestion kept:** centralizing translations in a context and dictionary, because it supports immediate switching while retaining music, user text and scene state.

**Suggestions changed or rejected:** the earlier heavy calligraphy treatment was changed to Allura Regular after comparing rendered results with the visual reference. The multiple-spirit farewell was rejected in favour of one waving companion. These were my design decisions during development, separate from the later friends' trial.

For the cover, I used typography images found on Xiaohongshu as references when explaining the desired appearance to AI tools. I compared the rendered title with those references and revised the font choice, composition and gradients. The final lettering uses the licensed Allura font; AI assisted the implementation rather than creating a new font. The reference images are not bundled with the submission.

## Validation and remaining work

During development, checks covered English-first entry, language and draft preservation, audio fades, movement and sitting, empty-input feedback, planet travel, farewell and mobile-sized layouts. A clean dependency installation, `npm run lint` and `npm run build` passed. An automated browser also exercised the deployed GitHub Pages site, including real audio playback and the main interaction. These checks are separate from the human trial above.

For the final submission check, I installed the locked dependencies in an isolated source copy using cached packages (`npm ci --offline`), then passed type checking and a production build. A 390 × 844 mobile browser completed the production flow, including recorded narration, music playback, sitting, empty-input feedback, language switching with preserved text and music, and farewell. An unsigned-in browser could also open the public repository. I removed an unused legacy audio recording and corrected the setup notes to state that no runtime API key is needed.

A previously reported long-circuit collision-clearance regression remains listed in README.md; the new surface checks are additional coverage. The refined farewell layout has passed responsive browser checks, and all three trial responses await follow-up participant feedback. The purpose of this document is to distinguish working features, reported feedback and future plans, without presenting planned work as completed.

The repository's commits preserve the development history. Code, course material, fonts and audio sources are acknowledged in [CREDITS.md](CREDITS.md).
