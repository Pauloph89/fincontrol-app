import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { startOfMonth, endOfMonth, subMonths, startOfYear, endOfYear } from "date-fns";

export type PeriodRange = { start: Date; end: Date; label: string };

const periods: { value: string; label: string; getRange: () => PeriodRange }[] = [
  {
    value: "current_month",
    label: "Mês Atual",
    getRange: () => {
      const now = new Date();
      return { start: startOfMonth(now), end: endOfMonth(now), label: "Mês Atual" };
    },
  },
  {
    value: "last_month",
    label: "Mês Anterior",
    getRange: () => {
      const last = subMonths(new Date(), 1);
      return { start: startOfMonth(last), end: endOfMonth(last), label: "Mês Anterior" };
    },
  },
  {
    value: "current_year",
    label: "Ano Completo",
    getRange: () => {
      const now = new Date();
      return { start: startOfYear(now), end: endOfYear(now), label: "Ano Completo" };
    },
  },
  {
    value: "all",
    label: "Tudo",
    getRange: () => {
      return { start: new Date(2000, 0, 1), end: new Date(2100, 0, 1), label: "Tudo" };
    },
  },
];

interface PeriodSelectorProps {
  value: string;
  onChange: (value: string, range: PeriodRange) => void;
}

export function PeriodSelector({ value, onChange }: PeriodSelectorProps) {
  return (
    <Select value={value} onValueChange={(v) => {
      const period = periods.find((p) => p.value === v);
      if (period) onChange(v, period.getRange());
    }}>
      <SelectTrigger className="h-9 w-40">
        <SelectValue />
      </SelectTrigger>
      <SelectContent>
        {periods.map((p) => (
          <SelectItem key={p.value} value={p.value}>{p.label}</SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}

export function getDefaultPeriod(): PeriodRange {
  return periods[0].getRange();
}
