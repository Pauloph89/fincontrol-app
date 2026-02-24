import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";
import { addDays } from "date-fns";

export interface CommissionFormData {
  factory: string;
  client: string;
  order_number: string;
  sale_value: number;
  commission_percent: number;
  sale_date: string;
  observations?: string;
  crm_deal_id?: string;
}

export function useCommissions() {
  const { user } = useAuth();
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
    enabled: !!user,
  });

  const createCommission = useMutation({
    mutationFn: async (form: CommissionFormData) => {
      if (!user) throw new Error("Not authenticated");
      const commission_total = (form.sale_value * form.commission_percent) / 100;
      const installmentValue = Math.round((commission_total / 4) * 100) / 100;
      // Adjust last installment for rounding
      const lastInstallment = commission_total - installmentValue * 3;

      const { data: commission, error } = await supabase
        .from("commissions")
        .insert({
          user_id: user.id,
          factory: form.factory,
          client: form.client,
          order_number: form.order_number,
          sale_value: form.sale_value,
          commission_percent: form.commission_percent,
          commission_total,
          sale_date: form.sale_date,
          observations: form.observations || null,
          crm_deal_id: form.crm_deal_id || null,
        })
        .select()
        .single();
      if (error) throw error;

      const saleDate = new Date(form.sale_date);
      const installments = [30, 60, 90, 120].map((days, i) => ({
        commission_id: commission.id,
        installment_number: i + 1,
        value: i === 3 ? lastInstallment : installmentValue,
        due_date: addDays(saleDate, days).toISOString().split("T")[0],
        status: "previsto" as const,
      }));

      const { error: instError } = await supabase
        .from("commission_installments")
        .insert(installments);
      if (instError) throw instError;

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

  const updateInstallmentStatus = useMutation({
    mutationFn: async ({ id, status, paid_date }: { id: string; status: string; paid_date?: string }) => {
      const { error } = await supabase
        .from("commission_installments")
        .update({ status, paid_date: paid_date || null })
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["commissions"] });
    },
  });

  return { commissionsQuery, createCommission, updateInstallmentStatus };
}
