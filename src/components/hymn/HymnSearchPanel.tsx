import Card from '../ui/Card';
import Input from '../ui/Input';
import Button from '../ui/Button';

export default function HymnSearchPanel() {
  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-xl font-semibold">Hymn Lookup</h2>
        <p className="mt-1 text-sm text-slate-500">
          Enter a hymn number to fetch lyrics and prepare slides.
        </p>
      </div>

      <Card className="p-4">
        <div className="space-y-3">
          <label className="block text-sm font-medium text-slate-700" htmlFor="hymn-number">
            Hymn Number
          </label>
          <Input id="hymn-number" placeholder="e.g. 123" />
          <Button type="button">Fetch Hymn</Button>
        </div>
      </Card>
    </div>
  );
}
