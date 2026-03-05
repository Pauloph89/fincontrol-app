import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";
import { addDays } from "date-fns";
import { normalizeInstallments } from "@/lib/normalize-installments";

export interface ManualInstallment {
  number: number;
  value: number;
  date: string;
  observation?: string;
}

export interface CommissionFormData {
  factory: string;
  client: string;
  order_number: string;
  sale_value: number;
  commission_percent: number;
  sale_date: string;
  billing_date?: string;
  observations?: string;
  crm_deal_id?: string;
  num_installments: number;
  installment_interval: number;
  manual_installments?: ManualInstallment[];
  commission_status?: string;
}

export function useCommissions() {
  const { user, companyId } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const commissionsQuery = useQuery({
    queryKey: ["commissions"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("commissions")
        .select("*, commission_installments(*)")
        .order("sale_date", { ascending: false });
      if (error) throw error;
      return data;
    },
    enabled: !!user && !!companyId,
  });

  const createCommission = useMutation({
    mutationFn: async (form: CommissionFormData) => {
      if (!user || !companyId) throw new Error("Not authenticated");
      const commission_total = (form.sale_value * form.commission_percent) / 100;

      const { data: commission, error } = await supabase
        .from("commissions")
        .insert({
          user_id: user.id,
          company_id: companyId,
          factory: form.factory,
          client: form.client,
          order_number: form.order_number,
          sale_value: form.sale_value,
          commission_percent: form.commission_percent,
          commission_total,
          sale_date: form.sale_date,
          billing_date: form.billing_date || null,
          observations: form.observations || null,
          crm_deal_id: form.crm_deal_id || null,
          status: form.commission_status || "pedido_enviado",
        } as any)
        .select()
        .single();
      if (error) throw error;

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

        installments = normalized.data.map((mi) => ({
          commission_id: commission.id,
          installment_number: mi.number,
          value: mi.value,
          due_date: mi.date,
          status: "previsto" as const,
          notes: mi.observation || null,
        }));
      } else {
        const installmentValue = Math.round((commission_total / form.num_installments) * 100) / 100;
        const lastInstallment = Math.round((commission_total - installmentValue * (form.num_installments - 1)) * 100) / 100;
        const baseDate = new Date(form.billing_date || form.sale_date);
        installments = Array.from({ length: form.num_installments }, (_, i) => ({
          commission_id: commission.id,
          installment_number: i + 1,
          value: i === form.num_installments - 1 ? lastInstallment : installmentValue,
          due_date: addDays(baseDate, form.installment_interval * (i + 1)).toISOString().split("T")[0],
          status: "previsto" as const,
        }));
      }

      const { error: instError } = await supabase.from("commission_installments").insert(installments);
      if (instError) throw instError;

      await supabase.from("audit_log").insert({
        user_id: user.id,
        company_id: companyId,
        table_name: "commissions",
        record_id: commission.id,
        action: "create",
        new_data: commission,
      } as any);

      return commission;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["commissions"] });
      toast({ title: "Comissão cadastrada com sucesso!" });
    },
    onError: (err: Error) => {
      toast({ title: "Erro ao cadastrar comissão", description: err.message, variant: "destructive" });
    },
  });

  const updateCommission = useMutation({
    mutationFn: async ({ id, data: updateData, recalcInstallments }: { id: string; data: Partial<CommissionFormData>; recalcInstallments?: boolean }) => {
      if (!user || !companyId) throw new Error("Not authenticated");
      const oldCommission = commissionsQuery.data?.find((c) => c.id === id);

      const updatePayload: any = {};
      if (updateData.factory !== undefined) updatePayload.factory = updateData.factory;
      if (updateData.client !== undefined) updatePayload.client = updateData.client;
      if (updateData.order_number !== undefined) updatePayload.order_number = updateData.order_number;
      if (updateData.sale_value !== undefined) updatePayload.sale_value = updateData.sale_value;
      if (updateData.commission_percent !== undefined) updatePayload.commission_percent = updateData.commission_percent;
      if (updateData.sale_date !== undefined) updatePayload.sale_date = updateData.sale_date;
      if (updateData.billing_date !== undefined) updatePayload.billing_date = updateData.billing_date || null;
      if (updateData.observations !== undefined) updatePayload.observations = updateData.observations || null;
      if ((updateData as any).status !== undefined) updatePayload.status = (updateData as any).status;

      if (updateData.sale_value !== undefined || updateData.commission_percent !== undefined) {
        const sv = updateData.sale_value ?? oldCommission?.sale_value ?? 0;
        const cp = updateData.commission_percent ?? oldCommission?.commission_percent ?? 8;
        updatePayload.commission_total = (sv * cp) / 100;
      }

      const { data: updated, error } = await supabase
        .from("commissions")
        .update(updatePayload)
        .eq("id", id)
        .select()
        .single();
      if (error) throw error;

      if (recalcInstallments && updatePayload.commission_total !== undefined) {
        const { data: existingInst } = await supabase
          .from("commission_installments")
          .select("*")
          .eq("commission_id", id);

        const nonReceived = (existingInst || []).filter((i: any) => i.status !== "recebido");
        const received = (existingInst || []).filter((i: any) => i.status === "recebido");
        const receivedTotal = received.reduce((s: number, i: any) => s + Number(i.value), 0);
        const remaining = updatePayload.commission_total - receivedTotal;

        if (nonReceived.length > 0 && remaining > 0) {
          const ids = nonReceived.map((i: any) => i.id);
          await supabase.from("commission_installments").delete().in("id", ids);

          const numNew = updateData.num_installments || nonReceived.length;
          const interval = updateData.installment_interval || 30;
          const instValue = Math.round((remaining / numNew) * 100) / 100;
          const lastVal = Math.round((remaining - instValue * (numNew - 1)) * 100) / 100;
          const baseDate = new Date(updateData.billing_date || updateData.sale_date || updated.sale_date);

          const newInst = Array.from({ length: numNew }, (_, i) => ({
            commission_id: id,
            installment_number: received.length + i + 1,
            value: i === numNew - 1 ? lastVal : instValue,
            due_date: addDays(baseDate, interval * (i + 1)).toISOString().split("T")[0],
            status: "previsto" as const,
          }));
          await supabase.from("commission_installments").insert(newInst);
        }
      }

      await supabase.from("audit_log").insert({
        user_id: user.id,
        company_id: companyId,
        table_name: "commissions",
        record_id: id,
        action: "update",
        old_data: oldCommission,
        new_data: updated,
      } as any);

      return updated;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["commissions"] });
      toast({ title: "Comissão atualizada!" });
    },
    onError: (err: Error) => {
      toast({ title: "Erro ao atualizar comissão", description: err.message, variant: "destructive" });
    },
  });

  const cancelCommission = useMutation({
    mutationFn: async (id: string) => {
      if (!user || !companyId) throw new Error("Not authenticated");
      await supabase.from("commissions").update({ status: "cancelada" }).eq("id", id);
      const { data: installments } = await supabase
        .from("commission_installments")
        .select("id, status")
        .eq("commission_id", id);
      const nonReceived = (installments || []).filter((i: any) => i.status !== "recebido");
      if (nonReceived.length > 0) {
        await supabase.from("commission_installments").update({ status: "cancelado" }).in("id", nonReceived.map((i: any) => i.id));
      }
      await supabase.from("audit_log").insert({
        user_id: user.id,
        company_id: companyId,
        table_name: "commissions",
        record_id: id,
        action: "cancel",
        new_data: { status: "cancelada" },
      } as any);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["commissions"] });
      toast({ title: "Comissão cancelada." });
    },
  });

  const reactivateCommission = useMutation({
    mutationFn: async (id: string) => {
      if (!user || !companyId) throw new Error("Not authenticated");
      await supabase.from("commissions").update({ status: "ativa" }).eq("id", id);
      const { data: installments } = await supabase
        .from("commission_installments")
        .select("id, status")
        .eq("commission_id", id);
      const cancelled = (installments || []).filter((i: any) => i.status === "cancelado");
      if (cancelled.length > 0) {
        await supabase.from("commission_installments").update({ status: "previsto" }).in("id", cancelled.map((i: any) => i.id));
      }
      await supabase.from("audit_log").insert({
        user_id: user.id,
        company_id: companyId,
        table_name: "commissions",
        record_id: id,
        action: "reactivate",
        new_data: { status: "ativa" },
      } as any);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["commissions"] });
      toast({ title: "Comissão reativada!" });
    },
  });

  const deleteCommission = useMutation({
    mutationFn: async (id: string) => {
      if (!user || !companyId) throw new Error("Not authenticated");
      await supabase.from("commissions").update({ status: "deleted" }).eq("id", id);
      const { data: installments } = await supabase
        .from("commission_installments")
        .select("id, status")
        .eq("commission_id", id);
      const nonReceived = (installments || []).filter((i: any) => i.status !== "recebido");
      if (nonReceived.length > 0) {
        await supabase.from("commission_installments").update({ status: "cancelado" }).in("id", nonReceived.map((i: any) => i.id));
      }
      await supabase.from("audit_log").insert({
        user_id: user.id,
        company_id: companyId,
        table_name: "commissions",
        record_id: id,
        action: "delete",
        new_data: { status: "deleted" },
      } as any);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["commissions"] });
      toast({ title: "Comissão excluída." });
    },
  });

  const updateInstallmentStatus = useMutation({
    mutationFn: async ({ id, status, paid_date }: { id: string; status: string; paid_date?: string }) => {
      if (!user || !companyId) throw new Error("Not authenticated");
      const { data: oldInst } = await supabase
        .from("commission_installments")
        .select("*")
        .eq("id", id)
        .single();

      const { error } = await supabase
        .from("commission_installments")
        .update({ status, paid_date: paid_date ?? null })
        .eq("id", id);
      if (error) throw error;

      await supabase.from("audit_log").insert({
        user_id: user.id,
        company_id: companyId,
        table_name: "commission_installments",
        record_id: id,
        action: status === "previsto" ? "undo_receipt" : `status_${status}`,
        old_data: oldInst,
        new_data: { status, paid_date: paid_date ?? null },
      } as any);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["commissions"] });
      toast({ title: "Status da parcela atualizado!" });
    },
  });

  const uploadInstallmentReceipt = useMutation({
    mutationFn: async ({ installmentId, file }: { installmentId: string; file: File }) => {
      if (!user) throw new Error("Not authenticated");
      const filePath = `${user.id}/inst_${installmentId}_${file.name}`;
      const { error: uploadError } = await supabase.storage.from("receipts").upload(filePath, file);
      if (uploadError) throw uploadError;
      const { data: { publicUrl } } = supabase.storage.from("receipts").getPublicUrl(filePath);
      const { error } = await supabase.from("commission_installments").update({ receipt_url: publicUrl } as any).eq("id", installmentId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["commissions"] });
      toast({ title: "Comprovante enviado!" });
    },
  });

  return {
    commissionsQuery,
    createCommission,
    updateCommission,
    cancelCommission,
    reactivateCommission,
    deleteCommission,
    updateInstallmentStatus,
    uploadInstallmentReceipt,
  };
}
