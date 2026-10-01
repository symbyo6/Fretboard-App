/* eslint-disable react-refresh/only-export-components */
import React, { createContext, useContext, useState, type ReactNode } from 'react';

export type Language = 'es' | 'en';

type TranslationKey =
  | 'spanish' | 'english' | 'language' | 'theoryLocator' | 'key' | 'scale' | 'mode'
  | 'major' | 'harmonicMinor' | 'melodicMinor' | 'diatonicDegrees' | 'tonality'
  | 'enharmonicName' | 'scaleFundamental' | 'romanNumerals' | 'nashvilleNumbers'
  | 'chordPlaying' | 'noChord' | 'triad' | 'tetrad' | 'audioOn' | 'audioOff'
  | 'play' | 'stop' | 'block' | 'ascending' | 'descending' | 'keepLastTab'
  | 'tempo' | 'groups' | 'inversions' | 'closed' | 'chordType' | 'octave'
  | 'fretboard' | 'redFill' | 'redRing' | 'greenFill' | 'blueFill' | 'grayFill'
  | 'scaleNote' | 'chordNote' | 'chordTonic' | 'fundamentalTonicOutsideChord'
  | 'fullFretboard' | 'highlightedFrets' | 'tabSequence' | 'exportFormat' | 'sequenceOctaveLimit';

const translations: Record<Language, Record<TranslationKey, string>> = {
  es: {
    spanish: 'Español', english: 'English', language: 'Idioma', theoryLocator: 'Localizador de teoría en el diapasón de la guitarra',
    key: 'Tonalidad', scale: 'Escala', mode: 'Modo', major: 'Mayor', harmonicMinor: 'Menor armónica', melodicMinor: 'Menor melódica',
    diatonicDegrees: 'Grados diatónicos', tonality: 'Tonalidad', enharmonicName: 'Nombre enarmónico', scaleFundamental: 'Escala fundamental',
    romanNumerals: 'Numerales romanos', nashvilleNumbers: 'Números Nashville', chordPlaying: 'Acorde sonando', noChord: 'Sin acorde',
    triad: 'Tríada', tetrad: 'Tétrada (7)', audioOn: 'Audio: On', audioOff: 'Audio: Off', play: 'Reproducir', stop: 'Detener',
    block: 'Bloque', ascending: 'Ascendente', descending: 'Descendente', keepLastTab: 'Mantener último tab', tempo: 'Tempo', groups: 'Grupos de cuerdas',
    inversions: 'Inversiones', closed: 'Cerrado', chordType: 'Tipo de acorde', octave: 'Octava', fretboard: 'Diapasón',
    redFill: 'Relleno rojo: tónica de la escala activa', redRing: 'Anillo rojo punteado: tónica fundamental fuera del acorde',
    greenFill: 'Relleno verde: tónica del acorde', blueFill: 'Relleno azul: nota del acorde', grayFill: 'Relleno gris: nota de la escala',
    scaleNote: 'Nota de la escala', chordNote: 'Nota del acorde', chordTonic: 'Tónica del acorde', fundamentalTonicOutsideChord: 'Tónica fundamental fuera del acorde',
    fullFretboard: 'Diapasón completo', highlightedFrets: 'frets resaltados', tabSequence: 'tab secuencia de acordes', exportFormat: 'Formato de exportación', sequenceOctaveLimit: 'No hay otra octava global dentro del diapasón',
  },
  en: {
    spanish: 'Español', english: 'English', language: 'Language', theoryLocator: 'Guitar Fretboard Theory Locator', key: 'Key', scale: 'Scale', mode: 'Mode',
    major: 'Major', harmonicMinor: 'Harmonic minor', melodicMinor: 'Melodic minor', diatonicDegrees: 'Diatonic degrees', tonality: 'Key',
    enharmonicName: 'Enharmonic name', scaleFundamental: 'Parent scale', romanNumerals: 'Roman numerals', nashvilleNumbers: 'Nashville numbers',
    chordPlaying: 'Playing chord', noChord: 'No chord', triad: 'Triad', tetrad: 'Tetrad (7)', audioOn: 'Audio: On', audioOff: 'Audio: Off',
    play: 'Play', stop: 'Stop', block: 'Block', ascending: 'Ascending', descending: 'Descending', keepLastTab: 'Keep last tab', tempo: 'Tempo', groups: 'String groups',
    inversions: 'Inversions', closed: 'Closed', chordType: 'Chord type', octave: 'Octave', fretboard: 'Fretboard',
    redFill: 'Red fill: active scale tonic', redRing: 'Dotted red ring: fundamental tonic outside the chord', greenFill: 'Green fill: chord tonic',
    blueFill: 'Blue fill: chord tone', grayFill: 'Gray fill: scale tone', scaleNote: 'Scale tone', chordNote: 'Chord tone', chordTonic: 'Chord tonic',
    fundamentalTonicOutsideChord: 'Fundamental tonic outside the chord', fullFretboard: 'Full fretboard', highlightedFrets: 'highlighted frets', tabSequence: 'chord sequence tab', exportFormat: 'Export format', sequenceOctaveLimit: 'No other global octave fits the fretboard',
  },
};

interface LanguageContextValue { language: Language; setLanguage: (language: Language) => void; t: (key: TranslationKey) => string; }
const LanguageContext = createContext<LanguageContextValue | null>(null);
const STORAGE_KEY = 'fretboard-language-v1';

export function LanguageProvider({ children }: { children: ReactNode }): JSX.Element {
  const [language, setLanguageState] = useState<Language>(() => {
    try { return window.localStorage.getItem(STORAGE_KEY) === 'en' ? 'en' : 'es'; } catch { return 'es'; }
  });
  const setLanguage = (next: Language) => { setLanguageState(next); try { window.localStorage.setItem(STORAGE_KEY, next); } catch { /* storage unavailable */ } };
  return <LanguageContext.Provider value={{ language, setLanguage, t: (key) => translations[language][key] }}>{children}</LanguageContext.Provider>;
}

export function useLanguage(): LanguageContextValue {
  const context = useContext(LanguageContext);
  if (!context) throw new Error('useLanguage must be used inside LanguageProvider');
  return context;
}

export function localizeTheoryName(name: string, language: Language): string {
  if (language === 'es') return name;
  const replacements: Array<[string, string]> = [
    ['Jonio', 'Ionian'], ['Dorio', 'Dorian'], ['Frigio dominante', 'Phrygian dominant'], ['Frigio', 'Phrygian'],
    ['Lidio aumentado', 'Lydian augmented'], ['Lidio dominante', 'Lydian dominant'], ['Lidio', 'Lydian'],
    ['Mixolidio', 'Mixolydian'], ['Locrio', 'Locrian'], ['Ultralocrio', 'Ultralocrian'], ['Alterada', 'Altered'],
    ['Mayor Armónica', 'Harmonic Major'], ['Mayor', 'Major'], ['Menor Natural (Eoleo)', 'Natural Minor (Aeolian)'],
    ['Menor Armónica', 'Harmonic Minor'], ['Menor Melódica', 'Melodic Minor'], ['Menor', 'Minor'],
    ['Pentatónica Mayor', 'Major Pentatonic'], ['Pentatónica Menor', 'Minor Pentatonic'], ['Blues Menor', 'Minor Blues'],
    ['Menor Húngara', 'Hungarian Minor'], ['modo de menor armónica', 'mode of harmonic minor'], ['modo de menor melódica', 'mode of melodic minor'],
  ];
  return replacements.reduce((result, [from, to]) => result.replaceAll(from, to), name);
}
