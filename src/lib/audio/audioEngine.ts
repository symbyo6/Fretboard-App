// src/lib/audio/audioEngine.ts

import * as Tone from 'tone';

/**
 * Motor de audio singleton. Se instancia una sola vez para toda la app.
 * `unlock()` debe llamarse desde un click o tap del usuario.
 */
class AudioEngine {
  private synth: Tone.PolySynth<Tone.Synth> | null = null;
  private reverb: Tone.Reverb | null = null;
  private previewSynth: Tone.PolySynth<Tone.Synth> | null = null;
  private previewReverb: Tone.Reverb | null = null;
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
    if (this.isUnlockedFlag && context.state === 'running') {
      Tone.Destination.mute = false;
      this.ensureSynthGraph();
      return;
    }

    await Tone.start();
    if (context.state !== 'running') {
      await context.resume();
    }
    this.ensureSynthGraph();
    this.isUnlockedFlag = true;
  }

  private ensureSynthGraph(): void {
    if (this.synth) return;

    this.reverb = new Tone.Reverb({ decay: 0.8, wet: 0.1 }).toDestination();
    this.synth = new Tone.PolySynth(Tone.Synth, {
      oscillator: { type: 'triangle' },
      envelope: { attack: 0.006, decay: 0.28, sustain: 0.2, release: 0.12 },
    }).connect(this.reverb);

    this.synth.volume.value = -6;
    Tone.Destination.mute = false;
  }

  private stopPreview(): void {
    this.previewSynth?.releaseAll(Tone.now());
    this.previewSynth?.dispose();
    this.previewReverb?.dispose();
    this.previewSynth = null;
    this.previewReverb = null;
  }

  playPreviewChord(noteNames: string[], durationSeconds = 1.4, velocity = 0.75): void {
    if (this.isMutedFlag || noteNames.length === 0) return;
    this.stopPreview();
    Tone.Destination.mute = false;
    this.previewReverb = new Tone.Reverb({ decay: 0.8, wet: 0.1 }).toDestination();
    this.previewSynth = new Tone.PolySynth(Tone.Synth, {
      oscillator: { type: 'triangle' },
      envelope: { attack: 0.006, decay: 0.28, sustain: 0.2, release: 0.12 },
    }).connect(this.previewReverb);
    this.previewSynth.volume.value = this.volumeDb;
    this.previewSynth.triggerAttackRelease(noteNames, durationSeconds, Tone.now(), velocity);
    window.setTimeout(() => this.stopPreview(), (durationSeconds + 0.3) * 1000);
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
      this.synth.volume.value = -Infinity;
      this.synth.releaseAll(now);
    }
    this.synth?.dispose();
    this.reverb?.dispose();
    this.synth = null;
    this.reverb = null;
    Tone.Destination.mute = true;
    this.ensureSynthGraph();
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
    if (this.synth) {
      this.synth.volume.value = -Infinity;
      this.synth.releaseAll(now);
    }
    this.synth?.dispose();
    this.reverb?.dispose();
    this.synth = null;
    this.reverb = null;
    this.stopPreview();
    Tone.Transport.stop();
    Tone.Transport.cancel(0);
    Tone.Destination.mute = true;
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
