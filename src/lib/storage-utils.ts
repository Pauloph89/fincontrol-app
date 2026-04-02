import { supabase } from "@/integrations/supabase/client";

/**
 * Get a signed URL for a receipt file.
 * Handles both legacy public URLs and new storage paths.
 * Returns the signed URL or null if generation fails.
 */
export async function getReceiptSignedUrl(receiptUrl: string): Promise<string | null> {
  if (!receiptUrl) return null;

  // If it's already a full URL (legacy public URL), extract the storage path
  let storagePath = receiptUrl;
  const storagePrefix = "/storage/v1/object/public/receipts/";
  const idx = receiptUrl.indexOf(storagePrefix);
  if (idx !== -1) {
    storagePath = decodeURIComponent(receiptUrl.substring(idx + storagePrefix.length));
  }

  const { data, error } = await supabase.storage
    .from("receipts")
    .createSignedUrl(storagePath, 3600); // 1 hour expiry

  if (error || !data?.signedUrl) {
    console.error("Failed to create signed URL:", error);
    return null;
  }

  return data.signedUrl;
}
