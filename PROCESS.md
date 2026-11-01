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

| Feedback from the trial | Proposed response |
| --- | --- |
| After submitting a thought while seated, the text did not feel as though it had been released. | Change its motion to a gentle curved upward flight, inspired by a balloon drifting into the sky. Add selectable message-frame styles, such as wavy and circular borders, to make the action more playful. |
| The planets felt like differently coloured balls, and the experience became less interesting by the second planet. | Give the planets more distinct overall forms and vary their surface textures. Candidate forms include a sphere, a faceted polygonal form, a square or cube-like form, and a triangular form. The exact mapping of forms to planets is still to be decided. |
| The text/action at the bottom of the farewell page was too low and difficult to tap. | Move the farewell illustration, text and actions upward as a coherent layout. Check different phone widths, heights and safe areas so the lowest action remains visible and easy to reach. |

**Implementation status:** all three responses above are planned changes. This revision records the decisions only; implementation will follow the detailed instructions for each item. No follow-up participant testing or improved satisfaction is claimed.

To finish the feedback-to-iteration record, a later update should describe at least one actual change and its verification, or give a reason for keeping the current design. The reported trial is complete; implementation and follow-up of these proposed responses remain pending.

## AI tools and decisions

- **Google AI Studio:** used to create the initial app prototype. The exact initial model/version and complete prompt history were not recorded.
- **Codex:** used for later React/Three.js implementation, bilingual integration, Web Audio effects, styling, debugging, browser checks and documentation. I supplied the concept, intended users, visual references, interaction requirements and revision decisions.
- **Gemini:** used to generate the four planet tracks and opening music. I selected and supplied the resulting files. The exact music model/version and prompt settings were not retained; the app does not call Gemini at runtime.
- **Week 6 Python text-to-speech workflow in VS Code:** used to create the English and Chinese narration before adding the rendered audio to the app. English metadata identifies Kokoro-82M with voice `af_heart`, speed 0.9 and 24 kHz output. Chinese model/voice settings were not recorded. Course and model credits are in CREDITS.md.

**Suggestion kept:** centralizing translations in a context and dictionary, because it supports immediate switching while retaining music, user text and scene state.

**Suggestions changed or rejected:** the earlier heavy calligraphy treatment was changed to Allura Regular after comparing rendered results with the visual reference. The multiple-spirit farewell was rejected in favour of one waving companion. These were my design decisions during development, separate from the later friends' trial.

## Validation and remaining work

During development, checks covered English-first entry, language and draft preservation, audio fades, movement and sitting, empty-input feedback, planet travel, farewell and mobile-sized layouts. A clean dependency installation, `npm run lint` and `npm run build` passed. An automated browser also exercised the deployed GitHub Pages site, including real audio playback and the main interaction. These checks are separate from the human trial above.

A long-circuit collision-clearance regression remains unresolved and is listed in README.md. The three proposed trial responses still need implementation and verification. The purpose of this document is to distinguish working features, reported feedback and future plans, without presenting planned work as completed.

The repository's commits preserve the development history. Code, course material, fonts and audio sources are acknowledged in [CREDITS.md](CREDITS.md).
