import { ExpenseForm } from "@/components/expenses/ExpenseForm";
import { ExpensePdfImport } from "@/components/expenses/ExpensePdfImport";
import { ExpenseRuleForm } from "@/components/expenses/ExpenseRuleForm";
import { PeriodExpensesList } from "@/components/expenses/PeriodExpensesList";
import { ExpenseRulesList } from "@/components/expenses/ExpenseRulesList";
import { ExpenseHistory } from "@/components/expenses/ExpenseHistory";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { CalendarDays, RefreshCw, History } from "lucide-react";

export default function Expenses() {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Despesas</h1>
          <p className="text-muted-foreground text-sm">Controle suas despesas fixas, variáveis e recorrentes</p>
        </div>
        <div className="flex items-center gap-2">
          <ExpenseRuleForm />
          <ExpenseForm />
        </div>
      </div>

      <Tabs defaultValue="period">
        <TabsList>
          <TabsTrigger value="period" className="gap-1.5">
            <CalendarDays className="h-3.5 w-3.5" />
            Despesas do Período
          </TabsTrigger>
          <TabsTrigger value="rules" className="gap-1.5">
            <RefreshCw className="h-3.5 w-3.5" />
            Recorrências
          </TabsTrigger>
          <TabsTrigger value="history" className="gap-1.5">
            <History className="h-3.5 w-3.5" />
            Histórico
          </TabsTrigger>
        </TabsList>

        <TabsContent value="period">
          <PeriodExpensesList />
        </TabsContent>

        <TabsContent value="rules">
          <ExpenseRulesList />
        </TabsContent>

        <TabsContent value="history">
          <ExpenseHistory />
        </TabsContent>
      </Tabs>
    </div>
  );
}
