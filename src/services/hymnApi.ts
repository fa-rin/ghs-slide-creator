import hymnsDataset from '../data/hymns.json';
import type { ApiResult } from '../types/api';
import type { Hymn } from '../types/hymn';

type HymnDatasetEntry = {
  number: string;
  title: string;
  titleWithHymnNumber: string;
  chorus: string | false;
  verses: string[];
  category: string;
};

type HymnsDataFile = {
  hymns: Record<string, HymnDatasetEntry>;
};

const dataset = hymnsDataset as HymnsDataFile;

function buildLyrics(entry: HymnDatasetEntry): string {
  const sections: string[] = [];

  entry.verses.forEach((verse, index) => {
    sections.push(`Verse ${index + 1}\n${verse}`);

    if (entry.chorus) {
      sections.push(`Chorus\n${entry.chorus}`);
    }
  });

  return sections.join('\n\n');
}

export async function fetchHymnByNumber(hymnNumber: number): Promise<ApiResult<Hymn>> {
  const entry = dataset.hymns[String(hymnNumber)];

  if (!entry) {
    return {
      ok: false,
      error: {
        message: `Hymn ${hymnNumber} was not found in the local dataset.`,
      },
    };
  }

  return {
    ok: true,
    data: {
      hymnNumber: Number(entry.number),
      title: entry.title,
      lyrics: buildLyrics(entry),
    },
  };
}
