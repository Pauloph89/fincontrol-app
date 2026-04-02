import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";

export interface BankEntryFormData {
  date: string;
  description: string;
  value: number;
  type: "entrada" | "saida";
  account: "cnpj" | "pessoal";
}

export function useBankEntries() {
  const { user, companyId } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const bankEntriesQuery = useQuery({
    queryKey: ["bank_entries"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("bank_entries")
        .select("*")
        .order("date", { ascending: false });
      if (error) throw error;
      return data;
    },
    enabled: !!user && !!companyId,
  });

  const createBankEntry = useMutation({
    mutationFn: async (form: BankEntryFormData) => {
      if (!user || !companyId) throw new Error("Not authenticated");
      const { error } = await supabase.from("bank_entries").insert({
        user_id: user.id,
        company_id: companyId,
        ...form,
      } as any);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["bank_entries"] });
      toast({ title: "Entrada bancária registrada!" });
    },
    onError: (err: Error) => {
      toast({ title: "Erro ao registrar entrada", description: err.message, variant: "destructive" });
    },
  });

  const reconcileWithCommission = useMutation({
    mutationFn: async ({ bankEntryId, installmentId }: { bankEntryId: string; installmentId: string }) => {
      const { error: e1 } = await supabase
        .from("bank_entries")
        .update({ reconciled: true, commission_installment_id: installmentId })
        .eq("id", bankEntryId);
      if (e1) throw e1;
      const { error: e2 } = await supabase
        .from("commission_installments")
        .update({ status: "recebido", paid_date: new Date().toISOString().split("T")[0] })
        .eq("id", installmentId);
      if (e2) throw e2;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["bank_entries"] });
      queryClient.invalidateQueries({ queryKey: ["commissions"] });
      toast({ title: "Conciliado com comissão!" });
    },
  });

  const reconcileWithExpense = useMutation({
    mutationFn: async ({ bankEntryId, expenseId }: { bankEntryId: string; expenseId: string }) => {
      const { error: e1 } = await supabase
        .from("bank_entries")
        .update({ reconciled: true, expense_id: expenseId })
        .eq("id", bankEntryId);
      if (e1) throw e1;
      const { error: e2 } = await supabase
        .from("expenses")
        .update({ status: "pago", payment_date: new Date().toISOString().split("T")[0] })
        .eq("id", expenseId);
      if (e2) throw e2;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["bank_entries"] });
      queryClient.invalidateQueries({ queryKey: ["expenses"] });
      toast({ title: "Conciliado com despesa!" });
    },
  });

  const uploadReceipt = useMutation({
    mutationFn: async ({ bankEntryId, file }: { bankEntryId: string; file: File }) => {
      if (!user) throw new Error("Not authenticated");
      const filePath = `${user.id}/${bankEntryId}_${file.name}`;
      const { error: uploadError } = await supabase.storage.from("receipts").upload(filePath, file);
      if (uploadError) throw uploadError;
      const { error } = await supabase.from("bank_entries").update({ receipt_url: filePath }).eq("id", bankEntryId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["bank_entries"] });
      toast({ title: "Comprovante enviado!" });
    },
  });

  return { bankEntriesQuery, createBankEntry, reconcileWithCommission, reconcileWithExpense, uploadReceipt };
}
