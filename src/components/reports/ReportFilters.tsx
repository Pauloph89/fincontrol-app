import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

export interface ReportFilterValues {
  startDate: string;
  endDate: string;
  factory: string;
  account: string;
  status: string;
}

interface Props {
  filters: ReportFilterValues;
  onChange: (filters: ReportFilterValues) => void;
  factories: string[];
  showFactory?: boolean;
  showAccount?: boolean;
  showStatus?: boolean;
  statusOptions?: { value: string; label: string }[];
}

export function ReportFilters({ filters, onChange, factories, showFactory = true, showAccount = true, showStatus = true, statusOptions }: Props) {
  const update = (field: keyof ReportFilterValues, value: string) => {
    onChange({ ...filters, [field]: value });
  };

  const defaultStatusOptions = [
    { value: "all", label: "Todos" },
    { value: "previsto", label: "Previsto" },
    { value: "recebido", label: "Recebido" },
    { value: "atrasado", label: "Atrasado" },
    { value: "cancelado", label: "Cancelado" },
  ];

  return (
    <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
      <div className="space-y-1">
        <Label className="text-xs">Data Início</Label>
        <Input type="date" value={filters.startDate} onChange={(e) => update("startDate", e.target.value)} className="h-9" />
      </div>
      <div className="space-y-1">
        <Label className="text-xs">Data Fim</Label>
        <Input type="date" value={filters.endDate} onChange={(e) => update("endDate", e.target.value)} className="h-9" />
      </div>
      {showFactory && (
        <div className="space-y-1">
          <Label className="text-xs">Fábrica</Label>
          <Select value={filters.factory} onValueChange={(v) => update("factory", v)}>
            <SelectTrigger className="h-9"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todas</SelectItem>
              {factories.map((f) => <SelectItem key={f} value={f}>{f}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
      )}
      {showAccount && (
        <div className="space-y-1">
          <Label className="text-xs">Conta</Label>
          <Select value={filters.account} onValueChange={(v) => update("account", v)}>
            <SelectTrigger className="h-9"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todas</SelectItem>
              <SelectItem value="cnpj">CNPJ</SelectItem>
              <SelectItem value="pessoal">Pessoal</SelectItem>
            </SelectContent>
          </Select>
        </div>
      )}
      {showStatus && (
        <div className="space-y-1">
          <Label className="text-xs">Status</Label>
          <Select value={filters.status} onValueChange={(v) => update("status", v)}>
            <SelectTrigger className="h-9"><SelectValue /></SelectTrigger>
            <SelectContent>
              {(statusOptions || defaultStatusOptions).map((s) => (
                <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      )}
    </div>
  );
}
