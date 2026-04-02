import { useCallback } from "react";
import { getReceiptSignedUrl } from "@/lib/storage-utils";
import { useToast } from "@/hooks/use-toast";

/**
 * Hook that provides a function to open a receipt via signed URL.
 */
export function useReceiptUrl() {
  const { toast } = useToast();

  const openReceipt = useCallback(async (receiptUrl: string) => {
    const signedUrl = await getReceiptSignedUrl(receiptUrl);
    if (signedUrl) {
      window.open(signedUrl, "_blank");
    } else {
      toast({
        title: "Erro ao abrir comprovante",
        description: "Não foi possível gerar o link de acesso.",
        variant: "destructive",
      });
    }
  }, [toast]);

  return { openReceipt };
}
