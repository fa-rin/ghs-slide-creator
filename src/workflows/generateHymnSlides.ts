import type { ApiResult } from '../types/api';
import type { Hymn } from '../types/hymn';
import type { SlidePresentation } from '../types/slide';
import { fetchHymnByNumber } from '../services/hymnApi';
import { parseLyricsToSlideModel } from '../lib/parseLyrics';

export async function generateHymnSlides(
  hymnNumber: number,
): Promise<ApiResult<SlidePresentation>> {
  const hymnResult = await fetchHymnByNumber(hymnNumber);

  if (!hymnResult.ok) {
    return hymnResult;
  }

  const hymn: Hymn = hymnResult.data;
  const slideModel = parseLyricsToSlideModel(hymn.lyrics);

  return {
    ok: true,
    data: {
      hymnNumber: hymn.hymnNumber,
      title: hymn.title,
      slides: slideModel.slides,
    },
  };
}
