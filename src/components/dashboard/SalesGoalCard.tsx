import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Progress } from "@/components/ui/progress";
import { useSalesGoal } from "@/hooks/useSalesGoal";
import { formatCurrency } from "@/lib/financial-utils";
import { Target, Pencil, Trophy } from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

interface SalesGoalCardProps {
  currentSales: number;
  negotiationValue: number;
}

export function SalesGoalCard({ currentSales, negotiationValue }: SalesGoalCardProps) {
  const now = new Date();
  const year = now.getFullYear();
  const month = now.getMonth() + 1;
  const dayOfMonth = now.getDate();

  const { goal, upsertGoal } = useSalesGoal(year, month);
  const [editing, setEditing] = useState(false);
  const [inputValue, setInputValue] = useState("");

  const goalValue = goal?.goal_value ?? 0;
  const hasGoal = goalValue > 0;
  const percent = hasGoal ? Math.min((currentSales / goalValue) * 100, 100) : 0;
  const remaining = Math.max(goalValue - currentSales, 0);
  const projection = currentSales + negotiationValue;

  const monthLabel = format(now, "MMMM yyyy", { locale: ptBR });
  const capitalizedMonth = monthLabel.charAt(0).toUpperCase() + monthLabel.slice(1);

  // Color logic
  const getBarColor = () => {
    if (percent >= 100) return "bg-emerald-500";
    if (percent >= 80) return "bg-emerald-500";
    if (percent >= 50) return "bg-amber-500";
    if (dayOfMonth < 15 && percent < 50) return "bg-destructive";
    return "bg-amber-500";
  };

  const handleSave = async () => {
    const val = parseFloat(inputValue.replace(/\./g, "").replace(",", "."));
    if (!val || val <= 0) return;
    await upsertGoal.mutateAsync(val);
    setEditing(false);
    setInputValue("");
  };

  if (!hasGoal && !editing) {
    return (
      <Card className="glass-card">
        <CardContent className="p-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Target className="h-5 w-5 text-muted-foreground" />
            <span className="text-sm text-muted-foreground">Nenhuma meta de vendas definida para {capitalizedMonth}</span>
          </div>
          <Button size="sm" variant="outline" onClick={() => setEditing(true)}>
            Definir Meta do Mês
          </Button>
        </CardContent>
      </Card>
    );
  }

  if (editing) {
    return (
      <Card className="glass-card">
        <CardContent className="p-4">
          <div className="flex items-center gap-3">
            <Target className="h-5 w-5 text-muted-foreground shrink-0" />
            <span className="text-sm font-medium shrink-0">Meta Mensal de Vendas:</span>
            <Input
              placeholder="Ex: 500000"
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              className="max-w-[200px]"
              autoFocus
              onKeyDown={(e) => e.key === "Enter" && handleSave()}
            />
            <Button size="sm" onClick={handleSave} disabled={upsertGoal.isPending}>
              Salvar
            </Button>
            <Button size="sm" variant="ghost" onClick={() => setEditing(false)}>
              Cancelar
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="glass-card">
      <CardHeader className="pb-2 pt-4 px-4">
        <div className="flex items-center justify-between">
          <CardTitle className="text-sm font-medium flex items-center gap-2">
            <Target className="h-4 w-4" />
            Meta de Vendas — {capitalizedMonth}
            {percent >= 100 && <Trophy className="h-4 w-4 text-amber-500" />}
          </CardTitle>
          <Button size="icon" variant="ghost" className="h-6 w-6" onClick={() => { setEditing(true); setInputValue(String(goalValue)); }}>
            <Pencil className="h-3 w-3" />
          </Button>
        </div>
      </CardHeader>
      <CardContent className="px-4 pb-4 space-y-2">
        {/* Progress bar */}
        <div className="relative w-full h-3 rounded-full bg-muted overflow-hidden">
          <div
            className={`h-full rounded-full transition-all duration-500 ${getBarColor()}`}
            style={{ width: `${Math.min(percent, 100)}%` }}
          />
        </div>

        <div className="flex items-center justify-between text-xs">
          <span className="font-semibold">
            {formatCurrency(currentSales)} / {formatCurrency(goalValue)}{" "}
            <span className="text-muted-foreground">({percent.toFixed(0)}%)</span>
          </span>
          {percent >= 100 ? (
            <span className="text-emerald-600 font-semibold flex items-center gap-1">
              🏆 Meta atingida!
            </span>
          ) : (
            <span className="text-muted-foreground">
              Faltam {formatCurrency(remaining)}
            </span>
          )}
        </div>

        <p className="text-[11px] text-muted-foreground">
          Projeção de fechamento: <span className="font-medium text-foreground">{formatCurrency(projection)}</span>
          <span className="ml-1">(vendas atuais + negociações em andamento)</span>
        </p>
      </CardContent>
    </Card>
  );
}
