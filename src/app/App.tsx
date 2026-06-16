import { useMemo, useState } from 'react';
import AppProviders from './providers/AppProviders';
import { generateHymnSlides } from '../workflows/generateHymnSlides';
import { exportPresentationToPptx } from '../services/pptxExport';
import type { ApiResult } from '../types/api';
import type { Slide, SlidePresentation } from '../types/slide';

type ThemeMode = 'dark' | 'light';

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

function SlideCard({
  slide,
  theme,
  index,
}: {
  slide: Slide;
  theme: ThemeMode;
  index: number;
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
      className={`flex min-h-56 flex-col rounded-2xl border p-4 shadow-sm ${
        isTitle ? 'ring-1 ring-amber-400/30' : ''
      } ${cardClass}`}
    >
      <div className="flex items-center justify-between gap-3 text-xs font-semibold uppercase tracking-[0.24em] opacity-70">
        <div>{getSlideTypeLabel(slide, index)}</div>
        <div>Slide {index + 1}</div>
      </div>
      <div className="mt-4 flex-1 space-y-2 px-2 text-center text-lg font-medium leading-7">
        <div className={`text-sm font-semibold uppercase tracking-[0.18em] opacity-70`}>
          {slide.title}
        </div>
        <div className="space-y-2 pt-2">
        {slide.lines.length > 0 ? (
          slide.lines.map((line, index) => <div key={`${slide.id}-${index}`}>{line}</div>)
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
        className={`rounded-full px-3 py-1 transition ${
          theme === 'light' ? 'bg-white shadow-sm' : ''
        }`}
      >
        Light
      </button>
      <button
        type="button"
        onClick={() => onChange('dark')}
        className={`rounded-full px-3 py-1 transition ${
          theme === 'dark' ? 'bg-white shadow-sm' : ''
        }`}
      >
        Dark
      </button>
    </div>
  );
}

export default function App() {
  const [hymnNumberInput, setHymnNumberInput] = useState('');
  const [theme, setTheme] = useState<ThemeMode>('dark');
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [workflowResult, setWorkflowResult] = useState<ApiResult<SlidePresentation> | null>(null);

  const slides = workflowResult?.ok ? workflowResult.data.slides : [];
  const hymnNumber = workflowResult?.ok ? workflowResult.data.hymnNumber : null;
  const hymnTitle = workflowResult?.ok ? workflowResult.data.title : '';
  const hasSuccess = Boolean(workflowResult?.ok);

  const currentThemeClasses = useMemo(() => {
    if (theme === 'dark') {
      return {
        shell: 'bg-slate-950 text-slate-100',
        header: 'bg-white text-slate-900',
        panel: 'bg-slate-900 text-slate-100',
        leftPanel: 'bg-slate-900 text-slate-100',
        rightPanel: 'bg-slate-950 text-slate-100',
        muted: 'text-slate-300',
        input: 'border-slate-700 bg-slate-950 text-slate-100 placeholder:text-slate-500',
        exportButton: 'border-slate-700 bg-slate-900 text-slate-200 hover:bg-slate-800',
      };
    }

    return {
      shell: 'bg-projection-light text-slate-900',
      header: 'bg-white text-slate-900',
      panel: 'bg-white text-slate-900',
      leftPanel: 'bg-white text-slate-900',
      rightPanel: 'bg-slate-950 text-white',
      muted: 'text-slate-500',
      input: 'border-slate-200 bg-white text-slate-900 placeholder:text-slate-400',
      exportButton: 'border-slate-200 bg-white text-slate-700 hover:bg-slate-50',
    };
  }, [theme]);

  async function handleGenerateClick() {
    if (!isValidHymnNumber(hymnNumberInput)) {
      setErrorMessage('Please enter a valid hymn number.');
      setWorkflowResult(null);
      return;
    }

    setLoading(true);
    setErrorMessage('');

    try {
      const result = await generateHymnSlides(Number(hymnNumberInput));
      console.log('generateHymnSlides result:', result);
      setWorkflowResult(result);

      if (!result.ok) {
        setErrorMessage(result.error.message);
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unexpected pipeline failure.';
      setWorkflowResult(null);
      setErrorMessage(message);
    } finally {
      setLoading(false);
    }
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

  return (
    <AppProviders>
      <main className={`min-h-screen ${currentThemeClasses.shell}`}>
        <div className="mx-auto flex min-h-screen w-full max-w-7xl flex-col gap-6 p-6 lg:p-8">
          <header className="rounded-3xl bg-white p-6 shadow-soft">
            <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
              <div>
                <p className="text-sm font-medium uppercase tracking-[0.24em] text-slate-500">
                  GHS Auto-Presenter Slide Generator
                </p>
                <h1 className="mt-2 text-3xl font-semibold tracking-tight">
                  Slide Generator
                </h1>
              </div>
              <ThemeToggle theme={theme} onChange={setTheme} />
            </div>
          </header>

          <div className="grid gap-6 lg:grid-cols-[1.1fr_0.9fr]">
            <section className="rounded-3xl bg-white p-6 shadow-soft">
              <div className="space-y-4">
                <div>
                  <h2 className="text-xl font-semibold">Hymn Lookup</h2>
                  <p className={`mt-1 text-sm ${currentThemeClasses.muted}`}>
                    Enter a hymn number to fetch lyrics and prepare slides.
                  </p>
                </div>

                <div className="space-y-3">
                  <label className="block text-sm font-medium text-slate-700" htmlFor="hymn-number">
                    Hymn Number
                  </label>
                  <input
                    id="hymn-number"
                    type="number"
                    min="1"
                    step="1"
                    value={hymnNumberInput}
                    onChange={(event) => setHymnNumberInput(event.target.value)}
                    placeholder="Enter Hymn Number"
                    className={`w-full rounded-xl border px-4 py-2 text-sm outline-none transition placeholder:text-slate-400 focus:border-slate-400 ${currentThemeClasses.input}`}
                  />
                  <button
                    type="button"
                    onClick={handleGenerateClick}
                    disabled={loading}
                    className="inline-flex items-center justify-center rounded-xl bg-slate-950 px-4 py-2 text-sm font-medium text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    {loading ? 'Loading...' : 'Fetch & Generate'}
                  </button>

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
                    </div>
                  ) : null}
                </div>
              </div>
            </section>

            <section className="rounded-3xl bg-slate-950 p-6 text-white shadow-soft">
              <div className="space-y-4">
                <div>
                  <h2 className="text-xl font-semibold">Preview</h2>
                  <p className="mt-1 text-sm text-slate-300">
                    Slide rendering will appear here after hymn parsing.
                  </p>
                </div>

                <div className="grid gap-4">
                  {slides.length > 0 ? (
                    slides.map((slide, index) => (
                      <SlideCard key={slide.id} slide={slide} theme={theme} index={index} />
                    ))
                  ) : (
                    <div className="flex min-h-80 items-center justify-center rounded-3xl border border-white/10 bg-white/5 p-6 text-center text-slate-300">
                      Slide preview placeholder
                    </div>
                  )}
                </div>

                <details className="rounded-2xl border border-white/10 bg-white/5 p-4 text-sm text-slate-200">
                  <summary className="cursor-pointer select-none font-medium text-white">
                    Debug
                  </summary>

                  <div className="mt-4 space-y-3">
                    <div className="grid gap-1">
                      <div>
                        <span className="font-semibold text-white">Hymn Title:</span>{' '}
                        {workflowResult?.ok ? workflowResult.data.title : 'N/A'}
                      </div>
                      <div>
                        <span className="font-semibold text-white">Hymn Number:</span>{' '}
                        {workflowResult?.ok ? workflowResult.data.hymnNumber : 'N/A'}
                      </div>
                      <div>
                        <span className="font-semibold text-white">Total Slide Count:</span>{' '}
                        {workflowResult?.ok ? workflowResult.data.slides.length : 0}
                      </div>
                    </div>

                    <pre className="max-h-72 overflow-auto rounded-xl border border-white/10 bg-slate-950 p-3 text-xs leading-5 text-slate-100">
                      {workflowResult
                        ? JSON.stringify(workflowResult, null, 2)
                        : 'No workflow result yet.'}
                    </pre>
                  </div>
                </details>
              </div>
            </section>
          </div>

          <section className="rounded-3xl bg-white p-6 shadow-soft">
            <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
              <div>
                <h2 className="text-xl font-semibold">Export</h2>
                <p className="mt-1 text-sm text-slate-500">
                  PPT generation will be wired in after the data flow is in place.
                </p>
              </div>
              <button
                type="button"
                onClick={handleExportClick}
                disabled={!hasSuccess || slides.length === 0}
                className={`inline-flex items-center justify-center rounded-xl border px-4 py-2 text-sm font-medium transition disabled:cursor-not-allowed disabled:opacity-60 ${currentThemeClasses.exportButton}`}
              >
                Generate PowerPoint
              </button>
            </div>
          </section>
        </div>
      </main>
    </AppProviders>
  );
}
