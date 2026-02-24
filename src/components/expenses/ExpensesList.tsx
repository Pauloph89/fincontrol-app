import { useExpenses } from "@/hooks/useExpenses";
import { formatCurrency, formatDate, getExpenseAlertClass, statusLabels } from "@/lib/financial-utils";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { CheckCircle2 } from "lucide-react";

export function ExpensesList() {
  const { expensesQuery, markExpensePaid } = useExpenses();

  if (expensesQuery.isLoading) {
    return <div className="text-center py-12 text-muted-foreground">Carregando despesas...</div>;
  }

  const expenses = expensesQuery.data || [];

  if (expenses.length === 0) {
    return (
      <Card>
        <CardContent className="py-12 text-center text-muted-foreground">
          Nenhuma despesa cadastrada. Clique em "Nova Despesa" para começar.
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-lg">Despesas</CardTitle>
      </CardHeader>
      <CardContent className="p-0">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Descrição</TableHead>
              <TableHead>Categoria</TableHead>
              <TableHead>Tipo</TableHead>
              <TableHead>Conta</TableHead>
              <TableHead className="text-right">Valor</TableHead>
              <TableHead>Vencimento</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="w-10"></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {expenses.map((exp) => {
              const alertClass = getExpenseAlertClass(exp.due_date, exp.status);
              return (
                <TableRow key={exp.id}>
                  <TableCell className="font-medium">{exp.description}</TableCell>
                  <TableCell>{exp.category}</TableCell>
                  <TableCell>
                    <Badge variant="outline" className="text-xs">
                      {exp.type === "fixa" ? "Fixa" : "Variável"}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-xs uppercase">{exp.account}</TableCell>
                  <TableCell className="text-right font-semibold">{formatCurrency(exp.value)}</TableCell>
                  <TableCell>{formatDate(exp.due_date)}</TableCell>
                  <TableCell>
                    <span className={`inline-flex items-center rounded-full border px-2 py-0.5 text-xs font-medium ${alertClass}`}>
                      {statusLabels[exp.status] || exp.status}
                    </span>
                  </TableCell>
                  <TableCell>
                    {exp.status !== "pago" && (
                      <Button
                        size="sm"
                        variant="ghost"
                        className="h-7 w-7 p-0"
                        onClick={() => markExpensePaid.mutate(exp.id)}
                        title="Marcar como pago"
                      >
                        <CheckCircle2 className="h-4 w-4 text-success" />
                      </Button>
                    )}
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}
