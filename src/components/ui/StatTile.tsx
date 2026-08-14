import type { LucideIcon } from "lucide-react";
import { Card } from "@/components/ui/Card";

// Stat tile: label + valor grande + ícone. Para "o número atual", não um
// gráfico — ver referência de dataviz (choosing-a-form: "single current
// value → stat tile, not a one-bar bar chart").
export function StatTile({
  label,
  value,
  icon: Icon,
}: {
  label: string;
  value: string;
  icon: LucideIcon;
}) {
  return (
    <Card className="p-4">
      <div className="flex items-start justify-between">
        <div>
          <p className="text-sm text-stone-500">{label}</p>
          <p className="mt-1 text-2xl font-bold text-stone-900">{value}</p>
        </div>
        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-brand-50 text-brand-600">
          <Icon className="h-4.5 w-4.5" />
        </div>
      </div>
    </Card>
  );
}
