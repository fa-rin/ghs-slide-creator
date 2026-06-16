import PptxGenJS from 'pptxgenjs';
import type { SlidePresentation, SlideKind } from '../types/slide';

export type PptxTheme = 'dark' | 'light';

type ThemePalette = {
  background: string;
  text: string;
  subtle: string;
  accent: string;
  chorusAccent: string;
};

const PALETTES: Record<PptxTheme, ThemePalette> = {
  dark: {
    background: '0A0F1E',
    text: 'FFFFFF',
    subtle: 'CBD5E1',
    accent: '22D3EE',
    chorusAccent: 'F5D76E',
  },
  light: {
    background: 'FFFFFF',
    text: '000000',
    subtle: '475569',
    accent: 'B45309',
    chorusAccent: 'B45309',
  },
};

function getSlideLabel(kind: SlideKind, index: number): 'Title' | 'Verse' | 'Chorus' | 'Bridge' {
  if (index === 0 || kind === 'cover') {
    return 'Title';
  }

  if (kind === 'chorus') {
    return 'Chorus';
  }

  if (kind === 'bridge') {
    return 'Bridge';
  }

  return 'Verse';
}

function getBodyFontSize(lineCount: number): number {
  if (lineCount >= 8) return 26;
  if (lineCount >= 6) return 28;
  if (lineCount >= 4) return 30;
  return 34;
}

export async function exportPresentationToPptx(
  presentation: SlidePresentation,
  theme: PptxTheme,
): Promise<void> {
  const pptx = new PptxGenJS();
  const palette = PALETTES[theme];

  pptx.layout = 'LAYOUT_WIDE';
  pptx.author = 'GHS Auto-Presenter';
  pptx.company = 'GHS Auto-Presenter';
  pptx.subject = presentation.title;
  pptx.title = presentation.title;

  presentation.slides.forEach((slideModel, index) => {
    const slide = pptx.addSlide();
    const isTitle = index === 0 || slideModel.kind === 'cover';
    const isChorus = slideModel.kind === 'chorus';
    const textColor = theme === 'dark' ? 'FFFFFF' : '000000';

    slide.background = {
      fill: palette.background,
    };

    slide.addText(presentation.title || `Hymn ${presentation.hymnNumber}`, {
      x: 0.8,
      y: 0.28,
      w: 11.5,
      h: 0.6,
      fontFace: 'Aptos',
      fontSize: 30,
      bold: true,
      color: textColor,
      margin: 0,
      fit: 'shrink',
      align: 'center',
    });

    slide.addText(`Hymn ${presentation.hymnNumber}`, {
      x: 10.9,
      y: 0.3,
      w: 1.9,
      h: 0.35,
      align: 'right',
      fontFace: 'Aptos',
      fontSize: 12,
      color: palette.subtle,
      margin: 0,
    });

    slide.addText(`${getSlideLabel(slideModel.kind, index)} · Slide ${index + 1}`, {
      x: 0.8,
      y: 0.95,
      w: 2.8,
      h: 0.35,
      fontFace: 'Aptos',
      fontSize: 12,
      bold: true,
      color: palette.accent,
      margin: 0,
    });

    slide.addText(slideModel.lines.length > 0 ? slideModel.lines.join('\n') : 'No lyric lines available.', {
      x: '6%',
      y: '20%',
      w: '88%',
      h: '58%',
      fontFace: 'Aptos',
      fontSize: getBodyFontSize(slideModel.lines.length),
      bold: isTitle,
      italic: isChorus,
      color: isChorus ? palette.chorusAccent : textColor,
      align: 'center',
      valign: 'middle',
      breakLine: false,
      margin: 0,
      fit: 'shrink',
    });
  });

  await pptx.writeFile({ fileName: `${presentation.hymnNumber}-${presentation.title || 'hymn'}.pptx` });
}
