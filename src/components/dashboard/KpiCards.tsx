// STABLE v2 - do not revert
import { Card, CardContent } from "@/components/ui/card";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { TrendingUp, TrendingDown, DollarSign, AlertTriangle, ArrowDownLeft, ArrowUpRight, ShieldAlert, Calendar, ShoppingCart, Users, BarChart3 } from "lucide-react";
import { formatCurrency } from "@/lib/financial-utils";

interface KpiCardsProps {
  revenue: number;
  expenses: number;
  expensesFixa?: number;
  expensesVariavel?: number;
  toReceive: number;
  toPay: number;
  inadimplencia: number;
  forecast90: number;
  alerts: number;
  totalSales?: number;
  totalOrdersCount?: number;
  leadsCount?: number;
  commissionExpected?: number;
  commissionReceived?: number;
  forecast30?: number;
  lateCommissions?: number;
}

function KpiCard({ title, value, icon: Icon, color, isCurrency = true, subtitle, tooltip }: {
  title: string; value: number; icon: any; color: string; isCurrency?: boolean; subtitle?: string; tooltip?: string;
}) {
  const cardContent = (
    <Card className="glass-card">
      <CardContent className="p-3">
        <div className="flex items-center justify-between mb-1">
          <span className="text-[10px] font-medium text-muted-foreground leading-tight">{title}</span>
          <Icon className={`h-3.5 w-3.5 ${color}`} />
        </div>
        <p className="text-sm font-bold">
          {isCurrency ? formatCurrency(value) : value}
        </p>
        {subtitle && (
          <p className="text-[9px] text-muted-foreground leading-tight mt-0.5">{subtitle}</p>
        )}
      </CardContent>
    </Card>
  );

  if (tooltip) {
    return (
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild>{cardContent}</TooltipTrigger>
          <TooltipContent className="max-w-[250px] text-xs"><p>{tooltip}</p></TooltipContent>
        </Tooltip>
      </TooltipProvider>
    );
  }

  return cardContent;
}

export function KpiCards({
  revenue, expenses, expensesFixa = 0, expensesVariavel = 0, toReceive, toPay, inadimplencia, forecast90, alerts,
  totalSales = 0, totalOrdersCount = 0, leadsCount = 0,
  commissionExpected = 0, commissionReceived = 0, forecast30 = 0, lateCommissions = 0,
}: KpiCardsProps) {
  const profit = revenue - expenses;
  const currencyBreakdown = (value: number) => `R$ ${value.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}`;

  return (
    <div className="space-y-4">
      {/* Comercial */}
      <div>
        <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">📊 Comercial</h3>
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
          <KpiCard title="Vendas do Período" value={totalSales} icon={ShoppingCart} color="text-foreground" />
          <KpiCard title="Pedidos" value={totalOrdersCount} icon={BarChart3} color="text-foreground" isCurrency={false} />
          <KpiCard title="Leads" value={leadsCount} icon={Users} color="text-info" isCurrency={false} />
        </div>
      </div>

      {/* Comissões */}
      <div>
        <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">💰 Comissões</h3>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <KpiCard title="Comissão Prevista" value={commissionExpected} icon={DollarSign} color="text-info"
            subtitle="Valor total das comissões geradas no período" />
          <KpiCard title="Comissão Recebida" value={commissionReceived} icon={ArrowDownLeft} color="text-success"
            subtitle="Valor efetivamente recebido no período" />
          <KpiCard title="Previsão 30 dias" value={forecast30} icon={Calendar} color="text-warning" />
          <KpiCard title="Atrasadas" value={lateCommissions} icon={ShieldAlert} color={lateCommissions > 0 ? "text-destructive" : "text-success"} />
        </div>
      </div>

      {/* Financeiro */}
      <div>
        <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">📈 Financeiro</h3>
        <div className="grid grid-cols-2 sm:grid-cols-4 xl:grid-cols-7 gap-3">
          <KpiCard title="Receita" value={revenue} icon={ArrowDownLeft} color="text-success" />
          <KpiCard title="Despesas" value={expenses} icon={ArrowUpRight} color="text-destructive"
            tooltip={`Custos Fixos: ${currencyBreakdown(expensesFixa)} | Custos Variáveis: ${currencyBreakdown(expensesVariavel)}`}
            subtitle={`Fixo: ${currencyBreakdown(expensesFixa)} | Var: ${currencyBreakdown(expensesVariavel)}`} />
          <KpiCard title="Lucro Líquido" value={profit} icon={profit >= 0 ? TrendingUp : TrendingDown} color={profit >= 0 ? "text-success" : "text-destructive"} />
          <KpiCard title="Total a Receber" value={toReceive} icon={DollarSign} color="text-info" />
          <KpiCard title="A Pagar" value={toPay} icon={DollarSign} color="text-warning"
            tooltip="Soma das despesas com status 'A vencer' ou 'Projetado' do mês atual, mais despesas vencidas sem pagamento." />
          <KpiCard title="Inadimplência" value={inadimplencia} icon={ShieldAlert} color={inadimplencia > 0 ? "text-destructive" : "text-success"}
            tooltip="Parcelas de comissão com vencimento há mais de 30 dias e ainda não recebidas. Indica possível não pagamento do cliente à fábrica." />
          <KpiCard title="Previsão 90d" value={forecast90} icon={Calendar} color="text-info"
            tooltip="Total de comissões previstas para recebimento nos próximos 90 dias." />
        </div>
      </div>
    </div>
  );
}
