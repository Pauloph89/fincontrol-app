import "https://esm.sh/@supabase/functions-js/src/edge-runtime.d.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const formData = await req.formData();
    const file = formData.get("file") as File | null;
    const extractionType = formData.get("type") as string | null; // "clients" or default "orders"
    if (!file) {
      return new Response(JSON.stringify({ error: "No file provided" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const apiKey = Deno.env.get("LOVABLE_API_KEY");
    if (!apiKey) {
      return new Response(JSON.stringify({ error: "AI API key not configured" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Read file as base64
    const arrayBuffer = await file.arrayBuffer();
    const base64 = btoa(String.fromCharCode(...new Uint8Array(arrayBuffer)));

    const systemPrompt = `Você é um assistente especializado em extrair dados de pedidos comerciais a partir de PDFs.
Analise o conteúdo do documento e extraia os seguintes campos quando disponíveis:
- order_number: número do pedido
- client: nome do cliente (razão social ou nome fantasia)
- client_cnpj: CNPJ do cliente
- client_city: cidade do cliente
- client_state: UF/estado do cliente (sigla de 2 letras)
- order_date: data do pedido (formato YYYY-MM-DD)
- billing_date: data de faturamento (formato YYYY-MM-DD)
- factory: nome da fábrica/fornecedor
- factory_invoice_number: número da nota fiscal da fábrica
- commission_base_value: valor base para comissão (valor total dos produtos)
- invoice_total_value: valor total da nota fiscal
- salesperson: nome do vendedor/representante
- observations: informações adicionais relevantes
- payment_terms: condição de pagamento encontrada no documento (ex: "30/60/90 DDL", "45DDL", "30-60-90", etc.)
- products: lista de produtos encontrados (array de objetos com name, quantity, unit_price, total)

REGRAS DE DATAS:
- Aceite e converta qualquer formato de data: DD/MM/AAAA, DD/MM/AA, DD-MM-AAAA, DD.MM.AAAA
- Para datas com ano de 2 dígitos (DD/MM/AA), considere 20XX se XX <= 50, senão 19XX
- Sempre retorne datas no formato YYYY-MM-DD
- Se não encontrar a data, retorne null

REGRAS DE PRAZOS DE PAGAMENTO:
- Identifique prazos como "30DDL", "45DDL", "30/60/90 DDL", "30-60-90", "30,60,90 dias", etc.
- Retorne o campo payment_terms exatamente como aparece no documento
- DDL significa "Dias Da Liquidação" (dias após faturamento/entrega)

Retorne APENAS um JSON válido com os campos encontrados. Campos não encontrados devem ser null.
Se houver múltiplos pedidos no documento, retorne um array de objetos.
Sempre retorne o resultado dentro de um objeto com chave "orders" que é um array.

Exemplo de resposta:
{"orders": [{"order_number": "12345", "client": "Empresa X", "commission_base_value": 1500.00, "payment_terms": "30/60/90 DDL", ...}]}`;

    const response = await fetch(
      "https://ai.gateway.lovable.dev/v1/chat/completions",
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${apiKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: "google/gemini-2.5-flash",
          messages: [
            { role: "system", content: systemPrompt },
            {
              role: "user",
              content: [
                {
                  type: "text",
                  text: "Extraia os dados de pedido deste documento PDF. Retorne apenas JSON válido.",
                },
                {
                  type: "image_url",
                  image_url: {
                    url: `data:application/pdf;base64,${base64}`,
                  },
                },
              ],
            },
          ],
          temperature: 0.1,
          max_tokens: 4096,
        }),
      }
    );

    if (!response.ok) {
      const errorText = await response.text();
      console.error("AI Gateway error:", errorText);
      return new Response(
        JSON.stringify({ error: "Failed to process PDF with AI", details: errorText }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const aiResult = await response.json();
    const content = aiResult.choices?.[0]?.message?.content || "";

    // Extract JSON from response (handle markdown code blocks)
    let jsonStr = content;
    const jsonMatch = content.match(/```(?:json)?\s*([\s\S]*?)```/);
    if (jsonMatch) {
      jsonStr = jsonMatch[1].trim();
    }

    let parsed;
    try {
      parsed = JSON.parse(jsonStr);
    } catch {
      // Try to find JSON object in the response
      const objMatch = content.match(/\{[\s\S]*\}/);
      if (objMatch) {
        parsed = JSON.parse(objMatch[0]);
      } else {
        return new Response(
          JSON.stringify({ error: "Could not parse AI response", raw: content }),
          { status: 422, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
    }

    // Normalize to always have orders array
    if (!parsed.orders) {
      parsed = { orders: Array.isArray(parsed) ? parsed : [parsed] };
    }

    return new Response(JSON.stringify(parsed), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("Error:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
