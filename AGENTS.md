# ARPEGGIO Project Instructions

## Product

ARPEGGIO is a modern, gamified music theory learning platform. Its central philosophy is: **Understand music. Don't just memorise it.** Teach beginners through discovery: sound, visualisation and experimentation should come before technical terminology. The experience should be polished and accessible, playful without feeling childish, and suitable for self-taught musicians and aspiring producers as well as beginners.

## Product scope

The eventual product may include a structured curriculum, learning paths, interactive lessons, audio exercises, a virtual piano, chord and scale explorers, ear training, XP, streaks, achievements, profiles and instrument-specific experiences. Implement only features explicitly requested for the current task. Do not add placeholder product content, a landing page, dashboard, logo, or an unapproved visual identity.

## Technology

- Next.js, React, TypeScript, Tailwind CSS, App Router, ESLint and npm.
- Future integrations may include Supabase, Tone.js, VexFlow, Framer Motion and React Native/Expo. Do not install or configure them until requested and needed.
- Do not introduce a monorepo without a concrete reason.

## Architecture

- Keep music theory calculations independent of React and UI.
- Keep curriculum content separate from presentation.
- Make lesson components reusable.
- Keep gamification logic reusable.
- Use strongly typed interfaces and modular, maintainable code.
- Prefer simple boundaries and avoid premature complexity or unnecessary dependencies.
- Keep shared domain logic portable for future web and mobile use.

## Design

Aim for a premium music-tech product: modern, minimal, thoughtful, responsive and accessible, with clear hierarchy and consistent spacing. Avoid generic SaaS dashboards, excessive gradients, unnecessary glass effects, random decoration, inconsistent radii and excessive cards. Establish the visual identity separately; do not choose a final palette without direction.

## Engineering workflow

- Inspect existing files and local instructions before changing them.
- Preserve existing Git configuration and avoid overwriting important files blindly.
- Explain significant architectural decisions.
- Keep changes focused, code clean, and dependencies minimal.
- Run checks after implementation when the task asks for verification or when needed to confirm a requested outcome.
