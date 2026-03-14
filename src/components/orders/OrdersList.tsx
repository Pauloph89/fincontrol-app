import { useOrders } from "@/hooks/useOrders";
import { useUserRole } from "@/hooks/useUserRole";
import { formatCurrency, formatDate, getInstallmentAlertClass, getInstallmentStatus, statusLabels, commissionStatusFlow } from "@/lib/financial-utils";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { CheckCircle2, ChevronDown, ChevronRight, Pencil, Search, XCircle, Trash2, RotateCcw, Paperclip, Loader2, Undo2, Plus } from "lucide-react";
import { useState, useMemo, useRef } from "react";
import { OrderEditDialog } from "./OrderEditDialog";

const ITEMS_PER_PAGE = 15;

export function OrdersList() {
  const { ordersQuery, updateInstallmentStatus, reactivateOrder, deleteOrder, uploadInstallmentReceipt, deleteInstallment, addInstallment, updateInstallment } = useOrders();
  const { canEdit, canDelete } = useUserRole();
  const [expanded, setExpanded] = useState<Set<string>>(new Set());
  const [editOrder, setEditOrder] = useState<any>(null);
  const [search, setSearch] = useState("");
  const [filterFactory, setFilterFactory] = useState("all");
  const [filterDateStart, setFilterDateStart] = useState("");
  const [filterDateEnd, setFilterDateEnd] = useState("");
  const [filterStatus, setFilterStatus] = useState("all");
  const [page, setPage] = useState(1);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [uploadingInstId, setUploadingInstId] = useState<string | null>(null);
  const [editingInst, setEditingInst] = useState<Record<string, { value?: number; due_date?: string }>>({});

  const toggleExpand = (id: string) => {
    setExpanded((prev) => { const n = new Set(prev); n.has(id) ? n.delete(id) : n.add(id); return n; });
  };

  const allOrders = (ordersQuery.data || []).filter((o: any) => o.status !== "deleted");
  const factories = [...new Set(allOrders.map((o: any) => o.factory))].sort();

  const filtered = useMemo(() => {
    return allOrders.filter((o: any) => {
      if (filterFactory !== "all" && o.factory !== filterFactory) return false;
      if (filterStatus !== "all" && o.status !== filterStatus) return false;
      if (filterDateStart && o.order_date < filterDateStart) return false;
      if (filterDateEnd && o.order_date > filterDateEnd) return false;
      if (search) {
        const s = search.toLowerCase();
        return o.factory.toLowerCase().includes(s) || o.client.toLowerCase().includes(s) || o.order_number.toLowerCase().includes(s);
      }
      return true;
    });
  }, [allOrders, search, filterFactory, filterStatus, filterDateStart, filterDateEnd]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / ITEMS_PER_PAGE));
  const orders = filtered.slice((page - 1) * ITEMS_PER_PAGE, page * ITEMS_PER_PAGE);
  useMemo(() => { setPage(1); }, [search, filterFactory, filterStatus, filterDateStart, filterDateEnd]);

  // Footer totals
  const filteredTotals = useMemo(() => ({
    count: filtered.length,
    baseValue: filtered.reduce((s: number, o: any) => s + Number(o.commission_base_value), 0),
    commissionRep: filtered.reduce((s: number, o: any) => s + Number(o.commission_total_rep), 0),
  }), [filtered]);

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file && uploadingInstId) {
      await uploadInstallmentReceipt.mutateAsync({ installmentId: uploadingInstId, file });
      setUploadingInstId(null);
    }
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const handleSaveInstEdit = async (instId: string) => {
    const edits = editingInst[instId];
    if (!edits) return;
    await updateInstallment.mutateAsync({ id: instId, data: edits });
    setEditingInst((prev) => { const n = { ...prev }; delete n[instId]; return n; });
  };

  if (ordersQuery.isLoading) {
    return (
      <div className="flex items-center justify-center py-12 text-muted-foreground gap-2">
        <Loader2 className="h-5 w-5 animate-spin" />Carregando pedidos...
      </div>
    );
  }

  if (allOrders.length === 0) {
    return (
      <Card>
        <CardContent className="py-16 text-center">
          <div className="text-4xl mb-3">📦</div>
          <h3 className="font-semibold text-lg mb-1">Nenhum pedido cadastrado</h3>
          <p className="text-muted-foreground text-sm">Clique em "Novo Pedido" para começar.</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <>
      <input ref={fileInputRef} type="file" accept=".pdf,image/*" className="hidden" onChange={handleFileChange} />
      <Card>
        <CardHeader className="pb-3">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            <CardTitle className="text-lg">Pedidos Cadastrados</CardTitle>
            <div className="flex flex-wrap items-center gap-2">
              <div className="relative">
                <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input placeholder="Buscar..." value={search} onChange={(e) => setSearch(e.target.value)} className="pl-9 h-9 w-full sm:w-48" />
              </div>
              <Select value={filterFactory} onValueChange={setFilterFactory}>
                <SelectTrigger className="h-9 w-full sm:w-40"><SelectValue placeholder="Fábrica" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todas</SelectItem>
                  {factories.map((f: string) => <SelectItem key={f} value={f}>{f}</SelectItem>)}
                </SelectContent>
              </Select>
              <Select value={filterStatus} onValueChange={setFilterStatus}>
                <SelectTrigger className="h-9 w-full sm:w-40"><SelectValue placeholder="Status" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos</SelectItem>
                  {commissionStatusFlow.map((s) => <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>)}
                </SelectContent>
              </Select>
              <Input type="date" value={filterDateStart} onChange={(e) => setFilterDateStart(e.target.value)} className="h-9 w-full sm:w-36" placeholder="Data início" />
              <Input type="date" value={filterDateEnd} onChange={(e) => setFilterDateEnd(e.target.value)} className="h-9 w-full sm:w-36" placeholder="Data fim" />
            </div>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-8"></TableHead>
                  <TableHead>Fábrica</TableHead>
                  <TableHead className="hidden sm:table-cell">Cliente</TableHead>
                  <TableHead className="hidden md:table-cell">Pedido</TableHead>
                  <TableHead className="text-right">Valor Base</TableHead>
                  <TableHead className="text-right hidden sm:table-cell">Comissão Rep.</TableHead>
                  <TableHead className="hidden lg:table-cell">Data</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="w-20"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {orders.map((o: any) => {
                  const isOpen = expanded.has(o.id);
                  const installments = (o.order_installments || []).sort((a: any, b: any) => a.installment_number - b.installment_number);
                  return (
                    <>
                      <TableRow key={o.id} className="cursor-pointer hover:bg-accent/50" onClick={() => toggleExpand(o.id)}>
                        <TableCell className="px-2">{isOpen ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}</TableCell>
                        <TableCell className="font-medium text-xs sm:text-sm">{o.factory}</TableCell>
                        <TableCell className="hidden sm:table-cell text-xs sm:text-sm">{o.client}</TableCell>
                        <TableCell className="hidden md:table-cell text-xs">{o.order_number}</TableCell>
                        <TableCell className="text-right text-xs sm:text-sm">{formatCurrency(o.commission_base_value)}</TableCell>
                        <TableCell className="text-right font-semibold hidden sm:table-cell text-xs sm:text-sm">{formatCurrency(o.commission_total_rep)}</TableCell>
                        <TableCell className="hidden lg:table-cell text-xs">{formatDate(o.order_date)}</TableCell>
                        <TableCell>
                          <Badge variant={o.status === "cancelado" ? "destructive" : "outline"} className="text-[10px]">
                            {statusLabels[o.status] || o.status}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-0.5" onClick={(e) => e.stopPropagation()}>
                            {canEdit && (
                              <Tooltip><TooltipTrigger asChild>
                                <Button size="sm" variant="ghost" className="h-7 w-7 p-0" onClick={() => setEditOrder(o)}>
                                  <Pencil className="h-3.5 w-3.5" />
                                </Button>
                              </TooltipTrigger><TooltipContent>Editar pedido</TooltipContent></Tooltip>
                            )}
                            {o.status === "cancelado" && canEdit && (
                              <Tooltip><TooltipTrigger asChild>
                                <Button size="sm" variant="ghost" className="h-7 w-7 p-0" onClick={() => reactivateOrder.mutate(o.id)}>
                                  <RotateCcw className="h-3.5 w-3.5 text-primary" />
                                </Button>
                              </TooltipTrigger><TooltipContent>Reativar pedido</TooltipContent></Tooltip>
                            )}
                            {canDelete && (
                              <AlertDialog>
                                <Tooltip><TooltipTrigger asChild>
                                  <AlertDialogTrigger asChild>
                                    <Button size="sm" variant="ghost" className="h-7 w-7 p-0"><Trash2 className="h-3.5 w-3.5 text-destructive" /></Button>
                                  </AlertDialogTrigger>
                                </TooltipTrigger><TooltipContent>Excluir pedido</TooltipContent></Tooltip>
                                <AlertDialogContent>
                                  <AlertDialogHeader>
                                    <AlertDialogTitle>Excluir pedido?</AlertDialogTitle>
                                    <AlertDialogDescription>
                                      Esta ação irá excluir o pedido {o.order_number} de {o.factory} - {o.client}.
                                    </AlertDialogDescription>
                                  </AlertDialogHeader>
                                  <AlertDialogFooter>
                                    <AlertDialogCancel>Cancelar</AlertDialogCancel>
                                    <AlertDialogAction onClick={() => deleteOrder.mutate(o.id)} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">Excluir</AlertDialogAction>
                                  </AlertDialogFooter>
                                </AlertDialogContent>
                              </AlertDialog>
                            )}
                          </div>
                        </TableCell>
                      </TableRow>

                      {/* Expanded installments */}
                      {isOpen && (
                        <TableRow key={`${o.id}-inst`}>
                          <TableCell colSpan={9} className="bg-muted/30 p-3 sm:p-4">
                            <div className="flex items-center justify-between mb-2">
                              <div className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Parcelas</div>
                              {canEdit && (
                                <Button size="sm" variant="outline" className="h-7 text-xs" onClick={() => {
                                  const lastInst = installments[installments.length - 1];
                                  const nextNum = lastInst ? lastInst.installment_number + 1 : 1;
                                  const nextDate = lastInst ? new Date(new Date(lastInst.due_date).getTime() + 30 * 86400000).toISOString().split("T")[0] : o.order_date;
                                  addInstallment.mutate({
                                    order_id: o.id,
                                    installment_number: nextNum,
                                    value: 0,
                                    due_date: nextDate,
                                    commission_value_rep: 0,
                                    commission_value_preposto: 0,
                                    status: "previsto",
                                  });
                                }}>
                                  <Plus className="mr-1 h-3 w-3" />Adicionar Parcela
                                </Button>
                              )}
                            </div>

                            {/* Summary row */}
                            {o.commission_total_preposto > 0 && (
                              <div className="flex gap-4 mb-2 text-xs text-muted-foreground">
                                <span>Comissão Rep.: <strong>{formatCurrency(o.commission_total_rep)}</strong></span>
                                <span>Pré-posto: <strong>{formatCurrency(o.commission_total_preposto)}</strong></span>
                                <span>Líquido: <strong>{formatCurrency(o.commission_total_rep - o.commission_total_preposto)}</strong></span>
                              </div>
                            )}

                            <div className="grid gap-2 grid-cols-1 sm:grid-cols-2 lg:grid-cols-4">
                              {installments.map((inst: any) => {
                                const realStatus = getInstallmentStatus(inst.due_date, inst.status);
                                const alertClass = getInstallmentAlertClass(inst.due_date, inst.status);
                                const isEditingThis = !!editingInst[inst.id];
                                return (
                                  <div key={inst.id} className={`rounded-lg border p-3 ${alertClass}`}>
                                    <div className="flex items-center justify-between mb-1">
                                      <span className="text-xs font-medium">Parcela {inst.installment_number}</span>
                                      <div className="flex items-center gap-1">
                                        <Badge variant="outline" className="text-[10px]">{statusLabels[realStatus] || realStatus}</Badge>
                                        {canEdit && inst.status !== "recebido" && (
                                          <>
                                            <Button size="sm" variant="ghost" className="h-5 w-5 p-0" onClick={() => {
                                              if (isEditingThis) handleSaveInstEdit(inst.id);
                                              else setEditingInst((prev) => ({ ...prev, [inst.id]: { value: inst.value, due_date: inst.due_date } }));
                                            }}>
                                              <Pencil className="h-2.5 w-2.5" />
                                            </Button>
                                            <AlertDialog>
                                              <AlertDialogTrigger asChild>
                                                <Button size="sm" variant="ghost" className="h-5 w-5 p-0"><Trash2 className="h-2.5 w-2.5 text-destructive" /></Button>
                                              </AlertDialogTrigger>
                                              <AlertDialogContent>
                                                <AlertDialogHeader><AlertDialogTitle>Excluir parcela {inst.installment_number}?</AlertDialogTitle></AlertDialogHeader>
                                                <AlertDialogFooter>
                                                  <AlertDialogCancel>Cancelar</AlertDialogCancel>
                                                  <AlertDialogAction onClick={() => deleteInstallment.mutate(inst.id)} className="bg-destructive text-destructive-foreground">Excluir</AlertDialogAction>
                                                </AlertDialogFooter>
                                              </AlertDialogContent>
                                            </AlertDialog>
                                          </>
                                        )}
                                      </div>
                                    </div>

                                    {isEditingThis ? (
                                      <div className="space-y-1">
                                        <Input type="number" step="0.01" value={editingInst[inst.id]?.value || ""} onChange={(e) => setEditingInst((prev) => ({ ...prev, [inst.id]: { ...prev[inst.id], value: parseFloat(e.target.value) || 0 } }))} className="h-7 text-xs" />
                                        <Input type="date" value={editingInst[inst.id]?.due_date || ""} onChange={(e) => setEditingInst((prev) => ({ ...prev, [inst.id]: { ...prev[inst.id], due_date: e.target.value } }))} className="h-7 text-xs" />
                                        <Button size="sm" variant="default" className="h-6 text-xs w-full" onClick={() => handleSaveInstEdit(inst.id)}>Salvar</Button>
                                      </div>
                                    ) : (
                                      <>
                                        <div className="text-sm font-bold">{formatCurrency(inst.value)}</div>
                                        <div className="text-xs opacity-75">Venc.: {formatDate(inst.due_date)}</div>
                                        {inst.commission_value_rep > 0 && (
                                          <div className="text-xs opacity-60">Comissão: {formatCurrency(inst.commission_value_rep)}</div>
                                        )}
                                        {inst.notes && <div className="text-xs opacity-60 mt-1 italic">{inst.notes}</div>}
                                      </>
                                    )}

                                    {/* Action buttons for non-received */}
                                    {inst.status !== "recebido" && inst.status !== "cancelado" && canEdit && !isEditingThis && (
                                      <div className="flex flex-wrap gap-1 mt-2">
                                        <Button size="sm" variant="outline" className="h-7 text-xs flex-1 min-w-0" onClick={(e) => {
                                          e.stopPropagation();
                                          updateInstallmentStatus.mutate({ id: inst.id, status: "recebido", paid_date: new Date().toISOString().split("T")[0] });
                                        }}>
                                          <CheckCircle2 className="mr-1 h-3 w-3 shrink-0" /><span className="truncate">Recebido</span>
                                        </Button>
                                        <Tooltip><TooltipTrigger asChild>
                                          <Button size="sm" variant="ghost" className="h-7 px-2" onClick={(e) => {
                                            e.stopPropagation(); setUploadingInstId(inst.id); fileInputRef.current?.click();
                                          }}>
                                            <Paperclip className="h-3 w-3" />
                                          </Button>
                                        </TooltipTrigger><TooltipContent>Anexar comprovante</TooltipContent></Tooltip>
                                        <Button size="sm" variant="ghost" className="h-7 text-xs px-2" onClick={(e) => {
                                          e.stopPropagation(); updateInstallmentStatus.mutate({ id: inst.id, status: "cancelado" });
                                        }}>
                                          <XCircle className="h-3 w-3" />
                                        </Button>
                                      </div>
                                    )}

                                    {/* Undo for received */}
                                    {inst.status === "recebido" && canEdit && (
                                      <div className="mt-2">
                                        <AlertDialog>
                                          <AlertDialogTrigger asChild>
                                            <Button size="sm" variant="outline" className="h-7 text-xs w-full border-destructive/30 text-destructive hover:bg-destructive/10">
                                              <Undo2 className="mr-1 h-3 w-3" />Desfazer Recebimento
                                            </Button>
                                          </AlertDialogTrigger>
                                          <AlertDialogContent>
                                            <AlertDialogHeader>
                                              <AlertDialogTitle>Desfazer recebimento?</AlertDialogTitle>
                                              <AlertDialogDescription>
                                                A parcela {inst.installment_number} voltará ao status "Previsto".
                                              </AlertDialogDescription>
                                            </AlertDialogHeader>
                                            <AlertDialogFooter>
                                              <AlertDialogCancel>Cancelar</AlertDialogCancel>
                                              <AlertDialogAction onClick={() => updateInstallmentStatus.mutate({ id: inst.id, status: "previsto" })}>Confirmar</AlertDialogAction>
                                            </AlertDialogFooter>
                                          </AlertDialogContent>
                                        </AlertDialog>
                                      </div>
                                    )}
                                  </div>
                                );
                              })}
                            </div>
                          </TableCell>
                        </TableRow>
                      )}
                    </>
                  );
                })}
              </TableBody>
            </Table>
          </div>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex items-center justify-between border-t border-border px-4 py-3">
              <p className="text-xs text-muted-foreground">{filtered.length} pedidos encontrados</p>
              <div className="flex gap-1">
                <Button variant="outline" size="sm" disabled={page <= 1} onClick={() => setPage(page - 1)}>Anterior</Button>
                <span className="flex items-center px-3 text-xs">{page} / {totalPages}</span>
                <Button variant="outline" size="sm" disabled={page >= totalPages} onClick={() => setPage(page + 1)}>Próximo</Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {editOrder && (
        <OrderEditDialog order={editOrder} open={!!editOrder} onOpenChange={(open) => { if (!open) setEditOrder(null); }} />
      )}
    </>
  );
}
