import { ExpenseForm } from "@/components/expenses/ExpenseForm";
import { ExpensesList } from "@/components/expenses/ExpensesList";

export default function Expenses() {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Despesas</h1>
          <p className="text-muted-foreground text-sm">Controle suas despesas fixas e variáveis</p>
        </div>
        <ExpenseForm />
      </div>
      <ExpensesList />
    </div>
  );
}
