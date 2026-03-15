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
    const { text } = await req.json();
    if (!text || typeof text !== "string") {
      return new Response(JSON.stringify({ error: "Campo 'text' é obrigatório" }), {
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

    const systemPrompt = `Você é um assistente especializado em extrair dados de despesas/boletos/faturas a partir de texto extraído de PDFs.
Analise o texto e extraia:
- description: descrição da despesa (nome do fornecedor, serviço, etc.)
- value: valor monetário principal (número decimal, sem R$)
- due_date: data de vencimento no formato YYYY-MM-DD
- suggested_category: uma categoria sugerida entre: Aluguel, Energia, Telecom, Combustível, Material, Serviços, Impostos, Seguros, Manutenção, Outros

REGRAS:
- Para o valor, procure o valor total, valor a pagar, ou valor do documento
- Para a data, procure "vencimento", "data de vencimento", "pagar até"
- Para a descrição, use o nome do cedente, beneficiário ou empresa emissora
- Aceite qualquer formato de data e converta para YYYY-MM-DD
- Se não encontrar um campo, retorne null para ele
- Retorne APENAS JSON válido, sem markdown

Exemplo: {"description": "CEMIG - Conta de Energia", "value": 345.67, "due_date": "2025-03-15", "suggested_category": "Energia"}`;

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: `Extraia os dados de despesa do seguinte texto:\n\n${text.substring(0, 8000)}` },
        ],
        temperature: 0.1,
        max_tokens: 1024,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error("AI Gateway error:", errorText);
      return new Response(
        JSON.stringify({ error: "Falha ao processar texto com IA", details: errorText }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const aiResult = await response.json();
    const content = aiResult.choices?.[0]?.message?.content || "";

    let jsonStr = content;
    const jsonMatch = content.match(/```(?:json)?\s*([\s\S]*?)```/);
    if (jsonMatch) jsonStr = jsonMatch[1].trim();

    let parsed;
    try {
      parsed = JSON.parse(jsonStr);
    } catch {
      const objMatch = content.match(/\{[\s\S]*\}/);
      if (objMatch) {
        parsed = JSON.parse(objMatch[0]);
      } else {
        return new Response(
          JSON.stringify({ error: "Não foi possível interpretar a resposta da IA", raw: content }),
          { status: 422, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
    }

    return new Response(JSON.stringify({ expense: parsed }), {
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
