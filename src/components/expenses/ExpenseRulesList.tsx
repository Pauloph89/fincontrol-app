import { useExpenseRules } from "@/hooks/useExpenseRules";
import { formatCurrency } from "@/lib/financial-utils";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Pause, Play, Trash2, Loader2 } from "lucide-react";
import { recurrenceLabels } from "@/lib/financial-utils";

export function ExpenseRulesList() {
  const { rulesQuery, toggleRule, deleteRule } = useExpenseRules();
  const rules = rulesQuery.data || [];

  if (rulesQuery.isLoading) {
    return (
      <div className="flex items-center justify-center py-12 text-muted-foreground gap-2">
        <Loader2 className="h-5 w-5 animate-spin" /> Carregando regras...
      </div>
    );
  }

  if (rules.length === 0) {
    return (
      <Card>
        <CardContent className="py-16 text-center">
          <div className="text-4xl mb-3">🔄</div>
          <h3 className="font-semibold text-lg mb-1">Nenhuma regra recorrente</h3>
          <p className="text-muted-foreground text-sm">Crie uma regra para automatizar suas despesas fixas.</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardContent className="p-0">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Nome</TableHead>
              <TableHead>Categoria</TableHead>
              <TableHead>Recorrência</TableHead>
              <TableHead>Dias</TableHead>
              <TableHead>Conta</TableHead>
              <TableHead className="text-right">Valor</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="w-24"></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {rules.map((rule) => (
              <TableRow key={rule.id} className={!rule.active ? "opacity-50" : ""}>
                <TableCell className="font-medium">{rule.name}</TableCell>
                <TableCell>{rule.category}</TableCell>
                <TableCell>
                  <Badge variant="outline" className="text-xs">
                    {recurrenceLabels[rule.recurrence_type] || rule.recurrence_type}
                  </Badge>
                </TableCell>
                <TableCell className="text-xs">
                  {Array.isArray(rule.recurrence_days) ? rule.recurrence_days.join(", ") : "-"}
                </TableCell>
                <TableCell className="text-xs uppercase">{rule.account}</TableCell>
                <TableCell className="text-right font-semibold">{formatCurrency(Number(rule.value))}</TableCell>
                <TableCell>
                  <Badge variant={rule.active ? "default" : "secondary"} className="text-[10px]">
                    {rule.active ? "Ativa" : "Pausada"}
                  </Badge>
                </TableCell>
                <TableCell>
                  <div className="flex items-center gap-0.5">
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Button size="sm" variant="ghost" className="h-7 w-7 p-0" onClick={() => toggleRule.mutate({ id: rule.id, active: !rule.active })}>
                          {rule.active ? <Pause className="h-3.5 w-3.5 text-warning" /> : <Play className="h-3.5 w-3.5 text-success" />}
                        </Button>
                      </TooltipTrigger>
                      <TooltipContent>{rule.active ? "Pausar" : "Reativar"}</TooltipContent>
                    </Tooltip>
                    <AlertDialog>
                      <AlertDialogTrigger asChild>
                        <Button size="sm" variant="ghost" className="h-7 w-7 p-0">
                          <Trash2 className="h-3.5 w-3.5 text-destructive" />
                        </Button>
                      </AlertDialogTrigger>
                      <AlertDialogContent>
                        <AlertDialogHeader>
                          <AlertDialogTitle>Excluir regra?</AlertDialogTitle>
                          <AlertDialogDescription>
                            A regra "{rule.name}" será excluída. Despesas já geradas não serão afetadas.
                          </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                          <AlertDialogCancel>Cancelar</AlertDialogCancel>
                          <AlertDialogAction onClick={() => deleteRule.mutate(rule.id)} className="bg-destructive text-destructive-foreground">
                            Excluir
                          </AlertDialogAction>
                        </AlertDialogFooter>
                      </AlertDialogContent>
                    </AlertDialog>
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}
