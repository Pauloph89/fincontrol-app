import { useMemo, useState } from "react";
import { useExpenses } from "@/hooks/useExpenses";
import { formatCurrency, formatDate, statusLabels } from "@/lib/financial-utils";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Input } from "@/components/ui/input";
import { Search, Loader2 } from "lucide-react";

export function ExpenseHistory() {
  const { expensesQuery } = useExpenses();
  const [search, setSearch] = useState("");

  const paidExpenses = useMemo(() => {
    return (expensesQuery.data || [])
      .filter((e) => e.status === "pago")
      .filter((e) => {
        if (!search) return true;
        const s = search.toLowerCase();
        return e.description.toLowerCase().includes(s) || e.category.toLowerCase().includes(s);
      })
      .sort((a, b) => (b.payment_date || b.due_date).localeCompare(a.payment_date || a.due_date));
  }, [expensesQuery.data, search]);

  if (expensesQuery.isLoading) {
    return <div className="flex items-center justify-center py-12 text-muted-foreground gap-2"><Loader2 className="h-5 w-5 animate-spin" /> Carregando...</div>;
  }

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg">Histórico de Pagamentos</CardTitle>
          <div className="relative">
            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input placeholder="Buscar..." value={search} onChange={(e) => setSearch(e.target.value)} className="pl-9 h-9 w-48" />
          </div>
        </div>
      </CardHeader>
      <CardContent className="p-0">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Descrição</TableHead>
              <TableHead>Categoria</TableHead>
              <TableHead>Conta</TableHead>
              <TableHead className="text-right">Valor</TableHead>
              <TableHead>Vencimento</TableHead>
              <TableHead>Pagamento</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {paidExpenses.slice(0, 100).map((exp) => (
              <TableRow key={exp.id}>
                <TableCell className="font-medium">{exp.description}</TableCell>
                <TableCell>{exp.category}</TableCell>
                <TableCell className="text-xs uppercase">{exp.account}</TableCell>
                <TableCell className="text-right font-semibold">{formatCurrency(Number(exp.value))}</TableCell>
                <TableCell>{formatDate(exp.due_date)}</TableCell>
                <TableCell>{exp.payment_date ? formatDate(exp.payment_date) : "-"}</TableCell>
              </TableRow>
            ))}
            {paidExpenses.length === 0 && (
              <TableRow>
                <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">Nenhum pagamento registrado.</TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}
