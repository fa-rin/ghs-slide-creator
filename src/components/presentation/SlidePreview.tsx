export default function SlidePreview() {
  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-xl font-semibold">Preview</h2>
        <p className="mt-1 text-sm text-slate-300">
          Slide rendering will appear here after hymn parsing.
        </p>
      </div>

      <div className="flex min-h-80 items-center justify-center rounded-3xl border border-white/10 bg-white/5 p-6 text-center text-slate-300">
        Slide preview placeholder
      </div>
    </div>
  );
}
