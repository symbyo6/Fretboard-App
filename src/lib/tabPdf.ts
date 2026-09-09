import { jsPDF } from 'jspdf';

export interface FretboardPdfDetails {
  title?: string;
  scale?: string;
  mode?: string;
  key?: string;
  chord?: string;
  chordType?: string;
  inversion?: string;
  voicing?: string;
  stringGroup?: string;
}

export interface FretboardPdfViewBox {
  x: number;
  y: number;
  width: number;
  height: number;
}

export async function downloadFretboardPdf(
  svg: SVGSVGElement,
  details: FretboardPdfDetails = {},
  viewBox?: FretboardPdfViewBox
): Promise<void> {
  const serializer = new XMLSerializer();
  const exportSvg = viewBox ? svg.cloneNode(true) as SVGSVGElement : svg;
  if (viewBox) {
    exportSvg.setAttribute(
      'viewBox',
      `${viewBox.x} ${viewBox.y} ${viewBox.width} ${viewBox.height}`
    );
    exportSvg.setAttribute('width', String(viewBox.width));
    exportSvg.setAttribute('height', String(viewBox.height));
  }
  const svgMarkup = serializer.serializeToString(exportSvg);
  const svgBlob = new Blob([svgMarkup], { type: 'image/svg+xml;charset=utf-8' });
  const objectUrl = URL.createObjectURL(svgBlob);

  try {
    const image = new Image();
    image.src = objectUrl;
    await new Promise<void>((resolve, reject) => {
      image.onload = () => resolve();
      image.onerror = () => reject(new Error('No se pudo preparar el diapasón para PDF'));
    });

    const canvas = document.createElement('canvas');
    canvas.width = image.naturalWidth || image.width;
    canvas.height = image.naturalHeight || image.height;
    const context = canvas.getContext('2d');
    if (!context) throw new Error('No se pudo preparar el lienzo del diapasón');
    context.fillStyle = '#fdf6ec';
    context.fillRect(0, 0, canvas.width, canvas.height);
    context.drawImage(image, 0, 0);
    const pngDataUrl = canvas.toDataURL('image/png');

    const pdf = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4', compress: true });
    const margin = 10;
    const headerHeight = 30;
    const pageWidth = pdf.internal.pageSize.getWidth();
    const pageHeight = pdf.internal.pageSize.getHeight();
    const availableWidth = pageWidth - margin * 2;
    const availableHeight = pageHeight - margin * 2 - headerHeight;
    const imageRatio = image.width / image.height;
    const boxRatio = availableWidth / availableHeight;
    const width = imageRatio > boxRatio ? availableWidth : availableHeight * imageRatio;
    const height = width / imageRatio;
    const x = (pageWidth - width) / 2;
    const y = margin + headerHeight + (availableHeight - height) / 2;

    pdf.setFont('helvetica', 'bold');
    pdf.setFontSize(13);
    pdf.text(details.title ?? 'Diapasón', margin, margin);
    if (details.chord) {
      pdf.setFontSize(24);
      pdf.setTextColor(22, 101, 52);
      pdf.text(details.chord, margin, margin + 13);
    }
    pdf.setFont('helvetica', 'normal');
    pdf.setFontSize(8);
    pdf.setTextColor(20);
    const metadata = [
      details.key && `Tonalidad: ${details.key}`,
      details.scale && `Escala: ${details.scale}`,
      details.mode && `Modo: ${details.mode}`,
      details.chord && `Acorde: ${details.chord}`,
      details.chordType && `Tipo: ${details.chordType}`,
      details.inversion && `Inversión: ${details.inversion}`,
      details.voicing && `Voicing: ${details.voicing}`,
      details.stringGroup && `Cuerdas: ${details.stringGroup}`,
    ].filter(Boolean).join('  |  ');
    if (metadata) pdf.text(metadata, margin, margin + 20, { maxWidth: pageWidth - margin * 2 });
    pdf.setFontSize(7);
    pdf.setTextColor(120, 113, 108);
    pdf.text('Creado por Juan Anderson', pageWidth - margin, margin + 26, { align: 'right' });
    pdf.addImage(pngDataUrl, 'PNG', x, y, width, height);
    const pdfBlob = pdf.output('blob');
    const downloadUrl = URL.createObjectURL(pdfBlob);
    const link = document.createElement('a');
    link.href = downloadUrl;
    link.download = 'diapason.pdf';
    document.body.appendChild(link);
    link.click();
    link.remove();
    window.setTimeout(() => URL.revokeObjectURL(downloadUrl), 1000);
  } finally {
    URL.revokeObjectURL(objectUrl);
  }
}

export interface TabPdfStep {
  label: string;
  chordName?: string;
  positions: { string: number; fret: number }[];
}

interface TabPdfOptions {
  title: string;
  subtitle: string;
  steps: TabPdfStep[];
}

/** Exporta un hexagrama de tablatura monocromo: seis líneas, una por cuerda. */
export function downloadTabPdf({ title, subtitle, steps }: TabPdfOptions): void {
  const pdf = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4', compress: true });
  const margin = 12;
  const pageWidth = pdf.internal.pageSize.getWidth();
  const pageHeight = pdf.internal.pageSize.getHeight();
  const lineGap = 3.2;
  const systemHeight = 30;
  const columnWidth = 18;
  const tabLeft = margin + 12;
  const tabRight = pageWidth - margin;
  const columnsPerSystem = Math.max(1, Math.floor((tabRight - tabLeft) / columnWidth));
  let y = margin;

  const drawHeader = () => {
    pdf.setFont('helvetica', 'bold');
    pdf.setFontSize(12);
    pdf.text(title, margin, y);
    y += 6;
    pdf.setFont('helvetica', 'normal');
    pdf.setFontSize(7);
    pdf.text(`Hexagrama de tablatura (6 cuerdas) · ${subtitle}`, margin, y);
    pdf.setTextColor(120, 113, 108);
    pdf.text('Creado por Juan Anderson', pageWidth - margin, y, { align: 'right' });
    pdf.setTextColor(20);
    y += 7;
  };

  const drawSystem = (systemSteps: TabPdfStep[], startIndex: number) => {
    if (y + systemHeight > pageHeight - margin) {
      pdf.addPage();
      y = margin;
      drawHeader();
    }

    const columnX = (column: number) => tabLeft + column * columnWidth;
    pdf.setFont('courier', 'normal');
    pdf.setFontSize(6);

    systemSteps.forEach((step, column) => {
      const positionsByString = new Map(step.positions.map((position) => [position.string, position.fret]));
      const x = columnX(column);
      pdf.setFont('helvetica', 'bold');
      pdf.setFontSize(6);
      pdf.setTextColor(20);
      pdf.text(step.chordName ?? step.label, x, y, { align: 'center', maxWidth: columnWidth - 1 });

      for (let string = 1; string <= 6; string += 1) {
        const lineY = y + 4 + (string - 1) * lineGap;
        pdf.setDrawColor(150);
        pdf.setLineWidth(0.15);
        pdf.line(x - columnWidth / 2, lineY, x + columnWidth / 2, lineY);
        const fret = positionsByString.get(string);
        pdf.setFont('courier', 'normal');
        pdf.setFontSize(6);
        pdf.setTextColor(20);
        pdf.text(fret === undefined ? 'x' : String(fret), x, lineY + 0.8, { align: 'center' });
      }
    });

    y += systemHeight;
  };

  drawHeader();
  for (let index = 0; index < steps.length; index += columnsPerSystem) {
    drawSystem(steps.slice(index, index + columnsPerSystem), index);
  }
  pdf.save('tablatura-secuencia.pdf');
}
