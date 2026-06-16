export default function ThemeToggle() {
  return (
    <div className="inline-flex rounded-full bg-slate-100 p-1 text-sm font-medium text-slate-600">
      <button type="button" className="rounded-full bg-white px-3 py-1 shadow-sm">
        Light
      </button>
      <button type="button" className="rounded-full px-3 py-1">
        Dark
      </button>
    </div>
  );
}
