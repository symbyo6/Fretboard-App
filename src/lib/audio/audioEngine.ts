// src/lib/audio/audioEngine.ts

import * as Tone from 'tone';

const GUITAR_SAMPLE_NOTES = [
  'E2', 'G2', 'B2', 'D3', 'F3', 'A3', 'C4', 'E4',
  'G4', 'B4', 'D5', 'F5', 'A5', 'C6', 'E6',
] as const;

const GUITAR_SAMPLES = Object.fromEntries(
  GUITAR_SAMPLE_NOTES.map((note) => [note, `${note}.mp3`])
);

/**
 * Motor de audio singleton. Se instancia una sola vez para toda la app.
 * `unlock()` debe llamarse desde un click o tap del usuario.
 */
class AudioEngine {
  private synth: Tone.Sampler | null = null;
  private reverb: Tone.Reverb | null = null;
  private synthLoaded: Promise<void> | null = null;
  private isUnlockedFlag = false;
  private isMutedFlag = false;
  private volumeDb = -6;
  private noteStartTimers = new Set<number>();
  private playbackGeneration = 0;

  get isUnlocked(): boolean {
    return this.isUnlockedFlag;
  }

  get isMuted(): boolean {
    return this.isMutedFlag;
  }

  /** Activa o desactiva el sonido sin perder el estado del sintetizador. */
  setMuted(muted: boolean): void {
    this.isMutedFlag = muted;
    if (this.synth) this.synth.volume.value = muted ? -Infinity : this.volumeDb;
  }

  /** Desbloquea el AudioContext y construye el grafo de síntesis. */
  async unlock(): Promise<void> {
    const context = Tone.getContext();
    if (!this.isUnlockedFlag || context.state !== 'running') {
      await Tone.start();
      if (context.state !== 'running') {
        await context.resume();
      }
    }

    await this.ensureSynthGraph();
    this.isUnlockedFlag = true;
  }

  private ensureSynthGraph(): Promise<void> {
    if (this.synth) return this.synthLoaded ?? Promise.resolve();

    let resolveLoaded!: () => void;
    let rejectLoaded!: (error: Error) => void;
    this.synthLoaded = new Promise<void>((resolve, reject) => {
      resolveLoaded = resolve;
      rejectLoaded = reject;
    });

    this.reverb = new Tone.Reverb({ decay: 1.1, wet: 0.12 }).toDestination();
    this.synth = new Tone.Sampler({
      urls: GUITAR_SAMPLES,
      baseUrl: `${import.meta.env.BASE_URL}soundfonts/guitar-steel/`,
      attack: 0.004,
      release: 0.12,
      onload: resolveLoaded,
      onerror: rejectLoaded,
    }).connect(this.reverb);

    this.synth.volume.value = this.isMutedFlag ? -Infinity : this.volumeDb;
    Tone.Destination.mute = false;
    return this.synthLoaded;
  }

  playPreviewChord(noteNames: string[], durationSeconds = 1.4, velocity = 0.75): void {
    if (this.isMutedFlag || noteNames.length === 0) return;
    this.ensureSynthGraph();
    this.resetSynthForNewSound();
    Tone.Destination.mute = false;
    this.synth?.triggerAttackRelease(noteNames, durationSeconds, Tone.now(), velocity);
  }

  playPreviewMidi(midis: number[], durationSeconds = 1.4, velocity = 0.75): void {
    this.playPreviewChord(midis.map((midi) => Tone.Frequency(midi, 'midi').toNote()), durationSeconds, velocity);
  }

  private resetSynthForNewSound(cancelScheduledTransport = true): void {
    this.cancelPendingNoteCallbacks();
    const now = Tone.now();
    if (cancelScheduledTransport) {
      Tone.getTransport().stop();
      Tone.getTransport().cancel(0);
    }
    if (this.synth) {
      this.synth.releaseAll(now);
    }
    Tone.Destination.mute = false;
  }

  /** Toca una sola nota. */
  playNote(noteName: string, durationSeconds = 0.8, velocity = 0.85): void {
    this.ensureSynthGraph();
    if (!this.synth || this.isMutedFlag) return;
    this.resetSynthForNewSound();
    this.synth.triggerAttackRelease(noteName, durationSeconds, undefined, velocity);
  }

  /** Toca un conjunto de notas simultáneamente. */
  playChord(
    noteNames: string[],
    durationSeconds = 1.4,
    velocity = 0.75,
    startTime = Tone.now()
  ): void {
    this.ensureSynthGraph();
    if (!this.synth || this.isMutedFlag || noteNames.length === 0) return;
    const isImmediate = startTime <= Tone.now() + 0.01;
    if (isImmediate) {
      this.resetSynthForNewSound(true);
    } else {
      Tone.Destination.mute = false;
    }
    this.synth.triggerAttackRelease(
      noteNames,
      durationSeconds,
      isImmediate ? Tone.now() : startTime,
      velocity
    );
  }

  playSequenceChord(noteNames: string[], durationSeconds: number, velocity = 0.75): void {
    this.ensureSynthGraph();
    if (!this.synth || this.isMutedFlag || noteNames.length === 0) return;
    Tone.Destination.mute = false;
    this.synth.releaseAll(Tone.now());
    this.synth.triggerAttackRelease(noteNames, durationSeconds, Tone.now(), velocity);
  }

  playScheduledChord(noteNames: string[], durationSeconds: number, velocity: number, startTime: number): void {
    this.ensureSynthGraph();
    if (!this.synth || this.isMutedFlag || noteNames.length === 0) return;
    Tone.Destination.mute = false;
    this.synth.triggerAttackRelease(noteNames, durationSeconds, startTime, velocity);
  }

  /** Toca las notas sucesivamente usando el reloj de audio de Tone.js. */
  playArpeggio(
    noteNames: string[],
    noteSpacingSeconds = 0.18,
    durationSeconds = 0.6,
    onNoteStart?: (index: number) => void,
    startTime = Tone.now()
  ): void {
    this.ensureSynthGraph();
    if (!this.synth || this.isMutedFlag || noteNames.length === 0) return;
    const isImmediate = startTime <= Tone.now() + 0.01;
    if (isImmediate) {
      this.resetSynthForNewSound(true);
    } else {
      Tone.Destination.mute = false;
    }
    const generation = this.playbackGeneration;

    noteNames.forEach((note, index) => {
      this.synth!.triggerAttackRelease(
        note,
        durationSeconds,
        startTime + index * noteSpacingSeconds,
        0.8
      );
      if (onNoteStart) {
        const delayMilliseconds = Math.max(
          0,
          (startTime + index * noteSpacingSeconds - Tone.now()) * 1000
        );
        const timer = window.setTimeout(() => {
          this.noteStartTimers.delete(timer);
          if (generation === this.playbackGeneration) onNoteStart(index);
        }, delayMilliseconds);
        this.noteStartTimers.add(timer);
      }
    });
  }

  playSequenceArpeggio(
    noteNames: string[],
    noteSpacingSeconds = 0.18,
    durationSeconds = 0.6,
    onNoteStart?: (index: number) => void,
  ): void {
    this.ensureSynthGraph();
    if (!this.synth || this.isMutedFlag || noteNames.length === 0) return;
    Tone.Destination.mute = false;
    this.synth.releaseAll(Tone.now());
    const generation = this.playbackGeneration;
    const startTime = Tone.now();
    noteNames.forEach((note, index) => {
      this.synth!.triggerAttackRelease(
        note,
        durationSeconds,
        startTime + index * noteSpacingSeconds,
        0.8
      );
      if (onNoteStart) {
        const delayMilliseconds = Math.max(
          0,
          (startTime + index * noteSpacingSeconds - Tone.now()) * 1000
        );
        const timer = window.setTimeout(() => {
          this.noteStartTimers.delete(timer);
          if (generation === this.playbackGeneration) onNoteStart(index);
        }, delayMilliseconds);
        this.noteStartTimers.add(timer);
      }
    });
  }

  playScheduledArpeggio(
    noteNames: string[],
    noteSpacingSeconds: number,
    durationSeconds: number,
    onNoteStart: ((index: number) => void) | undefined,
    startTime: number
  ): void {
    this.ensureSynthGraph();
    if (!this.synth || this.isMutedFlag || noteNames.length === 0) return;
    Tone.Destination.mute = false;
    const generation = this.playbackGeneration;
    noteNames.forEach((note, index) => {
      this.synth!.triggerAttackRelease(note, durationSeconds, startTime + index * noteSpacingSeconds, 0.8);
      if (onNoteStart) {
        const delayMilliseconds = Math.max(0, (startTime + index * noteSpacingSeconds - Tone.now()) * 1000);
        const timer = window.setTimeout(() => {
          this.noteStartTimers.delete(timer);
          if (generation === this.playbackGeneration) onNoteStart(index);
        }, delayMilliseconds);
        this.noteStartTimers.add(timer);
      }
    });
  }

  private cancelPendingNoteCallbacks(): void {
    this.playbackGeneration += 1;
    this.noteStartTimers.forEach((timer) => window.clearTimeout(timer));
    this.noteStartTimers.clear();
  }

  /** Detiene sonidos activos y cancela progresiones programadas. */
  stopAll(): void {
    this.cancelPendingNoteCallbacks();
    const now = Tone.now();
    this.synth?.releaseAll(now);
    Tone.Transport.stop();
    Tone.Transport.cancel(0);
    Tone.Destination.mute = false;
  }

  setVolumeDb(db: number): void {
    if (this.synth) this.synth.volume.value = db;
  }

  /** Libera recursos para tests o hot reload. */
  dispose(): void {
    this.cancelPendingNoteCallbacks();
    this.synth?.dispose();
    this.reverb?.dispose();
    this.synth = null;
    this.reverb = null;
    this.isUnlockedFlag = false;
  }
}

/** Instancia única compartida por toda la aplicación. */
export const audioEngine = new AudioEngine();
