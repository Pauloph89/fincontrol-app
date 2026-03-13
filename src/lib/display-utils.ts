/**
 * Normalizes a name that has no spaces (e.g. "MARIACONCEICAO") by inserting
 * spaces before uppercase letters that follow lowercase letters or sequences.
 * Only applies if the name has NO spaces and is longer than 15 chars.
 */
export function normalizeDisplayName(name: string): string {
  if (!name || name.includes(" ") || name.length <= 15) return name;
  // Insert space before each uppercase letter that follows a lowercase letter
  return name.replace(/([a-z])([A-Z])/g, "$1 $2")
    .replace(/([A-Z]+)([A-Z][a-z])/g, "$1 $2");
}

/**
 * Determines the effective funnel status for display based on orders and commissions.
 * Does NOT change the database value.
 */
export function getEffectiveFunnelStatus(
  dbStatus: string | null,
  hasOrders: boolean,
  hasReceivedCommission: boolean,
): string {
  if (hasReceivedCommission) return "cliente_ativo";
  if (hasOrders) return "pedido_enviado";
  return dbStatus || "lead";
}
