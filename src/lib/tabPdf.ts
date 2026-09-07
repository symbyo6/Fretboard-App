import { jsPDF } from 'jspdf';

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
