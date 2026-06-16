import ThemeToggle from '../theme/ThemeToggle';
import HymnSearchPanel from '../hymn/HymnSearchPanel';
import SlidePreview from '../presentation/SlidePreview';
import ExportPanel from '../export/ExportPanel';

export default function ProjectShell() {
  return (
    <main className="min-h-screen bg-projection-light text-slate-900">
      <div className="mx-auto flex min-h-screen w-full max-w-7xl flex-col gap-6 p-6 lg:p-8">
        <header className="rounded-3xl bg-white p-6 shadow-soft">
          <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
            <div>
              <p className="text-sm font-medium uppercase tracking-[0.24em] text-slate-500">
                GHS Auto-Presenter
              </p>
              <h1 className="mt-2 text-3xl font-semibold tracking-tight">
                Slide Generator
              </h1>
            </div>
            <ThemeToggle />
          </div>
        </header>

        <div className="grid gap-6 lg:grid-cols-[1.1fr_0.9fr]">
          <section className="rounded-3xl bg-white p-6 shadow-soft">
            <HymnSearchPanel />
          </section>

          <section className="rounded-3xl bg-slate-950 p-6 text-white shadow-soft">
            <SlidePreview />
          </section>
        </div>

        <section className="rounded-3xl bg-white p-6 shadow-soft">
          <ExportPanel />
        </section>
      </div>
    </main>
  );
}
