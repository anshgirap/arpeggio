# Music domain engine

This module contains framework-independent music theory data and calculations. The public API is exported from `index.ts`; it has no React or browser dependencies and can be shared by other clients.

## Modules

- `notes/`: spelled pitches, MIDI notes and equal-temperament frequency conversion (A4 defaults to 440 Hz).
- `intervals/`: interval identification, construction and inversion using both written letter distance and semitone distance.
- `scales/`: major, natural/harmonic/melodic minor, the seven modes, pentatonic and blues scales, spelling, comparison and transposition.
- `chords/`: triads and seventh-chord formulas, note-set identification, inversions and slash-bass notation. Chord identity is kept separate from its voicing.
- `harmony/`: conventional major and natural-minor key signatures, relative/parallel keys, diatonic triads/sevenths, Roman numerals, basic function, and candidate secondary-dominant/parallel-mode analyses. Candidate analyses remain plural where context is ambiguous.
- `rhythm/`: exact rational notated lengths, dots, tuplets, rests, meters, beat conversion and tempo-based seconds.
- `piano.ts`: the existing one-octave UI keyboard layout, now sourced from the shared pitch/frequency calculations.
- `audio-engine.ts`: browser-specific Web Audio playback. This intentionally stays outside the pure theory modules.

## Checks

Run `pnpm test` for the built-in Node test suite. It compiles only this engine to a temporary directory, runs the tests, then removes that generated directory. Run `pnpm typecheck` for the full application type check.
