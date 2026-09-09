// src/lib/audio/audioEngine.ts

import * as Tone from 'tone';

/**
 * Motor de audio singleton. Se instancia una sola vez para toda la app.
 * `unlock()` debe llamarse desde un click o tap del usuario.
 */
class AudioEngine {
  private synth: Tone.PolySynth<Tone.Synth> | null = null;
  private reverb: Tone.Reverb | null = null;
  private isUnlockedFlag = false;
  private isMutedFlag = false;
  private volumeDb = -6;

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
    if (this.isUnlockedFlag && context.state === 'running') return;

    await Tone.start();
    if (context.state !== 'running') {
      await context.resume();
    }
    this.ensureSynthGraph();
    this.isUnlockedFlag = true;
  }

  private ensureSynthGraph(): void {
    if (this.synth) return;

    this.reverb = new Tone.Reverb({ decay: 1.6, wet: 0.16 }).toDestination();
    this.synth = new Tone.PolySynth(Tone.Synth, {
      oscillator: { type: 'triangle' },
      envelope: { attack: 0.006, decay: 0.35, sustain: 0.22, release: 0.9 },
    }).connect(this.reverb);

    this.synth.volume.value = -6;
  }

  /** Toca una sola nota. */
  playNote(noteName: string, durationSeconds = 0.8, velocity = 0.85): void {
    if (!this.synth || this.isMutedFlag) return;
    this.synth.triggerAttackRelease(noteName, durationSeconds, undefined, velocity);
  }

  /** Toca un conjunto de notas simultáneamente. */
  playChord(noteNames: string[], durationSeconds = 1.4, velocity = 0.75): void {
    if (!this.synth || this.isMutedFlag || noteNames.length === 0) return;
    this.synth.triggerAttackRelease(noteNames, durationSeconds, undefined, velocity);
  }

  /** Toca las notas sucesivamente usando el reloj de audio de Tone.js. */
  playArpeggio(
    noteNames: string[],
    noteSpacingSeconds = 0.18,
    durationSeconds = 0.6,
    onNoteStart?: (index: number) => void,
    startTime = Tone.now()
  ): void {
    if (!this.synth || this.isMutedFlag || noteNames.length === 0) return;

    noteNames.forEach((note, index) => {
      this.synth!.triggerAttackRelease(
        note,
        durationSeconds,
        startTime + index * noteSpacingSeconds,
        0.8
      );
      if (onNoteStart) {
        Tone.Draw.schedule(() => onNoteStart(index), startTime + index * noteSpacingSeconds);
      }
    });
  }

  /** Detiene sonidos activos y cancela progresiones programadas. */
  stopAll(): void {
    this.synth?.releaseAll();
    Tone.Transport.stop();
    Tone.Transport.cancel();
  }

  setVolumeDb(db: number): void {
    if (this.synth) this.synth.volume.value = db;
  }

  /** Libera recursos para tests o hot reload. */
  dispose(): void {
    this.synth?.dispose();
    this.reverb?.dispose();
    this.synth = null;
    this.reverb = null;
    this.isUnlockedFlag = false;
  }
}

/** Instancia única compartida por toda la aplicación. */
export const audioEngine = new AudioEngine();
