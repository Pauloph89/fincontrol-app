import { useExpenses } from "@/hooks/useExpenses";
import { formatCurrency, formatDate, getExpenseAlertClass, statusLabels, recurrenceLabels } from "@/lib/financial-utils";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { CheckCircle2, Paperclip, Search, Trash2, RefreshCw } from "lucide-react";
import { useState, useMemo, useRef } from "react";

export function ExpensesList() {
  const { expensesQuery, markExpensePaid, deleteExpense, uploadReceipt } = useExpenses();
  const [search, setSearch] = useState("");
  const [filterAccount, setFilterAccount] = useState("all");
  const [filterStatus, setFilterStatus] = useState("all");
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [uploadingId, setUploadingId] = useState<string | null>(null);

  const allExpenses = expensesQuery.data || [];

  const expenses = useMemo(() => {
    return allExpenses.filter((e) => {
      if (filterAccount !== "all" && e.account !== filterAccount) return false;
      if (filterStatus !== "all" && e.status !== filterStatus) return false;
      if (search) {
        const s = search.toLowerCase();
        return e.description.toLowerCase().includes(s) || e.category.toLowerCase().includes(s);
      }
      return true;
    });
  }, [allExpenses, search, filterAccount, filterStatus]);

  if (expensesQuery.isLoading) {
    return <div className="text-center py-12 text-muted-foreground">Carregando despesas...</div>;
  }

  if (allExpenses.length === 0) {
    return (
      <Card>
        <CardContent className="py-12 text-center text-muted-foreground">
          Nenhuma despesa cadastrada. Clique em "Nova Despesa" para começar.
        </CardContent>
      </Card>
    );
  }

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file && uploadingId) {
      await uploadReceipt.mutateAsync({ expenseId: uploadingId, file });
      setUploadingId(null);
    }
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between flex-wrap gap-2">
          <CardTitle className="text-lg">Despesas</CardTitle>
          <div className="flex items-center gap-2">
            <div className="relative">
              <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input placeholder="Buscar..." value={search} onChange={(e) => setSearch(e.target.value)} className="pl-9 h-9 w-40" />
            </div>
            <Select value={filterAccount} onValueChange={setFilterAccount}>
              <SelectTrigger className="h-9 w-32"><SelectValue placeholder="Conta" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todas</SelectItem>
                <SelectItem value="cnpj">CNPJ</SelectItem>
                <SelectItem value="pessoal">Pessoal</SelectItem>
              </SelectContent>
            </Select>
            <Select value={filterStatus} onValueChange={setFilterStatus}>
              <SelectTrigger className="h-9 w-32"><SelectValue placeholder="Status" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos</SelectItem>
                <SelectItem value="a_vencer">A vencer</SelectItem>
                <SelectItem value="pago">Pago</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
      </CardHeader>
      <CardContent className="p-0">
        <input ref={fileInputRef} type="file" accept=".pdf,image/*" className="hidden" onChange={handleFileChange} />
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
              <TableHead className="w-24"></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {expenses.map((exp) => {
              const alertClass = getExpenseAlertClass(exp.due_date, exp.status);
              return (
                <TableRow key={exp.id}>
                  <TableCell className="font-medium">
                    <div className="flex items-center gap-1.5">
                      {exp.description}
                      {(exp as any).recurrence && (
                        <RefreshCw className="h-3 w-3 text-muted-foreground" />
                      )}
                    </div>
                  </TableCell>
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
                    <div className="flex items-center gap-0.5">
                      {exp.status !== "pago" && (
                        <Button size="sm" variant="ghost" className="h-7 w-7 p-0" onClick={() => markExpensePaid.mutate(exp.id)} title="Marcar como pago">
                          <CheckCircle2 className="h-4 w-4 text-success" />
                        </Button>
                      )}
                      <Button size="sm" variant="ghost" className="h-7 w-7 p-0" onClick={() => { setUploadingId(exp.id); fileInputRef.current?.click(); }} title="Anexar comprovante">
                        <Paperclip className="h-4 w-4 text-muted-foreground" />
                      </Button>
                      {exp.receipt_url && (
                        <a href={exp.receipt_url} target="_blank" rel="noopener noreferrer" className="text-xs text-info underline ml-1">Ver</a>
                      )}
                      <Button size="sm" variant="ghost" className="h-7 w-7 p-0" onClick={() => deleteExpense.mutate({ id: exp.id })} title="Excluir">
                        <Trash2 className="h-3.5 w-3.5 text-destructive" />
                      </Button>
                    </div>
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
