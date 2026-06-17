import type { Slide, SlideKind, SlideModel } from '../types/slide';

const NOISE_PATTERN = /^(?:[-*_]{3,}|\[[^\]]*\]|\([^\)]*\))$/;
const CHORUS_PATTERN = /^(?:chorus|refrain)[:\-\s]*$/i;
const VERSE_PATTERN = /^(?:verse|v\.?|stanza|st\.?)\s*\d*[:\-\s]*$/i;
const BRIDGE_PATTERN = /^bridge[:\-\s]*$/i;
const STANDALONE_NUMBER_PATTERN = /^\d+[\.\)]?$/;

function normalizeLyrics(lyrics: string): string[] {
  return lyrics.replace(/\r\n/g, '\n').replace(/\r/g, '\n').split('\n');
}

function isBlankOrNoise(line: string): boolean {
  const trimmed = line.trim();
  return trimmed.length === 0 || NOISE_PATTERN.test(trimmed);
}

function isStructuralLabel(line: string): SlideKind | null {
  const trimmed = line.trim();

  if (CHORUS_PATTERN.test(trimmed)) {
    return 'chorus';
  }

  if (VERSE_PATTERN.test(trimmed) || STANDALONE_NUMBER_PATTERN.test(trimmed)) {
    return 'verse';
  }

  if (BRIDGE_PATTERN.test(trimmed)) {
    return 'bridge';
  }

  return null;
}

function createSlide(id: string, kind: SlideKind, title: string, line: string): Slide {
  return {
    id,
    kind,
    title,
    lines: [line],
  };
}

function createSlideFromLines(id: string, kind: SlideKind, title: string, lines: string[]): Slide {
  return {
    id,
    kind,
    title,
    lines,
  };
}

function sectionTitle(kind: SlideKind, count: number): string {
  if (kind === 'chorus') {
    return `Chorus ${count}`;
  }

  if (kind === 'bridge') {
    return `Bridge ${count}`;
  }

  if (kind === 'verse') {
    return `Verse ${count}`;
  }

  return `Section ${count}`;
}

type CleanLine = {
  text: string;
  kind: SlideKind;
};

function collectCleanLines(lyrics: string): CleanLine[] {
  const rows = normalizeLyrics(lyrics);
  let currentKind: SlideKind = 'verse';
  const cleanLines: CleanLine[] = [];

  for (const rawLine of rows) {
    const trimmed = rawLine.trim();

    if (isBlankOrNoise(rawLine)) {
      continue;
    }

    const labelKind = isStructuralLabel(trimmed);

    if (labelKind) {
      currentKind = labelKind;
      continue;
    }

    cleanLines.push({ text: trimmed, kind: currentKind });
  }

  return cleanLines;
}

function groupCleanLines(cleanLines: CleanLine[], linesPerSlide: number): CleanLine[][] {
  const effectiveLinesPerSlide = linesPerSlide === 2 ? 2 : 1;
  const groups: CleanLine[][] = [];

  for (let index = 0; index < cleanLines.length; index += effectiveLinesPerSlide) {
    groups.push(cleanLines.slice(index, index + effectiveLinesPerSlide));
  }

  return groups;
}

export function parseLyricsToSlideModel(lyrics: string, linesPerSlide = 1): SlideModel {
  const cleanLines = collectCleanLines(lyrics);
  const groupedLines = groupCleanLines(cleanLines, linesPerSlide);
  const slides: Slide[] = [];
  let verseCount = 0;
  let chorusCount = 0;
  let bridgeCount = 0;
  let otherCount = 0;

  for (const group of groupedLines) {
    const primaryKind = group[0]?.kind ?? 'other';

    if (primaryKind === 'chorus') {
      chorusCount += 1;
    } else if (primaryKind === 'bridge') {
      bridgeCount += 1;
    } else if (primaryKind === 'verse') {
      verseCount += 1;
    } else {
      otherCount += 1;
    }

    const ordinal =
      primaryKind === 'chorus'
        ? chorusCount
        : primaryKind === 'bridge'
          ? bridgeCount
          : primaryKind === 'verse'
            ? verseCount
            : otherCount;

    slides.push(
      createSlideFromLines(
        `slide-${slides.length + 1}`,
        primaryKind,
        sectionTitle(primaryKind, ordinal),
        group.map((line) => line.text),
      ),
    );
  }

  return {
    hymnNumber: 0,
    title: '',
    slides:
      slides.length > 0
        ? slides
        : [createSlide('slide-1', 'other', 'Section 1', 'No lyric lines available.')],
  };
}
