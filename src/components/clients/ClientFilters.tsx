import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Search, X } from "lucide-react";
import { CLIENT_CATEGORIES, FUNNEL_STAGES } from "@/hooks/useClients";

const BRAZILIAN_STATES = [
  "AC","AL","AP","AM","BA","CE","DF","ES","GO","MA","MT","MS","MG","PA",
  "PB","PR","PE","PI","RJ","RN","RS","RO","RR","SC","SP","SE","TO",
];

export interface ClientFilterValues {
  search: string;
  cidade: string;
  estado: string;
  categoria: string;
  vendedor: string;
  status_funil: string;
}

const emptyFilters: ClientFilterValues = {
  search: "", cidade: "", estado: "", categoria: "", vendedor: "", status_funil: "",
};

interface Props {
  filters: ClientFilterValues;
  onChange: (f: ClientFilterValues) => void;
  vendedores: string[];
  cidades: string[];
}

export { emptyFilters };

export function ClientFilters({ filters, onChange, vendedores, cidades }: Props) {
  const update = (key: keyof ClientFilterValues, value: string) =>
    onChange({ ...filters, [key]: value });

  const hasFilters = Object.values(filters).some(Boolean);

  return (
    <div className="flex flex-wrap items-end gap-3">
      <div className="relative w-56">
        <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Buscar cliente..."
          value={filters.search}
          onChange={(e) => update("search", e.target.value)}
          className="pl-9"
        />
      </div>

      <Select value={filters.estado} onValueChange={(v) => update("estado", v === "_all" ? "" : v)}>
        <SelectTrigger className="w-28"><SelectValue placeholder="Estado" /></SelectTrigger>
        <SelectContent>
          <SelectItem value="_all">Todos</SelectItem>
          {BRAZILIAN_STATES.map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}
        </SelectContent>
      </Select>

      <Select value={filters.cidade} onValueChange={(v) => update("cidade", v === "_all" ? "" : v)}>
        <SelectTrigger className="w-36"><SelectValue placeholder="Cidade" /></SelectTrigger>
        <SelectContent>
          <SelectItem value="_all">Todas</SelectItem>
          {cidades.map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}
        </SelectContent>
      </Select>

      <Select value={filters.categoria} onValueChange={(v) => update("categoria", v === "_all" ? "" : v)}>
        <SelectTrigger className="w-36"><SelectValue placeholder="Categoria" /></SelectTrigger>
        <SelectContent>
          <SelectItem value="_all">Todas</SelectItem>
          {CLIENT_CATEGORIES.map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}
        </SelectContent>
      </Select>

      <Select value={filters.vendedor} onValueChange={(v) => update("vendedor", v === "_all" ? "" : v)}>
        <SelectTrigger className="w-40"><SelectValue placeholder="Vendedor" /></SelectTrigger>
        <SelectContent>
          <SelectItem value="_all">Todos</SelectItem>
          {vendedores.map((v) => <SelectItem key={v} value={v}>{v}</SelectItem>)}
        </SelectContent>
      </Select>

      <Select value={filters.status_funil} onValueChange={(v) => update("status_funil", v === "_all" ? "" : v)}>
        <SelectTrigger className="w-40"><SelectValue placeholder="Status" /></SelectTrigger>
        <SelectContent>
          <SelectItem value="_all">Todos</SelectItem>
          {FUNNEL_STAGES.map((s) => <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>)}
        </SelectContent>
      </Select>

      {hasFilters && (
        <Button variant="ghost" size="sm" onClick={() => onChange({ ...emptyFilters })}>
          <X className="h-4 w-4 mr-1" /> Limpar
        </Button>
      )}
    </div>
  );
}
