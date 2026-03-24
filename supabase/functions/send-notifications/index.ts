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

    // Get all companies with profiles that have email
    const { data: profiles } = await supabase
      .from("profiles")
      .select("company_id, email")
      .not("email", "is", null)
      .not("company_id", "is", null);

    if (!profiles || profiles.length === 0) {
      return new Response(
        JSON.stringify({ message: "No profiles with email found" }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Deduplicate by company_id (use first profile's email per company)
    const companyMap = new Map<string, string>();
    for (const p of profiles) {
      if (p.company_id && p.email && !companyMap.has(p.company_id)) {
        companyMap.set(p.company_id, p.email);
      }
    }

    let totalSent = 0;

    for (const [companyId, email] of companyMap) {
      // Get notification settings
      const { data: settings } = await supabase
        .from("notification_settings")
        .select("*")
        .eq("company_id", companyId)
        .maybeSingle();

      // Default: all enabled if no settings row exists
      const prefs = settings || {
        notify_commission_overdue: true,
        notify_expense_due_soon: true,
        notify_expense_overdue: true,
        notify_lead_inactive: true,
      };

      const notifications: { subject: string; body: string }[] = [];

      // 1. Overdue commissions (7+ days)
      if (prefs.notify_commission_overdue) {
        const sevenDaysAgo = new Date(today);
        sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
        const sevenDaysAgoStr = sevenDaysAgo.toISOString().split("T")[0];

        // Check order_installments
        const { data: orderInstallments } = await supabase
          .from("order_installments")
          .select("id, due_date, value, order_id, installment_number, orders!inner(factory, client, company_id)")
          .lt("due_date", sevenDaysAgoStr)
          .in("status", ["previsto", "a_receber"])
          .eq("orders.company_id", companyId);

        if (orderInstallments) {
          for (const inst of orderInstallments) {
            const order = (inst as any).orders;
            notifications.push({
              subject: `Comissão atrasada: ${order.factory} - ${order.client}`,
              body: `A parcela ${inst.installment_number} do pedido com vencimento em ${formatDateBR(inst.due_date)} está atrasada há mais de 7 dias. Valor: R$ ${Number(inst.value).toFixed(2).replace(".", ",")}`,
            });
          }
        }

        // Check commission_installments (standalone)
        const { data: commInstallments } = await supabase
          .from("commission_installments")
          .select("id, due_date, value, installment_number, commissions!inner(factory, client, company_id)")
          .lt("due_date", sevenDaysAgoStr)
          .in("status", ["previsto", "a_receber"])
          .eq("commissions.company_id", companyId);

        if (commInstallments) {
          for (const inst of commInstallments) {
            const comm = (inst as any).commissions;
            notifications.push({
              subject: `Comissão atrasada: ${comm.factory} - ${comm.client}`,
              body: `A parcela ${inst.installment_number} com vencimento em ${formatDateBR(inst.due_date)} está atrasada há mais de 7 dias. Valor: R$ ${Number(inst.value).toFixed(2).replace(".", ",")}`,
            });
          }
        }
      }

      // 2. Expenses due in 3 days
      if (prefs.notify_expense_due_soon) {
        const threeDaysFromNow = new Date(today);
        threeDaysFromNow.setDate(threeDaysFromNow.getDate() + 3);
        const threeDaysStr = threeDaysFromNow.toISOString().split("T")[0];

        const { data: dueSoonExpenses } = await supabase
          .from("expenses")
          .select("id, description, due_date, value")
          .eq("company_id", companyId)
          .neq("status", "pago")
          .gte("due_date", todayStr)
          .lte("due_date", threeDaysStr);

        if (dueSoonExpenses) {
          for (const exp of dueSoonExpenses) {
            notifications.push({
              subject: `Despesa a vencer: ${exp.description}`,
              body: `A despesa "${exp.description}" com vencimento em ${formatDateBR(exp.due_date)} está prestes a vencer. Valor: R$ ${Number(exp.value).toFixed(2).replace(".", ",")}`,
            });
          }
        }
      }

      // 3. Overdue expenses
      if (prefs.notify_expense_overdue) {
        const { data: overdueExpenses } = await supabase
          .from("expenses")
          .select("id, description, due_date, value")
          .eq("company_id", companyId)
          .neq("status", "pago")
          .lt("due_date", todayStr);

        if (overdueExpenses) {
          for (const exp of overdueExpenses) {
            notifications.push({
              subject: `Despesa vencida: ${exp.description}`,
              body: `A despesa "${exp.description}" venceu em ${formatDateBR(exp.due_date)} e ainda não foi paga. Valor: R$ ${Number(exp.value).toFixed(2).replace(".", ",")}`,
            });
          }
        }
      }

      // 4. Inactive leads (14+ days without interaction)
      if (prefs.notify_lead_inactive) {
        const fourteenDaysAgo = new Date(today);
        fourteenDaysAgo.setDate(fourteenDaysAgo.getDate() - 14);
        const fourteenDaysStr = fourteenDaysAgo.toISOString().split("T")[0];

        const { data: leads } = await supabase
          .from("clients")
          .select("id, razao_social, nome_fantasia, updated_at")
          .eq("company_id", companyId)
          .eq("status_funil", "lead")
          .lt("updated_at", fourteenDaysStr + "T23:59:59");

        if (leads) {
          for (const lead of leads) {
            // Check if there's a recent interaction
            const { data: recentInteraction } = await supabase
              .from("client_interactions")
              .select("id")
              .eq("client_id", lead.id)
              .gte("date", fourteenDaysStr)
              .limit(1);

            if (!recentInteraction || recentInteraction.length === 0) {
              const clientName = lead.nome_fantasia || lead.razao_social;
              notifications.push({
                subject: `Lead sem contato: ${clientName}`,
                body: `O lead "${clientName}" está sem interações há mais de 14 dias. Considere entrar em contato.`,
              });
            }
          }
        }
      }

      // Send emails via Resend
      for (const notif of notifications) {
        try {
          await fetch("https://api.resend.com/emails", {
            method: "POST",
            headers: {
              Authorization: `Bearer ${resendApiKey}`,
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              from: "FinControl <onboarding@resend.dev>",
              to: [email],
              subject: `[FinControl] ${notif.subject}`,
              html: `
                <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
                  <div style="background: linear-gradient(135deg, #1e3a5f, #2563eb); padding: 20px; border-radius: 8px 8px 0 0;">
                    <h2 style="color: white; margin: 0; font-size: 18px;">📋 ${notif.subject}</h2>
                  </div>
                  <div style="background: #ffffff; padding: 24px; border: 1px solid #e5e7eb; border-top: none; border-radius: 0 0 8px 8px;">
                    <p style="color: #374151; font-size: 14px; line-height: 1.6; margin: 0;">${notif.body}</p>
                    <hr style="border: none; border-top: 1px solid #e5e7eb; margin: 20px 0;" />
                    <p style="color: #9ca3af; font-size: 12px; margin: 0;">Enviado automaticamente pelo FinControl</p>
                  </div>
                </div>
              `,
            }),
          });
          totalSent++;
        } catch (emailErr) {
          console.error(`Failed to send email to ${email}:`, emailErr);
        }
      }
    }

    return new Response(
      JSON.stringify({ message: `Notifications processed. ${totalSent} emails sent.` }),
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
