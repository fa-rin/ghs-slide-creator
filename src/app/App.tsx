import { useEffect, useRef, useState } from 'react';
import AppProviders from './providers/AppProviders';
import { generateHymnSlides } from '../workflows/generateHymnSlides';
import { exportPresentationToPptx } from '../services/pptxExport';
import hymnsDatabase from '../data/hymns.json';
import type { ApiResult } from '../types/api';
import type { Slide, SlidePresentation } from '../types/slide';

type ThemeMode = 'dark' | 'light';

type BeforeInstallPromptEvent = Event & {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed'; platform: string }>;
};

type HymnSuggestion = {
  number: string;
  title: string;
};

const hymnsList = Object.values(hymnsDatabase.hymns) as HymnSuggestion[];

function isValidHymnNumber(value: string): boolean {
  if (!value.trim()) {
    return false;
  }

  const parsed = Number(value);
  return Number.isInteger(parsed) && parsed > 0;
}

function getSlideTypeLabel(slide: Slide, index: number): 'Title' | 'Verse' | 'Chorus' | 'Bridge' {
  if (index === 0 || slide.kind === 'cover') {
    return 'Title';
  }

  if (slide.kind === 'chorus') {
    return 'Chorus';
  }

  if (slide.kind === 'bridge') {
    return 'Bridge';
  }

  return 'Verse';
}

function isTypingTarget(target: EventTarget | null): boolean {
  if (!(target instanceof HTMLElement)) {
    return false;
  }

  return Boolean(target.closest('input, textarea, select, [contenteditable="true"]'));
}

function buildProjectorHtml(theme: ThemeMode): string {
  const background = theme === 'dark' ? '#0A0F1E' : '#FFFFFF';
  const text = theme === 'dark' ? '#FFFFFF' : '#000000';
  const subtle = theme === 'dark' ? '#CBD5E1' : '#475569';
  const chorusAccent = theme === 'dark' ? '#ECC94B' : '#DD6B20';

  return `<!doctype html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>GHS Projector</title>
    <style>
      html, body {
        width: 100%;
        height: 100%;
        margin: 0;
        overflow: hidden;
        background: ${background};
      }
      body {
        display: flex;
        align-items: center;
        justify-content: center;
        text-align: center;
        font-family: Arial, Helvetica, sans-serif;
      }
      .frame {
        box-sizing: border-box;
        width: 100%;
        height: 100%;
        padding: 10%;
        display: flex;
        flex-direction: column;
        align-items: center;
        justify-content: center;
        gap: 1rem;
      }
      .meta {
        font-size: 1rem;
        letter-spacing: 0.22em;
        text-transform: uppercase;
        color: ${subtle};
      }
      .line {
        width: 100%;
        max-width: 100%;
        font-size: clamp(3rem, 5vw, 7rem);
        line-height: 1.15;
        font-weight: 700;
        color: ${text};
        white-space: pre-wrap;
        word-break: normal;
        overflow-wrap: anywhere;
      }
      .chorus {
        font-style: italic;
        color: ${chorusAccent};
      }
      .empty {
        font-size: clamp(1.25rem, 2vw, 2rem);
        color: ${subtle};
        font-weight: 500;
      }
    </style>
  </head>
  <body>
    <div class="frame">
      <div id="meta" class="meta">Awaiting slide...</div>
      <div id="projector-text" class="line empty">Open the dashboard and generate a hymn to begin.</div>
    </div>
    <script>
      (function () {
        window.addEventListener('keydown', function (e) {
          if (e.key === 'ArrowRight' || e.key === ' ') {
            if (window.opener && !window.opener.closed) {
              window.opener.postMessage({ action: 'nextSlide' }, '*');
            }
          } else if (e.key === 'ArrowLeft') {
            if (window.opener && !window.opener.closed) {
              window.opener.postMessage({ action: 'prevSlide' }, '*');
            }
          }
        });
      })();
    </script>
  </body>
</html>`;
}

function updateProjectorWindow(
  projectorWindow: Window,
  theme: ThemeMode,
  hymnTitle: string,
  hymnNumber: number | null,
  currentLineText: string,
  isChorus: boolean,
) {
  const doc = projectorWindow.document;
  const projectorText = doc.getElementById('projector-text');
  const projectorMeta = doc.getElementById('meta');

  if (doc.body) {
    doc.body.style.background = theme === 'dark' ? '#0A0F1E' : '#FFFFFF';
    doc.body.style.margin = '0';
    doc.body.style.overflow = 'hidden';
  }

  if (doc.documentElement) {
    doc.documentElement.style.background = theme === 'dark' ? '#0A0F1E' : '#FFFFFF';
    doc.documentElement.style.margin = '0';
    doc.documentElement.style.overflow = 'hidden';
  }

  if (projectorMeta) {
    projectorMeta.textContent = hymnTitle ? `${hymnTitle} · ${hymnNumber ?? ''}` : 'Awaiting slide...';
  }

  if (projectorText) {
    projectorText.innerText = currentLineText || 'No slide is active.';
    projectorText.classList.remove('empty', 'chorus');
    projectorText.style.fontStyle = isChorus ? 'italic' : 'normal';
    projectorText.style.color = isChorus
      ? theme === 'dark'
        ? '#ECC94B'
        : '#DD6B20'
      : theme === 'dark'
        ? '#FFFFFF'
        : '#000000';

    if (!currentLineText) {
      projectorText.classList.add('empty');
    }

    if (isChorus) {
      projectorText.classList.add('chorus');
    }
  }
}

function SlideCard({
  slide,
  theme,
  index,
  active,
  onSelect,
}: {
  slide: Slide;
  theme: ThemeMode;
  index: number;
  active: boolean;
  onSelect: () => void;
}) {
  const isTitle = index === 0 || slide.kind === 'cover';
  const isChorus = slide.kind === 'chorus';
  const cardClass =
    theme === 'dark'
      ? isTitle
        ? 'border-amber-400/50 bg-gradient-to-br from-slate-950 to-slate-900 text-slate-100'
        : isChorus
          ? 'border-cyan-400/40 bg-cyan-400/10 text-cyan-50'
          : 'border-slate-700 bg-slate-950 text-slate-100'
      : isTitle
        ? 'border-amber-400/50 bg-gradient-to-br from-amber-50 to-white text-amber-950'
        : isChorus
          ? 'border-amber-400/50 bg-amber-50 text-amber-950'
          : 'border-slate-200 bg-white text-slate-900';

  return (
    <article
      role="button"
      tabIndex={0}
      onClick={onSelect}
      onKeyDown={(event) => {
        if (event.key === 'Enter' || event.key === ' ') {
          event.preventDefault();
          onSelect();
        }
      }}
      className={`flex min-h-56 cursor-pointer flex-col rounded-2xl border p-4 shadow-sm outline-none transition ${
        isTitle ? 'ring-1 ring-amber-400/30' : ''
      } ${active ? 'ring-2 ring-emerald-400' : ''} ${cardClass}`}
    >
      <div className="flex items-center justify-between gap-3 text-xs font-semibold uppercase tracking-[0.24em] opacity-70">
        <div>{getSlideTypeLabel(slide, index)}</div>
        <div>Slide {index + 1}</div>
      </div>
      <div className="mt-4 flex-1 space-y-2 px-2 text-center text-lg font-medium leading-7">
        <div className="text-sm font-semibold uppercase tracking-[0.18em] opacity-70">
          {slide.title}
        </div>
        <div className="space-y-2 pt-2">
          {slide.lines.length > 0 ? (
            slide.lines.map((line, lineIndex) => <div key={`${slide.id}-${lineIndex}`}>{line}</div>)
          ) : (
            <div className="text-sm opacity-70">No lyric lines available.</div>
          )}
        </div>
      </div>
    </article>
  );
}

function ThemeToggle({
  theme,
  onChange,
}: {
  theme: ThemeMode;
  onChange: (mode: ThemeMode) => void;
}) {
  return (
    <div className="inline-flex rounded-full bg-slate-100 p-1 text-sm font-medium text-slate-600">
      <button
        type="button"
        onClick={() => onChange('light')}
        className={`rounded-full px-3 py-1 transition ${theme === 'light' ? 'bg-white shadow-sm' : ''}`}
      >
        Light
      </button>
      <button
        type="button"
        onClick={() => onChange('dark')}
        className={`rounded-full px-3 py-1 transition ${theme === 'dark' ? 'bg-white shadow-sm' : ''}`}
      >
        Dark
      </button>
    </div>
  );
}

function LayoutToggle({
  linesPerSlide,
  onChange,
  isDark,
}: {
  linesPerSlide: number;
  onChange: (value: number) => void;
  isDark: boolean;
}) {
  const shellClass = isDark ? 'bg-slate-900 text-slate-300' : 'bg-slate-100 text-slate-600';
  const activeClass = isDark ? 'bg-slate-700 text-white shadow-sm' : 'bg-white text-slate-900 shadow-sm';

  return (
    <div className={`inline-flex rounded-full p-1 text-sm font-medium ${shellClass}`}>
      <button
        type="button"
        onClick={() => onChange(1)}
        aria-pressed={linesPerSlide === 1}
        className={`rounded-full px-3 py-1 transition ${linesPerSlide === 1 ? activeClass : ''}`}
      >
        1 Line
      </button>
      <button
        type="button"
        onClick={() => onChange(2)}
        aria-pressed={linesPerSlide === 2}
        className={`rounded-full px-3 py-1 transition ${linesPerSlide === 2 ? activeClass : ''}`}
      >
        2 Lines
      </button>
    </div>
  );
}

function InstallAppIcon() {
  return (
    <svg viewBox="0 0 20 20" aria-hidden="true" className="h-4 w-4 fill-current">
      <path d="M10 1a1 1 0 0 1 1 1v7.59l2.3-2.3a1 1 0 1 1 1.4 1.42l-4 4a1 1 0 0 1-1.4 0l-4-4a1 1 0 0 1 1.4-1.42L9 9.59V2a1 1 0 0 1 1-1Zm-7 12a1 1 0 0 1 1 1v2a1 1 0 0 0 1 1h10a1 1 0 0 0 1-1v-2a1 1 0 1 1 2 0v2a3 3 0 0 1-3 3H5a3 3 0 0 1-3-3v-2a1 1 0 0 1 1-1Z" />
    </svg>
  );
}

export default function App() {
  const [hymnNumberInput, setHymnNumberInput] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [filteredSuggestions, setFilteredSuggestions] = useState<HymnSuggestion[]>([]);
  const [showDropdown, setShowDropdown] = useState(false);
  const [linesPerSlide, setLinesPerSlide] = useState(1);
  const [installPromptEvent, setInstallPromptEvent] = useState<BeforeInstallPromptEvent | null>(
    null,
  );
  const [showInstallButton, setShowInstallButton] = useState(false);
  const [theme, setTheme] = useState<ThemeMode>('dark');
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [workflowResult, setWorkflowResult] = useState<ApiResult<SlidePresentation> | null>(null);
  const [activeSlideIndex, setActiveSlideIndex] = useState<number | null>(null);

  const projectorWindowRef = useRef<Window | null>(null);
  const skipSearchSyncRef = useRef(false);

  const slides = workflowResult?.ok ? workflowResult.data.slides : [];
  const hymnNumber = workflowResult?.ok ? workflowResult.data.hymnNumber : null;
  const hymnTitle = workflowResult?.ok ? workflowResult.data.title : '';
  const hasSuccess = Boolean(workflowResult?.ok);
  const isDark = theme === 'dark';
  const themeStyles = {
    appBg: isDark ? 'bg-[#0A0F1E]' : 'bg-[#F8FAFC]',
    cardBg: isDark ? 'bg-[#1E293B]' : 'bg-[#FFFFFF]',
    textMain: isDark ? 'text-white' : 'text-slate-900',
    textMuted: isDark ? 'text-slate-400' : 'text-slate-500',
    inputBg: isDark
      ? 'bg-[#0A0F1E] text-white border-slate-700'
      : 'bg-white text-slate-900 border-slate-200',
    exportButton: isDark
      ? 'border-slate-700 bg-slate-900 text-slate-200 hover:bg-slate-800'
      : 'border-slate-200 bg-white text-slate-700 hover:bg-slate-50',
    installButton: isDark
      ? 'border-cyan-400/30 bg-cyan-400/10 text-cyan-100 hover:bg-cyan-400/20'
      : 'border-cyan-600/20 bg-cyan-50 text-cyan-900 hover:bg-cyan-100',
  };

  useEffect(() => {
    const handler = (event: Event) => {
      const installEvent = event as BeforeInstallPromptEvent;
      installEvent.preventDefault();
      setInstallPromptEvent(installEvent);
      setShowInstallButton(true);
    };

    const installedHandler = () => {
      setShowInstallButton(false);
      setInstallPromptEvent(null);
    };

    window.addEventListener('beforeinstallprompt', handler);
    window.addEventListener('appinstalled', installedHandler);

    if (window.matchMedia('(display-mode: standalone)').matches) {
      setShowInstallButton(false);
      setInstallPromptEvent(null);
    }

    return () => {
      window.removeEventListener('beforeinstallprompt', handler);
      window.removeEventListener('appinstalled', installedHandler);
    };
  }, []);

  useEffect(() => {
    if (skipSearchSyncRef.current) {
      skipSearchSyncRef.current = false;
      return;
    }

    const query = searchQuery.trim().toLowerCase();

    if (!query) {
      setFilteredSuggestions([]);
      setShowDropdown(false);
      return;
    }

    const matches = hymnsList
      .filter((hymn) => hymn.title.toLowerCase().includes(query))
      .slice(0, 20);

    setFilteredSuggestions(matches);
    setShowDropdown(matches.length > 0);
  }, [searchQuery]);

  useEffect(() => {
    if (!hasSuccess) {
      if (activeSlideIndex !== null) {
        setActiveSlideIndex(null);
      }
      return;
    }

    if (slides.length === 0) {
      if (activeSlideIndex !== null) {
        setActiveSlideIndex(null);
      }
      return;
    }

    if (activeSlideIndex === null || activeSlideIndex >= slides.length) {
      setActiveSlideIndex(0);
    }
  }, [activeSlideIndex, hasSuccess, slides.length]);

  useEffect(() => {
    if (!workflowResult?.ok || loading) {
      return;
    }

    const currentHymnNumber = workflowResult.data.hymnNumber;
    void runGenerate(String(currentHymnNumber), linesPerSlide);
  }, [linesPerSlide]);

  useEffect(() => {
    const handleProjectionMessage = (event: MessageEvent) => {
      if (!event.data || typeof event.data !== 'object') {
        return;
      }

      if (!slides.length) {
        return;
      }

      const { action } = event.data as { action?: string };

      if (action === 'nextSlide') {
        setActiveSlideIndex((current) => {
          if (current === null) {
            return 0;
          }

          return Math.min(current + 1, slides.length - 1);
        });
      }

      if (action === 'prevSlide') {
        setActiveSlideIndex((current) => {
          if (current === null) {
            return 0;
          }

          return Math.max(current - 1, 0);
        });
      }
    };

    window.addEventListener('message', handleProjectionMessage);
    return () => window.removeEventListener('message', handleProjectionMessage);
  }, [slides.length]);

  useEffect(() => {
    const win = projectorWindowRef.current;
    if (!win || win.closed) {
      return;
    }

    const activeSlide = activeSlideIndex !== null ? slides[activeSlideIndex] : null;
    const activeSlideText = activeSlide?.lines.join('\n') ?? '';

    updateProjectorWindow(
      win,
      theme,
      hymnTitle,
      hymnNumber,
      activeSlideText,
      activeSlide?.kind === 'chorus',
    );
  }, [activeSlideIndex, hymnNumber, hymnTitle, slides, theme, workflowResult]);

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (isTypingTarget(event.target)) {
        return;
      }

      if (!slides.length) {
        return;
      }

      if (event.key === 'ArrowRight' || event.key === ' ') {
        event.preventDefault();
        setActiveSlideIndex((current) => {
          if (current === null) {
            return 0;
          }

          return Math.min(current + 1, slides.length - 1);
        });
        return;
      }

      if (event.key === 'ArrowLeft') {
        event.preventDefault();
        setActiveSlideIndex((current) => {
          if (current === null) {
            return 0;
          }

          return Math.max(current - 1, 0);
        });
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [slides.length]);

  async function runGenerate(hymnNumberValue: string, layoutLinesPerSlide = linesPerSlide) {
    if (!isValidHymnNumber(hymnNumberValue)) {
      setErrorMessage('Please enter a valid hymn number.');
      setWorkflowResult(null);
      setActiveSlideIndex(null);
      return;
    }

    setLoading(true);
    setErrorMessage('');
    setShowDropdown(false);

    try {
      const result = await generateHymnSlides(Number(hymnNumberValue), layoutLinesPerSlide);
      console.log('generateHymnSlides result:', result);
      setWorkflowResult(result);

      if (result.ok) {
        setActiveSlideIndex(result.data.slides.length > 0 ? 0 : null);
      } else {
        setActiveSlideIndex(null);
        setErrorMessage(result.error.message);
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unexpected pipeline failure.';
      setWorkflowResult(null);
      setActiveSlideIndex(null);
      setErrorMessage(message);
    } finally {
      setLoading(false);
    }
  }

  async function handleGenerateClick() {
    await runGenerate(hymnNumberInput);
  }

  async function handleSuggestionSelect(song: HymnSuggestion) {
    skipSearchSyncRef.current = true;
    setHymnNumberInput(song.number);
    setSearchQuery(song.title);
    setFilteredSuggestions([]);
    setShowDropdown(false);
    await runGenerate(song.number);
  }

  async function handleExportClick() {
    if (!workflowResult?.ok) {
      return;
    }

    try {
      await exportPresentationToPptx(workflowResult.data, theme);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to export PowerPoint.';
      setErrorMessage(message);
      console.error('Export PPT error:', error);
    }
  }

  async function handleInstallClick() {
    if (!installPromptEvent) {
      return;
    }

    await installPromptEvent.prompt();
    const choiceResult = await installPromptEvent.userChoice;

    if (choiceResult.outcome === 'accepted') {
      setShowInstallButton(false);
    }

    setInstallPromptEvent(null);
  }

  function handleGoLiveClick(event: React.MouseEvent<HTMLButtonElement>) {
    event.preventDefault();

    const activeSlide = activeSlideIndex !== null ? slides[activeSlideIndex] : null;
    const activeSlideText = activeSlide?.lines.join('\n') ?? '';

    if (projectorWindowRef.current && !projectorWindowRef.current.closed) {
      projectorWindowRef.current.focus();
      updateProjectorWindow(
        projectorWindowRef.current,
        theme,
        hymnTitle,
        hymnNumber,
        activeSlideText,
        activeSlide?.kind === 'chorus',
      );
      return;
    }

    const projectorWindow = window.open(
      '',
      'GHS_Projector',
      'width=1920,height=1080,menubar=no,status=no,toolbar=no,scrollbars=no',
    );

    if (!projectorWindow) {
      setErrorMessage('Unable to open the projector window. Please allow popups and try again.');
      return;
    }

    projectorWindowRef.current = projectorWindow;
    projectorWindow.document.open();
    projectorWindow.document.write(buildProjectorHtml(theme));
    projectorWindow.document.close();
    projectorWindow.focus();

    updateProjectorWindow(
      projectorWindow,
      theme,
      hymnTitle,
      hymnNumber,
      activeSlideText,
      activeSlide?.kind === 'chorus',
    );
  }

  return (
    <AppProviders>
      <main className={`min-h-screen ${themeStyles.appBg} ${themeStyles.textMain}`}>
        <div className="mx-auto flex min-h-screen w-full max-w-7xl flex-col gap-6 p-6 lg:p-8">
          <header className={`rounded-3xl p-6 shadow-soft ${themeStyles.cardBg}`}>
            <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
              <div>
                <p className={`text-sm font-medium uppercase tracking-[0.24em] ${themeStyles.textMuted}`}>
                  GHS Auto-Presenter Slide Generator
                </p>
                <h1 className={`mt-2 text-3xl font-semibold tracking-tight ${themeStyles.textMain}`}>
                  Slide Generator
                </h1>
              </div>
              <div className="flex flex-wrap items-center gap-3">
                <LayoutToggle
                  linesPerSlide={linesPerSlide}
                  onChange={setLinesPerSlide}
                  isDark={isDark}
                />
                {showInstallButton ? (
                  <button
                    type="button"
                    onClick={() => {
                      void handleInstallClick();
                    }}
                    className={`inline-flex items-center gap-2 rounded-full border px-4 py-2 text-sm font-medium transition ${themeStyles.installButton}`}
                  >
                    <InstallAppIcon />
                    Install Desktop App
                  </button>
                ) : null}
                <ThemeToggle theme={theme} onChange={setTheme} />
              </div>
            </div>
          </header>

          <div className="grid gap-6 lg:grid-cols-[1.1fr_0.9fr]">
            <section className={`rounded-3xl p-6 shadow-soft ${themeStyles.cardBg}`}>
              <div className="space-y-4">
                <div>
                  <h2 className={`text-xl font-semibold ${themeStyles.textMain}`}>
                    Hymn Lookup
                  </h2>
                  <p className={`mt-1 text-sm ${themeStyles.textMuted}`}>
                    Enter a hymn number to fetch lyrics and prepare slides.
                  </p>
                </div>

                <div className="space-y-3">
                  <div className={`relative ${showDropdown && filteredSuggestions.length > 0 ? 'pb-64' : ''}`}>
                    <label className="block text-sm font-medium text-slate-700 dark:text-slate-300" htmlFor="song-title-search">
                      Search by Song Title
                    </label>
                    <input
                      id="song-title-search"
                      type="text"
                      value={searchQuery}
                      onChange={(event) => setSearchQuery(event.target.value)}
                      onFocus={() => {
                        if (searchQuery.trim()) {
                          setShowDropdown(filteredSuggestions.length > 0);
                        }
                      }}
                      placeholder="Type a song title"
                      className={`mt-1 w-full rounded-xl border px-4 py-2 text-sm outline-none transition placeholder:text-slate-400 focus:border-slate-400 ${themeStyles.inputBg}`}
                    />

                    {showDropdown && filteredSuggestions.length > 0 ? (
                      <div
                        className={`absolute z-50 mt-2 max-h-60 w-full overflow-y-auto rounded-md border shadow-lg ${themeStyles.cardBg} ${isDark ? 'border-slate-700' : 'border-slate-200'}`}
                      >
                        {filteredSuggestions.map((song) => (
                          <button
                            key={song.number}
                            type="button"
                            onMouseDown={(event) => event.preventDefault()}
                            onClick={() => {
                              void handleSuggestionSelect(song);
                            }}
                            className={`block w-full border-b px-4 py-3 text-left text-sm transition last:border-b-0 ${isDark ? 'border-slate-700 hover:bg-slate-900' : 'border-slate-100 hover:bg-slate-50'} ${themeStyles.textMain}`}
                          >
                            GHS {song.number} - {song.title}
                          </button>
                        ))}
                      </div>
                    ) : null}
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-slate-700 dark:text-slate-300" htmlFor="hymn-number">
                      Hymn Number
                    </label>
                  </div>
                  <input
                    id="hymn-number"
                    type="number"
                    min="1"
                    step="1"
                    value={hymnNumberInput}
                    onChange={(event) => setHymnNumberInput(event.target.value)}
                    placeholder="Enter Hymn Number"
                    className={`w-full rounded-xl border px-4 py-2 text-sm outline-none transition placeholder:text-slate-400 focus:border-slate-400 ${themeStyles.inputBg}`}
                  />
                  <button
                    type="button"
                    onClick={handleGenerateClick}
                    disabled={loading}
                    className="inline-flex items-center justify-center rounded-xl bg-slate-950 px-4 py-2 text-sm font-medium text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    {loading ? 'Loading...' : 'Fetch & Generate'}
                  </button>

                  <div className={`flex flex-wrap items-center gap-3 pt-1 ${hasSuccess ? '' : 'opacity-60'}`}>
                    <button
                      type="button"
                      onClick={handleGoLiveClick}
                      disabled={!hasSuccess || slides.length === 0}
                      className="inline-flex items-center justify-center rounded-xl bg-emerald-600 px-4 py-2 text-sm font-medium text-white shadow-lg shadow-emerald-500/30 transition hover:bg-emerald-500 disabled:cursor-not-allowed disabled:opacity-60"
                    >
                      Go Live
                    </button>
                    <button
                      type="button"
                      onClick={handleExportClick}
                      disabled={!hasSuccess || slides.length === 0}
                      className={`inline-flex items-center justify-center rounded-xl border px-4 py-2 text-sm font-medium transition disabled:cursor-not-allowed disabled:opacity-60 ${themeStyles.exportButton}`}
                    >
                      Generate PowerPoint
                    </button>
                  </div>

                  {errorMessage ? (
                    <div className="rounded-xl border border-red-400/40 bg-red-50 px-4 py-3 text-sm text-red-700">
                      {errorMessage}
                    </div>
                  ) : null}

                  {hasSuccess ? (
                    <div className="space-y-1 rounded-xl border border-emerald-400/30 bg-emerald-50 px-4 py-3 text-sm text-emerald-900">
                      <div className="font-semibold">Success</div>
                      <div>Title: {hymnTitle}</div>
                      <div>Hymn Number: {hymnNumber}</div>
                      <div>Slide Count: {slides.length}</div>
                      <div>
                        Active Slide: {activeSlideIndex !== null ? activeSlideIndex + 1 : 'None'}
                      </div>
                    </div>
                  ) : null}
                </div>
              </div>
            </section>

            <section className={`rounded-3xl p-6 shadow-soft ${themeStyles.cardBg} ${themeStyles.textMain}`}>
              <div className="space-y-4">
                <div>
                  <h2 className={`text-xl font-semibold ${themeStyles.textMain}`}>Preview</h2>
                  <p className={`mt-1 text-sm ${themeStyles.textMuted}`}>
                    Slide rendering will appear here after hymn parsing.
                  </p>
                </div>

                <div className="grid gap-4">
                  {slides.length > 0 ? (
                    slides.map((slide, index) => (
                      <SlideCard
                        key={slide.id}
                        slide={slide}
                        theme={theme}
                        index={index}
                        active={activeSlideIndex === index}
                        onSelect={() => setActiveSlideIndex(index)}
                      />
                    ))
                  ) : (
                    <div className={`flex min-h-80 items-center justify-center rounded-3xl border p-6 text-center ${isDark ? 'border-slate-700 bg-slate-900 text-slate-400' : 'border-slate-200 bg-slate-50 text-slate-500'}`}>
                      Slide preview placeholder
                    </div>
                  )}
                </div>
              </div>
            </section>
          </div>

          <footer className="mt-16 pb-8 text-center text-sm text-slate-500">
            © 2026 GHS Slide Generator • Built by Farin
          </footer>
        </div>
      </main>
    </AppProviders>
  );
}
