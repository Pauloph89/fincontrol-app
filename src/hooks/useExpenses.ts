import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";
import { addMonths, addYears } from "date-fns";

export interface ExpenseFormData {
  type: string;
  category: string;
  description: string;
  value: number;
  account: string;
  due_date: string;
  payment_date?: string;
  recurrence?: string;
  recurrence_end_date?: string;
}

export function useExpenses() {
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const expensesQuery = useQuery({
    queryKey: ["expenses"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("expenses")
        .select("*")
        .order("due_date", { ascending: false });
      if (error) throw error;
      return data;
    },
    enabled: !!user,
  });

  const createExpense = useMutation({
    mutationFn: async (form: ExpenseFormData) => {
      if (!user) throw new Error("Not authenticated");
      const status = form.payment_date ? "pago" : "a_vencer";
      const { data: parent, error } = await supabase.from("expenses").insert({
        user_id: user.id,
        type: form.type,
        category: form.category,
        description: form.description,
        value: form.value,
        account: form.account,
        due_date: form.due_date,
        payment_date: form.payment_date || null,
        status,
        recurrence: form.recurrence || null,
        recurrence_end_date: form.recurrence_end_date || null,
      }).select().single();
      if (error) throw error;

      // Generate recurrent expenses
      if (form.recurrence && parent) {
        const recurrences: any[] = [];
        let currentDate = new Date(form.due_date);
        const endDate = form.recurrence_end_date ? new Date(form.recurrence_end_date) : addYears(currentDate, 1);

        for (let i = 0; i < 24; i++) {
          if (form.recurrence === "mensal") currentDate = addMonths(new Date(form.due_date), i + 1);
          else if (form.recurrence === "trimestral") currentDate = addMonths(new Date(form.due_date), (i + 1) * 3);
          else if (form.recurrence === "anual") currentDate = addYears(new Date(form.due_date), i + 1);

          if (currentDate > endDate) break;

          recurrences.push({
            user_id: user.id,
            type: form.type,
            category: form.category,
            description: form.description,
            value: form.value,
            account: form.account,
            due_date: currentDate.toISOString().split("T")[0],
            status: "a_vencer",
            recurrence: form.recurrence,
            parent_expense_id: parent.id,
          });
        }

        if (recurrences.length > 0) {
          await supabase.from("expenses").insert(recurrences);
        }
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["expenses"] });
      toast({ title: "Despesa cadastrada com sucesso!" });
    },
    onError: (err: Error) => {
      toast({ title: "Erro ao cadastrar despesa", description: err.message, variant: "destructive" });
    },
  });

  const updateExpense = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: Partial<ExpenseFormData> }) => {
      if (!user) throw new Error("Not authenticated");
      const { error } = await supabase.from("expenses").update(data as any).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["expenses"] });
      toast({ title: "Despesa atualizada!" });
    },
    onError: (err: Error) => {
      toast({ title: "Erro ao atualizar despesa", description: err.message, variant: "destructive" });
    },
  });

  const deleteExpense = useMutation({
    mutationFn: async ({ id, deleteSeries }: { id: string; deleteSeries?: boolean }) => {
      if (deleteSeries) {
        // Delete all children and the parent
        await supabase.from("expenses").delete().eq("parent_expense_id", id);
      }
      const { error } = await supabase.from("expenses").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["expenses"] });
      toast({ title: "Despesa excluída!" });
    },
  });

  const markExpensePaid = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from("expenses")
        .update({ status: "pago", payment_date: new Date().toISOString().split("T")[0] })
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["expenses"] });
      toast({ title: "Despesa marcada como paga!" });
    },
  });

  const uploadReceipt = useMutation({
    mutationFn: async ({ expenseId, file }: { expenseId: string; file: File }) => {
      if (!user) throw new Error("Not authenticated");
      const filePath = `${user.id}/${expenseId}_${file.name}`;
      const { error: uploadError } = await supabase.storage.from("receipts").upload(filePath, file);
      if (uploadError) throw uploadError;
      const { data: { publicUrl } } = supabase.storage.from("receipts").getPublicUrl(filePath);
      const { error } = await supabase.from("expenses").update({ receipt_url: publicUrl }).eq("id", expenseId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["expenses"] });
      toast({ title: "Comprovante enviado!" });
    },
  });

  return { expensesQuery, createExpense, updateExpense, deleteExpense, markExpensePaid, uploadReceipt };
}
