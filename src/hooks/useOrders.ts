import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";
import { addDays } from "date-fns";
import { normalizeInstallments, NormalizedInstallment } from "@/lib/normalize-installments";

export interface OrderInstallmentInput {
  number: number;
  value: number;
  date: string;
  observation?: string;
}

export interface OrderFormData {
  order_number: string;
  factory_invoice_number?: string;
  order_date: string;
  billing_date?: string;
  factory: string;
  client: string;
  client_cnpj?: string;
  client_city?: string;
  client_state?: string;
  salesperson?: string;
  pre_posto?: string;
  commission_base_value: number;
  invoice_total_value?: number;
  commission_percent_rep: number;
  commission_percent_preposto: number;
  observations?: string;
  status?: string;
  order_type?: string;
  origin_order_id?: string;
  // Installment config
  num_installments: number;
  installment_interval: number;
  manual_installments?: OrderInstallmentInput[];
}

/**
 * Calculate commissions:
 * - Rep commission = base_value * percent_rep / 100
 * - Preposto commission = rep_commission * percent_preposto / 100
 * - Net rep = rep_commission - preposto_commission
 */
export function calcCommissions(baseValue: number, percentRep: number, percentPreposto: number) {
  const totalRep = Math.round((baseValue * percentRep) / 100 * 100) / 100;
  const totalPreposto = Math.round((totalRep * percentPreposto) / 100 * 100) / 100;
  return { totalRep, totalPreposto, netRep: Math.round((totalRep - totalPreposto) * 100) / 100 };
}

/**
 * Auto-sync a commission record from an order.
 * Creates or updates the commission in the commissions table.
 */
async function syncCommissionFromOrder(order: any, userId: string, companyId: string) {
  try {
    // Check if a commission already exists for this order
    const { data: existing } = await supabase
      .from("commissions")
      .select("id")
      .eq("external_order_id", order.id)
      .maybeSingle();

    const commissionTotal = Number(order.commission_total_rep) || 0;
    const commissionPercent = Number(order.commission_percent_rep) || 8;

    const commData: any = {
      factory: order.factory,
      client: order.client,
      order_number: order.order_number,
      sale_value: Number(order.commission_base_value),
      commission_percent: commissionPercent,
      commission_total: commissionTotal,
      sale_date: order.order_date,
      billing_date: order.billing_date || null,
      observations: `Gerado automaticamente do pedido ${order.order_number}`,
      external_order_id: order.id,
      status: order.status === "cancelado" ? "cancelada" : "ativa",
    };

    let commissionId: string;

    if (existing) {
      await supabase.from("commissions").update(commData).eq("id", existing.id);
      commissionId = existing.id;
    } else {
      if (order.status === "cancelado" || order.status === "deleted") return;
      const { data: newComm, error: insertErr } = await supabase.from("commissions").insert({
        ...commData,
        user_id: userId,
        company_id: companyId,
      } as any).select("id").single();
      if (insertErr || !newComm) return;
      commissionId = newComm.id;
    }

    // Sync commission installments from order installments
    await syncCommissionInstallments(order.id, commissionId, commissionTotal, existing != null);
  } catch (err) {
    console.error("Erro ao sincronizar comissão:", err);
  }
}

/**
 * Create/update commission_installments mirroring order_installments.
 * Each commission installment value = order installment's commission_value_rep.
 */
async function syncCommissionInstallments(orderId: string, commissionId: string, commissionTotal: number, isUpdate: boolean) {
  try {
    // Get order installments
    const { data: orderInst } = await supabase
      .from("order_installments")
      .select("*")
      .eq("order_id", orderId)
      .order("installment_number", { ascending: true });

    if (!orderInst || orderInst.length === 0) return;

    if (isUpdate) {
      // Delete non-received commission installments and recreate
      const { data: existingCI } = await supabase
        .from("commission_installments")
        .select("id, status")
        .eq("commission_id", commissionId);

      const nonReceived = (existingCI || []).filter((ci: any) => ci.status !== "recebido");
      if (nonReceived.length > 0) {
        await supabase.from("commission_installments").delete().in("id", nonReceived.map((ci: any) => ci.id));
      }

      const receivedCount = (existingCI || []).length - nonReceived.length;
      // Only create installments for non-received order installments
      const orderInstToSync = orderInst.filter((_: any, i: number) => i >= receivedCount);
      if (orderInstToSync.length === 0) return;

      const newInstallments = orderInstToSync.map((oi: any, i: number) => ({
        commission_id: commissionId,
        installment_number: receivedCount + i + 1,
        value: Number(oi.commission_value_rep) || Math.round((commissionTotal / orderInst.length) * 100) / 100,
        due_date: oi.due_date,
        status: oi.status === "cancelado" ? "cancelado" : "previsto",
        notes: oi.notes || null,
      }));

      await supabase.from("commission_installments").insert(newInstallments);
    } else {
      // New commission — create all installments
      const installments = orderInst.map((oi: any) => ({
        commission_id: commissionId,
        installment_number: oi.installment_number,
        value: Number(oi.commission_value_rep) || Math.round((commissionTotal / orderInst.length) * 100) / 100,
        due_date: oi.due_date,
        status: "previsto",
        notes: oi.notes || null,
      }));

      await supabase.from("commission_installments").insert(installments);
    }
  } catch (err) {
    console.error("Erro ao sincronizar parcelas da comissão:", err);
  }
}

export function useOrders() {
  const { user, companyId } = useAuth();
  const { toast } = useToast();
  const qc = useQueryClient();

  const ordersQuery = useQuery({
    queryKey: ["orders"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("orders")
        .select("*, order_installments(*)")
        .eq("company_id", companyId!)
        .order("order_date", { ascending: false });
      if (error) throw error;
      return data;
    },
    enabled: !!user && !!companyId,
  });

  const createOrder = useMutation({
    mutationFn: async (form: OrderFormData) => {
      if (!user || !companyId) throw new Error("Não autenticado");

      const { totalRep, totalPreposto } = calcCommissions(
        form.commission_base_value,
        form.commission_percent_rep,
        form.commission_percent_preposto
      );

      const { data: order, error } = await supabase
        .from("orders")
        .insert({
          user_id: user.id,
          company_id: companyId,
          order_number: form.order_number,
          factory_invoice_number: form.factory_invoice_number || null,
          order_date: form.order_date,
          billing_date: form.billing_date || null,
          factory: form.factory,
          client: form.client,
          client_cnpj: form.client_cnpj || null,
          client_city: form.client_city || null,
          client_state: form.client_state || null,
          salesperson: form.salesperson || null,
          pre_posto: form.pre_posto || null,
          commission_base_value: form.commission_base_value,
          invoice_total_value: form.invoice_total_value || null,
          commission_percent_rep: form.commission_percent_rep,
          commission_percent_preposto: form.commission_percent_preposto,
          commission_total_rep: totalRep,
          commission_total_preposto: totalPreposto,
          status: form.status || "pedido_enviado",
          observations: form.observations || null,
        } as any)
        .select()
        .single();
      if (error) throw error;

      // Build installments
      let installments: any[];

      if (form.manual_installments && form.manual_installments.length > 0) {
        const normalized = normalizeInstallments(
          form.manual_installments.map((mi) => ({
            number: mi.number,
            value: mi.value,
            date: mi.date,
            observation: mi.observation || "",
          }))
        );
        if (!normalized.valid) throw new Error(normalized.error);

        // Total of all installment values
        const totalInstValue = normalized.data.reduce((s, i) => s + i.value, 0);

        installments = normalized.data.map((mi) => {
          const ratio = totalInstValue > 0 ? mi.value / totalInstValue : 1 / normalized.data.length;
          return {
            order_id: order.id,
            installment_number: mi.number,
            value: mi.value,
            due_date: mi.date,
            commission_value_rep: Math.round(totalRep * ratio * 100) / 100,
            commission_value_preposto: Math.round(totalPreposto * ratio * 100) / 100,
            status: "previsto",
            notes: mi.observation || null,
          };
        });
      } else {
        // Auto-generate installments from commission_base_value
        const instValue = Math.round((form.commission_base_value / form.num_installments) * 100) / 100;
        const lastInstValue = Math.round((form.commission_base_value - instValue * (form.num_installments - 1)) * 100) / 100;
        const baseDate = new Date(form.billing_date || form.order_date);

        const commRepPerInst = Math.round((totalRep / form.num_installments) * 100) / 100;
        const commRepLast = Math.round((totalRep - commRepPerInst * (form.num_installments - 1)) * 100) / 100;
        const commPrePerInst = Math.round((totalPreposto / form.num_installments) * 100) / 100;
        const commPreLast = Math.round((totalPreposto - commPrePerInst * (form.num_installments - 1)) * 100) / 100;

        installments = Array.from({ length: form.num_installments }, (_, i) => ({
          order_id: order.id,
          installment_number: i + 1,
          value: i === form.num_installments - 1 ? lastInstValue : instValue,
          due_date: addDays(baseDate, form.installment_interval * (i + 1)).toISOString().split("T")[0],
          commission_value_rep: i === form.num_installments - 1 ? commRepLast : commRepPerInst,
          commission_value_preposto: i === form.num_installments - 1 ? commPreLast : commPrePerInst,
          status: "previsto",
        }));
      }

      const { error: instError } = await supabase.from("order_installments").insert(installments as any);
      if (instError) throw instError;

      // Audit
      await supabase.from("audit_log").insert({
        user_id: user.id,
        company_id: companyId,
        table_name: "orders",
        record_id: order.id,
        action: "create",
        new_data: order,
      } as any);

      // Auto-generate commission record from order
      await syncCommissionFromOrder(order, user.id, companyId);

      // Auto-update client funnel status to "cliente_ativo"
      if (order.client_id) {
        await supabase.from("clients").update({ status_funil: "cliente_ativo" } as any).eq("id", order.client_id);
      } else {
        // Try to find client by name match
        const { data: matchedClients } = await supabase
          .from("clients")
          .select("id")
          .eq("company_id", companyId)
          .ilike("razao_social", order.client);
        if (matchedClients && matchedClients.length > 0) {
          await supabase.from("clients").update({ status_funil: "cliente_ativo" } as any).eq("id", matchedClients[0].id);
        }
      }

      return order;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["orders"] });
      qc.invalidateQueries({ queryKey: ["commissions"] });
      toast({ title: "Pedido cadastrado com sucesso!" });
    },
    onError: (err: Error) => {
      toast({ title: "Erro ao cadastrar pedido", description: err.message, variant: "destructive" });
    },
  });

  const updateOrder = useMutation({
    mutationFn: async ({ id, data: updateData, recalcInstallments }: { id: string; data: Partial<OrderFormData>; recalcInstallments?: boolean }) => {
      if (!user || !companyId) throw new Error("Não autenticado");
      const oldOrder = ordersQuery.data?.find((o: any) => o.id === id);

      const payload: any = {};
      const fields = [
        "order_number", "factory_invoice_number", "order_date", "billing_date",
        "factory", "client", "client_cnpj", "client_city", "client_state",
        "salesperson", "pre_posto", "commission_base_value", "invoice_total_value",
        "commission_percent_rep", "commission_percent_preposto", "observations", "status",
      ] as const;

      for (const f of fields) {
        if ((updateData as any)[f] !== undefined) {
          payload[f] = (updateData as any)[f] || null;
        }
      }

      // Recalc totals if values changed
      if (updateData.commission_base_value !== undefined || updateData.commission_percent_rep !== undefined || updateData.commission_percent_preposto !== undefined) {
        const bv = updateData.commission_base_value ?? oldOrder?.commission_base_value ?? 0;
        const pr = updateData.commission_percent_rep ?? oldOrder?.commission_percent_rep ?? 8;
        const pp = updateData.commission_percent_preposto ?? oldOrder?.commission_percent_preposto ?? 0;
        const calc = calcCommissions(bv, pr, pp);
        payload.commission_total_rep = calc.totalRep;
        payload.commission_total_preposto = calc.totalPreposto;
      }

      const { data: updated, error } = await supabase
        .from("orders")
        .update(payload)
        .eq("id", id)
        .select()
        .single();
      if (error) throw error;

      // Recalc installments if needed
      if (recalcInstallments && (payload.commission_total_rep !== undefined)) {
        const { data: existingInst } = await supabase
          .from("order_installments")
          .select("*")
          .eq("order_id", id);

        const nonReceived = (existingInst || []).filter((i: any) => i.status !== "recebido");
        const received = (existingInst || []).filter((i: any) => i.status === "recebido");
        const receivedRepTotal = received.reduce((s: number, i: any) => s + Number(i.commission_value_rep || 0), 0);
        const receivedPreTotal = received.reduce((s: number, i: any) => s + Number(i.commission_value_preposto || 0), 0);
        const remainingRep = payload.commission_total_rep - receivedRepTotal;
        const remainingPre = (payload.commission_total_preposto ?? 0) - receivedPreTotal;

        if (nonReceived.length > 0 && remainingRep > 0) {
          const ids = nonReceived.map((i: any) => i.id);
          await supabase.from("order_installments").delete().in("id", ids);

          const numNew = updateData.num_installments || nonReceived.length;
          const interval = updateData.installment_interval || 30;
          const baseDate = new Date(updateData.billing_date || updateData.order_date || updated.order_date);

          const bv = updateData.commission_base_value ?? oldOrder?.commission_base_value ?? 0;
          const instVal = Math.round((bv / numNew) * 100) / 100;
          const instValLast = Math.round((bv - instVal * (numNew - 1)) * 100) / 100;
          const repVal = Math.round((remainingRep / numNew) * 100) / 100;
          const repLast = Math.round((remainingRep - repVal * (numNew - 1)) * 100) / 100;
          const preVal = Math.round((remainingPre / numNew) * 100) / 100;
          const preLast = Math.round((remainingPre - preVal * (numNew - 1)) * 100) / 100;

          const newInst = Array.from({ length: numNew }, (_, i) => ({
            order_id: id,
            installment_number: received.length + i + 1,
            value: i === numNew - 1 ? instValLast : instVal,
            commission_value_rep: i === numNew - 1 ? repLast : repVal,
            commission_value_preposto: i === numNew - 1 ? preLast : preVal,
            due_date: addDays(baseDate, interval * (i + 1)).toISOString().split("T")[0],
            status: "previsto",
          }));
          await supabase.from("order_installments").insert(newInst as any);
        }
      }

      await supabase.from("audit_log").insert({
        user_id: user.id,
        company_id: companyId,
        table_name: "orders",
        record_id: id,
        action: "update",
        old_data: oldOrder,
        new_data: updated,
      } as any);

      // Sync commission on update
      await syncCommissionFromOrder(updated, user.id, companyId);

      return updated;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["orders"] });
      qc.invalidateQueries({ queryKey: ["commissions"] });
      toast({ title: "Pedido atualizado!" });
    },
    onError: (err: Error) => {
      toast({ title: "Erro ao atualizar pedido", description: err.message, variant: "destructive" });
    },
  });

  const cancelOrder = useMutation({
    mutationFn: async (id: string) => {
      if (!user || !companyId) throw new Error("Não autenticado");
      await supabase.from("orders").update({ status: "cancelado" } as any).eq("id", id);
      const { data: installments } = await supabase.from("order_installments").select("id, status").eq("order_id", id);
      const nonReceived = (installments || []).filter((i: any) => i.status !== "recebido");
      if (nonReceived.length > 0) {
        await supabase.from("order_installments").update({ status: "cancelado" } as any).in("id", nonReceived.map((i: any) => i.id));
      }
      await supabase.from("audit_log").insert({
        user_id: user.id, company_id: companyId, table_name: "orders",
        record_id: id, action: "cancel", new_data: { status: "cancelado" },
      } as any);
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["orders"] }); toast({ title: "Pedido cancelado." }); },
  });

  const reactivateOrder = useMutation({
    mutationFn: async (id: string) => {
      if (!user || !companyId) throw new Error("Não autenticado");
      await supabase.from("orders").update({ status: "pedido_enviado" } as any).eq("id", id);
      const { data: installments } = await supabase.from("order_installments").select("id, status").eq("order_id", id);
      const cancelled = (installments || []).filter((i: any) => i.status === "cancelado");
      if (cancelled.length > 0) {
        await supabase.from("order_installments").update({ status: "previsto" } as any).in("id", cancelled.map((i: any) => i.id));
      }
      await supabase.from("audit_log").insert({
        user_id: user.id, company_id: companyId, table_name: "orders",
        record_id: id, action: "reactivate", new_data: { status: "pedido_enviado" },
      } as any);
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["orders"] }); toast({ title: "Pedido reativado!" }); },
  });

  const deleteOrder = useMutation({
    mutationFn: async (id: string) => {
      if (!user || !companyId) throw new Error("Não autenticado");
      const { data: installments } = await supabase.from("order_installments").select("id, status").eq("order_id", id);
      const hasReceived = (installments || []).some((i: any) => i.status === "recebido");
      if (hasReceived) {
        // Soft delete - mark as deleted
        await supabase.from("orders").update({ status: "deleted" } as any).eq("id", id);
      } else {
        // Hard delete (CASCADE will remove installments)
        await supabase.from("orders").delete().eq("id", id);
      }
      await supabase.from("audit_log").insert({
        user_id: user.id, company_id: companyId, table_name: "orders",
        record_id: id, action: "delete", new_data: { status: "deleted" },
      } as any);
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["orders"] }); toast({ title: "Pedido excluído." }); },
  });

  const updateInstallmentStatus = useMutation({
    mutationFn: async ({ id, status, paid_date, paid_value, paid_observation }: {
      id: string; status: string; paid_date?: string; paid_value?: number; paid_observation?: string;
    }) => {
      if (!user || !companyId) throw new Error("Não autenticado");
      const { data: oldInst } = await supabase.from("order_installments").select("*").eq("id", id).single();
      const updatePayload: any = { status, paid_date: paid_date ?? null };
      if (paid_value !== undefined) updatePayload.paid_value = paid_value;
      if (paid_observation !== undefined) updatePayload.paid_observation = paid_observation;
      const { error } = await supabase.from("order_installments").update(updatePayload).eq("id", id);
      if (error) throw error;
      await supabase.from("audit_log").insert({
        user_id: user.id, company_id: companyId, table_name: "order_installments",
        record_id: id, action: status === "previsto" ? "undo_receipt" : `status_${status}`,
        old_data: oldInst, new_data: updatePayload,
      } as any);
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["orders"] }); toast({ title: "Status da parcela atualizado!" }); },
  });

  const updateInstallment = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: any }) => {
      if (!user || !companyId) throw new Error("Não autenticado");
      const { error } = await supabase.from("order_installments").update(data).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["orders"] }); toast({ title: "Parcela atualizada!" }); },
  });

  const deleteInstallment = useMutation({
    mutationFn: async (id: string) => {
      if (!user || !companyId) throw new Error("Não autenticado");
      const { error } = await supabase.from("order_installments").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["orders"] }); toast({ title: "Parcela removida!" }); },
  });

  const addInstallment = useMutation({
    mutationFn: async (data: any) => {
      if (!user || !companyId) throw new Error("Não autenticado");
      const { error } = await supabase.from("order_installments").insert(data as any);
      if (error) throw error;
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["orders"] }); toast({ title: "Parcela adicionada!" }); },
  });

  const uploadInstallmentReceipt = useMutation({
    mutationFn: async ({ installmentId, file }: { installmentId: string; file: File }) => {
      if (!user) throw new Error("Não autenticado");
      const filePath = `${user.id}/order_inst_${installmentId}_${file.name}`;
      const { error: uploadError } = await supabase.storage.from("receipts").upload(filePath, file);
      if (uploadError) throw uploadError;
      const { data: { publicUrl } } = supabase.storage.from("receipts").getPublicUrl(filePath);
      const { error } = await supabase.from("order_installments").update({ receipt_url: publicUrl } as any).eq("id", installmentId);
      if (error) throw error;
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["orders"] }); toast({ title: "Comprovante enviado!" }); },
  });

  return {
    ordersQuery,
    createOrder,
    updateOrder,
    cancelOrder,
    reactivateOrder,
    deleteOrder,
    updateInstallmentStatus,
    updateInstallment,
    deleteInstallment,
    addInstallment,
    uploadInstallmentReceipt,
  };
}
