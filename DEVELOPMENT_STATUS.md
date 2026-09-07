# Development Status

## Current state

El Localizador de teoría en el diapasón de la guitarra funciona como una aplicación local de React/Vite con:

- Scale, key, degree, notation, and extended-chord controls.
- Harmonic major scale (`1, 2, 3, 4, 5, b6, 7`) in the scale catalog.
- A 24-fret, six-string fretboard.
- Interactive note playback through Tone.js.
- Position-accurate note octaves for every string and fret.
- Audio unlock flow for browser autoplay restrictions.
- Sequential ascending and descending arpeggios.
- Triad and tetrad playback using consecutive available strings.
- Tetrad toggle labeled `Tétradas (7)`.
- Closed, Drop 2, and Drop 3 chord voicing type switch.
- Voicing positions numbered `1` through `4`, where `1` is the non-inversion.
- Explicit lower-string and upper-string range controls.
- Degree progression across two fretboard passes.
- One-note-at-a-time playback highlighting.
- Red rings around root notes, including roots outside the active chord.
- Green selected-chord tonic notes for non-first-degree chords.
- Fretboard legend for tonic, chord, and scale note colors.
- Red dotted ring shown as a separate legend marker beside the red tonic swatch.
- Muted visual treatment for roots outside the active chord.
- Minimum fretboard zoom set to `0.6`.
- Full-width, full-height main panel layout.

## Start again

From `c:\Fretboard App`:

```powershell
npm.cmd install
npm.cmd run dev
```

For the production build:

```powershell
npm.cmd run build
npm.cmd run preview
```

The preview normally uses `http://localhost:4173/`. If that port is occupied, Vite chooses the next available port.

## Validation

```powershell
npm.cmd test
npm.cmd run lint
npm.cmd run build
```

The browser must receive one click on `Toca aquí para activar el sonido` before playback can begin.

## Important files

- `src/App.tsx`: app state, chord progression, arpeggio positions, and degree synchronization.
- `src/components/Fretboard/Fretboard.tsx`: fretboard rendering, note highlighting, root rings, and zoom.
- `src/components/Controls/PlaybackControls.tsx`: playback mode, tempo, and string-range controls.
- `src/hooks/useProgression.ts`: timed chord and arpeggio progression playback.
- `src/lib/audio/audioEngine.ts`: Tone.js synthesis and scheduling.
- `README.md`: setup and run instructions.
