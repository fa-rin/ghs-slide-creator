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

export function parseLyricsToSlideModel(lyrics: string): SlideModel {
  const rows = normalizeLyrics(lyrics);
  const slides: Slide[] = [];
  let currentKind: SlideKind = 'verse';
  let verseCount = 0;
  let chorusCount = 0;
  let bridgeCount = 0;
  let otherCount = 0;

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

    if (currentKind === 'chorus') {
      chorusCount += 1;
    } else if (currentKind === 'bridge') {
      bridgeCount += 1;
    } else if (currentKind === 'verse') {
      verseCount += 1;
    } else {
      otherCount += 1;
    }

    const ordinal =
      currentKind === 'chorus'
        ? chorusCount
        : currentKind === 'bridge'
          ? bridgeCount
          : currentKind === 'verse'
            ? verseCount
            : otherCount;

    slides.push(
      createSlide(
        `slide-${slides.length + 1}`,
        currentKind,
        sectionTitle(currentKind, ordinal),
        trimmed,
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
