# Exhaustive Linked Sequence Test

Date: 2026-09-11

## Sequence

`Cmaj7 - Db°7 - Dm7 - Eb°7 - Em7 - E°7 - Dm7 - D°7 - Cmaj7`

## Scope

The browser matrix tested every linked tetrad configuration currently exposed for open voicings:

- Drop 2: positions 1, 2, 3, 4
- Drop 2 groups: 6-3, 5-2, 4-1
- Drop 3: positions 1, 2, 3, 4
- Drop 3 groups: 6-4-3-2, 5-3-2-1

For each combination, the test checked that Play was enabled and that the physical-voicing warning was absent.

## Results

| Voicing | String group | Position 1 | Position 2 | Position 3 | Position 4 | Comparison |
| --- | --- | --- | --- | --- | --- | --- |
| Drop 2 | 6-3 | PASS | PASS | PASS | PASS | 4/4 valid |
| Drop 2 | 5-2 | PASS | PASS | PASS | PASS | 4/4 valid |
| Drop 2 | 4-1 | PASS | PASS | PASS | PASS | 4/4 valid |
| Drop 3 | 6-4-3-2 | PASS | PASS | PASS | PASS | 4/4 valid |
| Drop 3 | 5-3-2-1 | PASS | PASS | PASS | PASS | 4/4 valid |

## Summary

- Total combinations: 20
- Valid routes: 20
- Unavailable routes: 0
- Drop 2: 12/12 valid
- Drop 3: 8/8 valid
- Play disabled: 0 cases
- Physical-voicing warning: 0 cases

The test confirms that the current sequence can be generated for every exposed Drop 2 and Drop 3 inversion/group combination. Diatonic links continue to use the diatonic inversion table; chromatic transitions use physical voice-leading candidates, shared tones remain fixed when possible, and string-group migration is restricted to adjacent groups.

## Limitation

This matrix validates route generation and playback availability for every combination. It does not wait for the full audio duration for each of the 20 runs; the browser checks the same `steps` path that the playback control receives and confirms that Play is enabled.

## Playback Jump Audit

A second browser pass played the routes at accelerated tempo and sampled the highlighted fret positions at every step. The measured value below is the largest fret displacement between adjacent captured voices.

| Voicing | String group | Position | Maximum captured fret jump | Observation |
| --- | --- | ---: | ---: | --- |
| Drop 2 | 6-3 | 1-4 | 2 | No large jump isolated |
| Drop 2 | 5-2 | 2-4 | 2 | Position 1 capture completed before the first highlight sample |
| Drop 2 | 4-1 | 2-4 | 2 | Position 1 capture completed before the first highlight sample |
| Drop 3 | 6-4-3-2 | 1 | 5 | Largest observed transition; needs focused review |
| Drop 3 | 6-4-3-2 | 2 | 3 | Moderate movement |
| Drop 3 | 6-4-3-2 | 3-4 | 2 | No large jump isolated |
| Drop 3 | 5-3-2-1 | 1, 3, 4 | 2 | No large jump isolated |
| Drop 3 | 5-3-2-1 | 2 | 2 | Seven highlights captured; no large jump observed |

The audit found no 12-semitone-or-greater jump. The only standout is `Drop 3 / 6-4-3-2 / position 1`, where the maximum observed displacement was 5 frets. The position-1 Drop 2 routes that returned zero captured highlight transitions were playback-sampling misses, not unavailable routes; their route-availability checks were valid.
