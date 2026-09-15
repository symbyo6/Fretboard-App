export interface FretboardPdfDetails {
  title?: string;
  scale?: string;
  mode?: string;
  modeFamily?: string;
  modeDegree?: string;
  key?: string;
  notation?: string;
  enharmonic?: string;
  degree?: string;
  degreeLabelMode?: string;
  chord?: string;
  chordType?: string;
  inversion?: string;
  voicing?: string;
  stringGroup?: string;
  fretRange?: string;
  sequenceDirection?: string;
}

export interface FretboardPdfViewBox {
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface FretboardDiagramStep {
  label: string;
  chordName?: string;
  inversion?: number;
  delta?: number | null;
  positions: { string: number; fret: number }[];
  pitches?: number[];
  rootPitch?: number;
  zoneStartFret?: number;
  zoneEndFret?: number;
}

export type FretboardPixelPosition = (position: { string: number; fret: number }) => { x: number; y: number };

async function renderFretboardImage(
  svg: SVGSVGElement,
  viewBox?: FretboardPdfViewBox
): Promise<HTMLCanvasElement> {
  const serializer = new XMLSerializer();
  const exportSvg = viewBox ? svg.cloneNode(true) as SVGSVGElement : svg;
  if (viewBox) {
    exportSvg.setAttribute('viewBox', `${viewBox.x} ${viewBox.y} ${viewBox.width} ${viewBox.height}`);
    exportSvg.setAttribute('width', String(viewBox.width));
    exportSvg.setAttribute('height', String(viewBox.height));
  }
  const svgBlob = new Blob([serializer.serializeToString(exportSvg)], { type: 'image/svg+xml;charset=utf-8' });
  const objectUrl = URL.createObjectURL(svgBlob);

  try {
    const image = new Image();
    image.src = objectUrl;
    await new Promise<void>((resolve, reject) => {
      image.onload = () => resolve();
      image.onerror = () => reject(new Error('No se pudo preparar el diapasón para exportar'));
    });
    const canvas = document.createElement('canvas');
    canvas.width = image.naturalWidth || image.width;
    canvas.height = image.naturalHeight || image.height;
    const context = canvas.getContext('2d');
    if (!context) throw new Error('No se pudo preparar el lienzo del diapasón');
    context.fillStyle = '#fdf6ec';
    context.fillRect(0, 0, canvas.width, canvas.height);
    context.drawImage(image, 0, 0);
    return canvas;
  } finally {
    URL.revokeObjectURL(objectUrl);
  }
}

async function renderSequenceDiagram(
  svg: SVGSVGElement,
  step: FretboardDiagramStep,
  getPixelPosition: FretboardPixelPosition
): Promise<HTMLCanvasElement> {
  const minFret = Math.min(...step.positions.map((position) => position.fret));
  const maxFret = Math.max(...step.positions.map((position) => position.fret));
  const maximumVisibleFrets = 5;
  const actualFretSpan = maxFret - minFret + 1;
  const visibleFretCount = Math.min(maximumVisibleFrets, actualFretSpan);
  const zoneStartFret = step.zoneStartFret ?? minFret;
  const zoneLastFret = Math.min(24, zoneStartFret + visibleFretCount - 1);
  const zoneEndFret = zoneLastFret + 1;
  const firstFretPoint = getPixelPosition({ string: 1, fret: Math.max(zoneStartFret, 1) });
  const nextFretPoint = getPixelPosition({ string: 1, fret: Math.max(zoneStartFret + 1, 2) });
  const fretWidth = Math.max(nextFretPoint.x - firstFretPoint.x, 1);
  const left = zoneStartFret === 0 ? 0 : firstFretPoint.x - fretWidth / 2;
  const endFretPoint = getPixelPosition({ string: 1, fret: zoneEndFret });
  const right = endFretPoint.x + fretWidth / 2;
  const sourceViewBox = svg.getAttribute('viewBox')?.split(/\s+/).map(Number) ?? [0, 0, 0, 0];
  const viewBox: FretboardPdfViewBox = {
    x: left,
    y: 0,
    width: Math.min(right, sourceViewBox[2]) - left,
    height: sourceViewBox[3],
  };
  const clone = svg.cloneNode(true) as SVGSVGElement;
  const chordPitches = new Set(step.pitches ?? []);
  const chordRootPitch = step.rootPitch;
  const chordNoteKeysByString = new Map<number, Set<string>>();
  clone.querySelectorAll<SVGGElement>('[data-fretboard-note="true"]').forEach((note) => {
    const pitch = Number(note.getAttribute('data-note-pitch'));
    const fret = Number(note.getAttribute('data-note-fret'));
    const isChordTone = chordPitches.has(pitch);
    note.querySelectorAll<SVGCircleElement>('[data-note-highlight="true"]').forEach((highlight) => highlight.remove());
    if (!isChordTone || fret < zoneStartFret || fret > zoneLastFret) {
      note.setAttribute('display', 'none');
      return;
    }
    note.removeAttribute('display');
    const string = Number(note.getAttribute('data-note-string'));
    const stringKeys = chordNoteKeysByString.get(string) ?? new Set<string>();
    stringKeys.add(`${string}-${fret}`);
    chordNoteKeysByString.set(string, stringKeys);
    const noteCircle = note.querySelector<SVGCircleElement>('[data-note-body="true"]')
      ?? (() => {
        const circle = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
        circle.setAttribute('data-note-body', 'true');
        circle.setAttribute('r', note.getAttribute('data-note-radius') ?? '11');
        note.appendChild(circle);
        return circle;
      })();
    const isChordRoot = pitch === chordRootPitch;
    noteCircle.setAttribute('fill', isChordRoot ? '#16a34a' : '#6366f1');
    noteCircle.setAttribute('fill-opacity', '1');
    noteCircle.setAttribute('stroke', isChordRoot ? '#166534' : '#4338ca');
    const label = note.getAttribute('data-note-label');
    if (label && !note.querySelector('text[data-note-label="true"]')) {
      const text = document.createElementNS('http://www.w3.org/2000/svg', 'text');
      text.setAttribute('data-note-label', 'true');
      text.setAttribute('y', '4');
      text.setAttribute('text-anchor', 'middle');
      text.setAttribute('font-size', '10');
      text.setAttribute('font-weight', '600');
      text.setAttribute('fill', '#ffffff');
      text.textContent = label;
      note.appendChild(text);
    }
  });
  const highlightedStrings = new Set<number>();
  for (const position of step.positions) {
    if (highlightedStrings.has(position.string)) continue;
    if (position.fret < zoneStartFret || position.fret > zoneLastFret) continue;
    const noteKey = `${position.string}-${position.fret}`;
    if (!chordNoteKeysByString.get(position.string)?.has(noteKey)) continue;
    highlightedStrings.add(position.string);
    const note = clone.querySelector<SVGGElement>(
      `[data-fretboard-note="true"][data-note-string="${position.string}"][data-note-fret="${position.fret}"]`
    );
    if (!note) continue;
    const radius = Number(note.getAttribute('data-note-radius') ?? '11');
    const highlight = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
    highlight.setAttribute('data-note-highlight', 'true');
    highlight.setAttribute('r', String(radius + 7));
    highlight.setAttribute('fill', '#facc15');
    highlight.setAttribute('fill-opacity', '0.22');
    highlight.setAttribute('stroke', '#eab308');
    highlight.setAttribute('stroke-width', '3');
    note.appendChild(highlight);
  }
  const diagramCanvas = await renderFretboardImage(clone, viewBox);
  const header = 128;
  const canvas = document.createElement('canvas');
  canvas.width = diagramCanvas.width;
  canvas.height = diagramCanvas.height + header;
  const context = canvas.getContext('2d');
  if (!context) throw new Error('No se pudo preparar el diagrama de secuencia');
  context.fillStyle = '#fdf6ec';
  context.fillRect(0, 0, canvas.width, canvas.height);
  context.fillStyle = '#166534';
  context.font = 'bold 42px Arial';
  context.fillText(step.chordName ?? step.label, 24, 48);
  context.fillStyle = '#57534e';
  context.font = '16px Arial';
  const details = [step.inversion ? `Inv. ${step.inversion}` : '', step.delta ? `Δ${step.delta}` : ''].filter(Boolean).join('  ·  ');
  context.fillText(`${details}  ·  Trastes ${zoneStartFret}-${zoneLastFret}`, 24, 82);
  context.drawImage(diagramCanvas, 0, header);
  return canvas;
}

export async function downloadFretboardSequence(
  svg: SVGSVGElement,
  steps: FretboardDiagramStep[],
  getPixelPosition: FretboardPixelPosition,
  format: 'pdf' | 'jpeg'
): Promise<void> {
  const diagrams = await Promise.all(steps.map((step) => renderSequenceDiagram(svg, step, getPixelPosition)));
  const columns = 2;
  const gap = 28;
  const width = diagrams[0]?.width ?? 800;
  const height = diagrams[0]?.height ?? 500;
  const rows = Math.max(1, Math.ceil(diagrams.length / columns));
  const canvas = document.createElement('canvas');
  canvas.width = width * columns + gap * (columns + 1);
  canvas.height = height * rows + gap * (rows + 1);
  const context = canvas.getContext('2d');
  if (!context) throw new Error('No se pudo preparar la cuadrícula de diagramas');
  context.fillStyle = '#fdf6ec';
  context.fillRect(0, 0, canvas.width, canvas.height);
  diagrams.forEach((diagram, index) => {
    const column = index % columns;
    const row = Math.floor(index / columns);
    context.drawImage(diagram, gap + column * (width + gap), gap + row * (height + gap));
  });

  if (format === 'jpeg') {
    const link = document.createElement('a');
    link.href = canvas.toDataURL('image/jpeg', 0.95);
    link.download = 'diapason-secuencia-enlazada.jpeg';
    document.body.appendChild(link);
    link.click();
    link.remove();
    return;
  }

  const { jsPDF } = await import('jspdf');
  const pdf = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4', compress: true });
  const margin = 8;
  const pageWidth = pdf.internal.pageSize.getWidth();
  const pageHeight = pdf.internal.pageSize.getHeight();
  const availableWidth = pageWidth - margin * 2;
  const availableHeight = pageHeight - margin * 2;
  const ratio = canvas.width / canvas.height;
  const imageWidth = ratio > availableWidth / availableHeight ? availableWidth : availableHeight * ratio;
  const imageHeight = imageWidth / ratio;
  const imageData = canvas.toDataURL('image/jpeg', 0.9);
  pdf.addImage(imageData, 'JPEG', (pageWidth - imageWidth) / 2, (pageHeight - imageHeight) / 2, imageWidth, imageHeight, undefined, 'FAST');
  pdf.save('diapason-secuencia-enlazada.pdf');
}

function getExportMetadata(details: FretboardPdfDetails): string {
  return [
    details.key && `Tonalidad: ${details.key}`,
    details.scale && `Escala: ${details.scale}`,
    details.mode && `Modo: ${details.mode}`,
    details.modeFamily && `Familia: ${details.modeFamily}`,
    details.modeDegree && `Grado de modo: ${details.modeDegree}`,
    details.notation && `Notación: ${details.notation}`,
    details.enharmonic && `Enarmónico: ${details.enharmonic}`,
    details.degree && `Grado: ${details.degree}`,
    details.degreeLabelMode && `Etiquetas: ${details.degreeLabelMode}`,
    details.chord && `Acorde: ${details.chord}`,
    details.chordType && `Tipo: ${details.chordType}`,
    details.inversion && `Inversión: ${details.inversion}`,
    details.voicing && `Voicing: ${details.voicing}`,
    details.stringGroup && `Cuerdas: ${details.stringGroup}`,
    details.fretRange && `Trastes: ${details.fretRange}`,
    details.sequenceDirection && `Dirección: ${details.sequenceDirection}`,
  ].filter(Boolean).join('  |  ');
}

async function renderFretboardExportCanvas(
  svg: SVGSVGElement,
  details: FretboardPdfDetails,
  viewBox?: FretboardPdfViewBox
): Promise<HTMLCanvasElement> {
  const fretboardCanvas = await renderFretboardImage(svg, viewBox);
  const headerHeight = 230;
  const canvas = document.createElement('canvas');
  canvas.width = fretboardCanvas.width;
  canvas.height = fretboardCanvas.height + headerHeight;
  const context = canvas.getContext('2d');
  if (!context) throw new Error('No se pudo preparar la imagen de exportación');

  context.fillStyle = '#fdf6ec';
  context.fillRect(0, 0, canvas.width, canvas.height);
  if (details.title) {
    context.fillStyle = '#1c1917';
    context.font = 'bold 32px Arial';
    context.fillText(details.title, 32, 42);
  }
  if (details.chord) {
    context.fillStyle = '#166534';
    context.font = 'bold 48px Arial';
    context.fillText(details.chord, 32, 98);
  }
  context.fillStyle = '#78716c';
  context.font = '20px Arial';
  context.textAlign = 'right';
  context.fillText('Creado por Juan Anderson', canvas.width - 32, 42);
  context.textAlign = 'left';
  context.fillStyle = '#1c1917';
  context.font = '16px Arial';
  const metadata = getExportMetadata(details);
  const metadataLines = metadata.match(/.{1,150}(?:\s|$)/g) ?? [];
  metadataLines.slice(0, 5).forEach((line, index) => {
    context.fillText(line.trim(), 32, 138 + index * 22);
  });
  context.drawImage(fretboardCanvas, 0, headerHeight);
  return canvas;
}

export async function downloadFretboardJpeg(
  svg: SVGSVGElement,
  details: FretboardPdfDetails = {},
  viewBox?: FretboardPdfViewBox
): Promise<void> {
  const canvas = await renderFretboardExportCanvas(svg, details, viewBox);
  const link = document.createElement('a');
  link.href = canvas.toDataURL('image/jpeg', 0.95);
  link.download = viewBox ? 'diapason-frets-resaltados.jpeg' : 'diapason.jpeg';
  document.body.appendChild(link);
  link.click();
  link.remove();
}

export async function downloadFretboardPdf(
  svg: SVGSVGElement,
  details: FretboardPdfDetails = {},
  viewBox?: FretboardPdfViewBox
): Promise<void> {
  const { jsPDF } = await import('jspdf');
  const canvas = await renderFretboardExportCanvas(svg, details, viewBox);
  const pngDataUrl = canvas.toDataURL('image/png');
  const pdf = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4', compress: true });
  const margin = 10;
  const pageWidth = pdf.internal.pageSize.getWidth();
  const pageHeight = pdf.internal.pageSize.getHeight();
  const availableWidth = pageWidth - margin * 2;
  const availableHeight = pageHeight - margin * 2;
  const imageRatio = canvas.width / canvas.height;
  const boxRatio = availableWidth / availableHeight;
  const width = imageRatio > boxRatio ? availableWidth : availableHeight * imageRatio;
  const height = width / imageRatio;
  const x = (pageWidth - width) / 2;
  const y = (pageHeight - height) / 2;

  pdf.addImage(pngDataUrl, 'PNG', x, y, width, height);
  pdf.save('diapason.pdf');
}

export interface TabPdfStep {
  label: string;
  chordName?: string;
  inversion?: number;
  positions: { string: number; fret: number }[];
}

interface TabPdfOptions {
  title?: string;
  subtitle: string;
  steps: TabPdfStep[];
}

function drawTabExportCanvas({ title, subtitle, steps }: TabPdfOptions): HTMLCanvasElement {
  const margin = 48;
  const lineGap = 24;
  const systemHeight = 205;
  const columnWidth = 116;
  const columnsPerSystem = 7;
  const systemCount = Math.max(1, Math.ceil(steps.length / columnsPerSystem));
  const canvas = document.createElement('canvas');
  canvas.width = margin * 2 + columnWidth * columnsPerSystem;
  const headerHeight = 165;
  canvas.height = margin * 2 + headerHeight + systemHeight * systemCount;
  const context = canvas.getContext('2d');
  if (!context) throw new Error('No se pudo preparar la tablatura JPEG');

  context.fillStyle = '#ffffff';
  context.fillRect(0, 0, canvas.width, canvas.height);
  if (title) {
    context.fillStyle = '#1c1917';
    context.font = 'bold 28px Arial';
    context.fillText(title, margin, margin + 4);
  }
  context.fillStyle = '#a8a29e';
  context.font = '9px Arial';
  context.textAlign = 'right';
  context.fillText('Creado por Juan Anderson', canvas.width - margin, margin + 2);
  context.textAlign = 'left';
  context.fillStyle = '#1c1917';
  const subtitleLines = subtitle.match(/.{1,105}(?:\s|$)/g) ?? [];
  subtitleLines.slice(0, 4).forEach((line, index) => {
    context.fillText(`Hexagrama de tablatura (6 cuerdas) · ${line.trim()}`, margin, margin + 38 + index * 22);
  });

  for (let index = 0; index < steps.length; index += 1) {
    const systemIndex = Math.floor(index / columnsPerSystem);
    const column = index % columnsPerSystem;
    const x = margin + column * columnWidth + columnWidth / 2;
    const y = margin + headerHeight + systemIndex * systemHeight;
    const positionsByString = new Map(steps[index].positions.map((position) => [position.string, position.fret]));
    context.fillStyle = '#166534';
    context.font = 'bold 32px Arial';
    context.textAlign = 'center';
    const stepLabel = steps[index].chordName ?? steps[index].label;
    context.fillText(stepLabel, x, y);
    if (steps[index].inversion) {
      context.fillStyle = '#57534e';
      context.font = '14px Arial';
      context.fillText(`Inv. ${steps[index].inversion}`, x, y + 18);
    }
    context.font = '16px Courier New';
    for (let string = 1; string <= 6; string += 1) {
      const lineY = y + 38 + (string - 1) * lineGap;
      context.strokeStyle = '#969696';
      context.lineWidth = 1;
      context.beginPath();
      context.moveTo(x - columnWidth / 2, lineY);
      context.lineTo(x + columnWidth / 2, lineY);
      context.stroke();
      context.fillText(String(positionsByString.get(string) ?? 'x'), x, lineY + 17);
    }
  }
  context.textAlign = 'left';
  return canvas;
}

export async function downloadTabJpeg(options: TabPdfOptions): Promise<void> {
  const canvas = drawTabExportCanvas(options);
  const link = document.createElement('a');
  link.href = canvas.toDataURL('image/jpeg', 0.95);
  link.download = 'tablatura-secuencia.jpeg';
  document.body.appendChild(link);
  link.click();
  link.remove();
}

/** Exporta un hexagrama de tablatura monocromo: seis líneas, una por cuerda. */
export async function downloadTabPdf({ title, subtitle, steps }: TabPdfOptions): Promise<void> {
  const { jsPDF } = await import('jspdf');
  const canvas = drawTabExportCanvas({ title, subtitle, steps });
  const pdf = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4', compress: true });
  const margin = 12;
  const pageWidth = pdf.internal.pageSize.getWidth();
  const pageHeight = pdf.internal.pageSize.getHeight();
  const availableWidth = pageWidth - margin * 2;
  const availableHeight = pageHeight - margin * 2;
  const imageRatio = canvas.width / canvas.height;
  const boxRatio = availableWidth / availableHeight;
  const width = imageRatio > boxRatio ? availableWidth : availableHeight * imageRatio;
  const height = width / imageRatio;
  const x = (pageWidth - width) / 2;
  const y = (pageHeight - height) / 2;
  pdf.addImage(canvas.toDataURL('image/png'), 'PNG', x, y, width, height);
  pdf.save('tablatura-secuencia.pdf');
}
