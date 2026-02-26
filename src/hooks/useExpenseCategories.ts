import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";

const DEFAULT_CATEGORIES = [
  "Combustível", "Alimentação", "Hospedagem", "Telefone", "Internet",
  "Material de Escritório", "Aluguel", "Impostos", "Marketing", "Outros"
];

export function useExpenseCategories() {
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const categoriesQuery = useQuery({
    queryKey: ["expense_categories"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("expense_categories")
        .select("*")
        .order("name");
      if (error) throw error;
      return data;
    },
    enabled: !!user,
  });

  const allCategories = (() => {
    const custom = (categoriesQuery.data || []).map((c: any) => c.name);
    const merged = [...new Set([...DEFAULT_CATEGORIES, ...custom])];
    merged.sort((a, b) => a.localeCompare(b, "pt-BR"));
    return merged;
  })();

  const createCategory = useMutation({
    mutationFn: async (name: string) => {
      if (!user) throw new Error("Not authenticated");
      const { error } = await supabase.from("expense_categories").insert({ user_id: user.id, name });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["expense_categories"] });
      toast({ title: "Categoria criada!" });
    },
    onError: (err: Error) => {
      toast({ title: "Erro ao criar categoria", description: err.message, variant: "destructive" });
    },
  });

  const deleteCategory = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("expense_categories").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["expense_categories"] });
    },
  });

  return { categoriesQuery, allCategories, createCategory, deleteCategory, DEFAULT_CATEGORIES };
}
