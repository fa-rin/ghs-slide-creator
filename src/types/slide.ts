export type SlideKind = 'cover' | 'verse' | 'chorus' | 'bridge' | 'other';

export type Slide = {
  id: string;
  kind: SlideKind;
  title: string;
  lines: string[];
};

export type SlideModel = {
  hymnNumber: number;
  title: string;
  slides: Slide[];
};

export type SlidePresentation = SlideModel;
