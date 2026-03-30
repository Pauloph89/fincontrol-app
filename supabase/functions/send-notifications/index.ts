import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const resendApiKey = Deno.env.get("RESEND_API_KEY");

    if (!resendApiKey) {
      return new Response(
        JSON.stringify({ error: "RESEND_API_KEY not configured" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const supabase = createClient(supabaseUrl, serviceRoleKey);
    const today = new Date();
    const todayStr = today.toISOString().split("T")[0];

    // Get all companies with their email from the companies table
    const { data: companies } = await supabase
      .from("companies")
      .select("id, email, name");

    if (!companies || companies.length === 0) {
      return new Response(
        JSON.stringify({ message: "No companies found" }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    let totalSent = 0;

    for (const company of companies) {
      // Only send to the company admin email — never to CRM clients
      const companyEmail = company.email;
      if (!companyEmail) continue;

      // Check notification settings — only overdue expenses are active by default now
      const { data: settings } = await supabase
        .from("notification_settings")
        .select("*")
        .eq("company_id", company.id)
        .maybeSingle();

      const prefs = settings || {
        notify_commission_overdue: false,
        notify_expense_due_soon: false,
        notify_expense_overdue: true,
        notify_lead_inactive: false,
      };

      // Only process overdue expenses (other types disabled for now)
      if (!prefs.notify_expense_overdue) continue;

      // Overdue expenses: unpaid and past due date
      const { data: overdueExpenses } = await supabase
        .from("expenses")
        .select("id, description, due_date, value")
        .eq("company_id", company.id)
        .neq("status", "pago")
        .lt("due_date", todayStr);

      if (!overdueExpenses || overdueExpenses.length === 0) continue;

      // Build ONE consolidated email with all overdue expenses
      const expenseRows = overdueExpenses
        .sort((a, b) => a.due_date.localeCompare(b.due_date))
        .map(
          (exp) =>
            `<tr>
              <td style="padding: 8px 12px; border-bottom: 1px solid #e5e7eb; font-size: 13px; color: #374151;">${exp.description}</td>
              <td style="padding: 8px 12px; border-bottom: 1px solid #e5e7eb; font-size: 13px; color: #374151; text-align: right;">R$ ${Number(exp.value).toFixed(2).replace(".", ",")}</td>
              <td style="padding: 8px 12px; border-bottom: 1px solid #e5e7eb; font-size: 13px; color: #374151; text-align: center;">${formatDateBR(exp.due_date)}</td>
            </tr>`
        )
        .join("");

      const totalOverdue = overdueExpenses.reduce((s, e) => s + Number(e.value), 0);

      try {
        await fetch("https://api.resend.com/emails", {
          method: "POST",
          headers: {
            Authorization: `Bearer ${resendApiKey}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            from: "FinControl <onboarding@resend.dev>",
            to: [companyEmail],
            subject: "FinControl — Despesas vencidas",
            html: `
              <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
                <div style="background: linear-gradient(135deg, #1e3a5f, #2563eb); padding: 20px; border-radius: 8px 8px 0 0;">
                  <h2 style="color: white; margin: 0; font-size: 18px;">⚠️ Despesas Vencidas</h2>
                  <p style="color: rgba(255,255,255,0.8); margin: 6px 0 0; font-size: 13px;">${overdueExpenses.length} despesa(s) vencida(s) — Total: R$ ${totalOverdue.toFixed(2).replace(".", ",")}</p>
                </div>
                <div style="background: #ffffff; padding: 0; border: 1px solid #e5e7eb; border-top: none; border-radius: 0 0 8px 8px;">
                  <table style="width: 100%; border-collapse: collapse;">
                    <thead>
                      <tr style="background: #f9fafb;">
                        <th style="padding: 10px 12px; text-align: left; font-size: 11px; color: #6b7280; text-transform: uppercase; letter-spacing: 0.5px;">Descrição</th>
                        <th style="padding: 10px 12px; text-align: right; font-size: 11px; color: #6b7280; text-transform: uppercase; letter-spacing: 0.5px;">Valor</th>
                        <th style="padding: 10px 12px; text-align: center; font-size: 11px; color: #6b7280; text-transform: uppercase; letter-spacing: 0.5px;">Vencimento</th>
                      </tr>
                    </thead>
                    <tbody>
                      ${expenseRows}
                    </tbody>
                  </table>
                  <hr style="border: none; border-top: 1px solid #e5e7eb; margin: 0;" />
                  <p style="color: #9ca3af; font-size: 11px; margin: 0; padding: 12px; text-align: center;">Enviado automaticamente pelo FinControl</p>
                </div>
              </div>
            `,
          }),
        });
        totalSent++;
      } catch (emailErr) {
        console.error(`Failed to send email to ${companyEmail}:`, emailErr);
      }
    }

    return new Response(
      JSON.stringify({ message: `Notifications processed. ${totalSent} consolidated emails sent.` }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err) {
    console.error("Error in send-notifications:", err);
    return new Response(
      JSON.stringify({ error: err.message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});

function formatDateBR(dateStr: string): string {
  const [y, m, d] = dateStr.split("-");
  return `${d}/${m}/${y}`;
}
