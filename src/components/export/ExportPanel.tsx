import Button from '../ui/Button';

export default function ExportPanel() {
  return (
    <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
      <div>
        <h2 className="text-xl font-semibold">Export</h2>
        <p className="mt-1 text-sm text-slate-500">
          PPT generation will be wired in after the data flow is in place.
        </p>
      </div>
      <Button type="button">Generate PowerPoint</Button>
    </div>
  );
}
