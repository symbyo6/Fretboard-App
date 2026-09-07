# Localizador de teoría en el diapasón de la guitarra

Interactive guitar fretboard explorer with scale degrees, chord tones, harmonic major, chord voicings, fretboard highlighting, and Tone.js playback.

## Current features

- Major, modal, minor, pentatonic, and harmonic major scale exploration.
- Triad or tetrad chord generation with Roman or Nashville labels.
- Closed, Drop 2, and Drop 3 playback voicings.
- Voicing positions `1` through `4`; position `1` is the non-inversion.
- Position-accurate playback octaves for every fretboard note.
- Fretboard color legend: red scale tonic, green selected chord tonic, blue chord tones, and gray scale tones.
- Red dotted tonic rings are shown on the fretboard and represented separately in the legend.

## Run locally

From `c:\Fretboard App`:

```powershell
npm.cmd install
npm.cmd run dev
```

Open the local URL printed by Vite, normally `http://localhost:5173/`.

## Preview the production build

```powershell
npm.cmd run build
npm.cmd run preview
```

Open `http://localhost:4173/`.

## Validate

```powershell
npm.cmd test
npm.cmd run lint
npm.cmd run build
```

The browser requires one click on `Toca aquí para activar el sonido` before audio playback can start.
