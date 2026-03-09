import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

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
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "Missing authorization" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const anonKey = Deno.env.get("SUPABASE_ANON_KEY")!;

    const callerClient = createClient(supabaseUrl, anonKey, {
      global: { headers: { Authorization: authHeader } },
    });

    const {
      data: { user: caller },
    } = await callerClient.auth.getUser();
    if (!caller) {
      return new Response(JSON.stringify({ error: "Not authenticated" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { data: isAdmin } = await callerClient.rpc("has_role", {
      _user_id: caller.id,
      _role: "admin",
    });
    if (!isAdmin) {
      return new Response(
        JSON.stringify({ error: "Only admins can invite users" }),
        {
          status: 403,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    const { data: callerProfile } = await callerClient
      .from("profiles")
      .select("company_id")
      .eq("user_id", caller.id)
      .single();

    if (!callerProfile?.company_id) {
      return new Response(
        JSON.stringify({ error: "Admin has no company" }),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    const { email, role, name, origin } = await req.json();

    if (!email || !role) {
      return new Response(
        JSON.stringify({ error: "Email and role are required" }),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    const adminClient = createClient(supabaseUrl, supabaseServiceKey, {
      auth: { autoRefreshToken: false, persistSession: false },
    });

    // Create user with random password (email confirmed) instead of inviteUserByEmail
    // This avoids the Supabase invite email which redirects to Lovable workspace
    const tempPassword = crypto.randomUUID();
    const { data: newUser, error: createError } =
      await adminClient.auth.admin.createUser({
        email,
        password: tempPassword,
        email_confirm: true,
        user_metadata: { name: name || "", company_id: callerProfile.company_id },
      });

    if (createError) {
      // If user already exists, look them up and link to company
      if (createError.message.includes("already been registered") || createError.message.includes("already exists")) {
        const { data: existingUsers } = await adminClient.auth.admin.listUsers();
        const existing = existingUsers?.users?.find((u: any) => u.email === email);
        
        if (!existing) {
          return new Response(JSON.stringify({ error: "Usuário existe mas não foi encontrado" }), {
            status: 400,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          });
        }

        // Update profile with company_id
        await adminClient
          .from("profiles")
          .update({
            company_id: callerProfile.company_id,
            responsible_name: name || null,
            email: email,
          })
          .eq("user_id", existing.id);

        // Update or insert role
        await adminClient
          .from("user_roles")
          .upsert({ user_id: existing.id, role: role, active: true }, { onConflict: "user_id,role" });

        return new Response(
          JSON.stringify({
            success: true,
            user_id: existing.id,
            message: "Usuário existente vinculado à empresa com sucesso",
          }),
          {
            status: 200,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          }
        );
      }

      return new Response(JSON.stringify({ error: createError.message }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Update profile and role for new user
    await adminClient
      .from("profiles")
      .update({
        company_id: callerProfile.company_id,
        responsible_name: name || null,
        email: email,
      })
      .eq("user_id", newUser.user.id);

    await adminClient
      .from("user_roles")
      .upsert({ user_id: newUser.user.id, role: role, active: true }, { onConflict: "user_id,role" });

    // Generate a recovery link so the user can set their own password
    const redirectTo = origin || "https://id-preview--c1762944-3425-4044-923b-768e9aae320f.lovable.app";
    const { data: linkData, error: linkError } = await adminClient.auth.admin.generateLink({
      type: "recovery",
      email,
      options: {
        redirectTo: redirectTo + "/reset-password",
      },
    });

    if (linkError) {
      console.error("Error generating recovery link:", linkError);
      // User was created but recovery link failed - still return success
      return new Response(
        JSON.stringify({
          success: true,
          user_id: newUser.user.id,
          message: "Usuário criado. Peça para usar 'Esqueci minha senha' no login para definir a senha.",
        }),
        {
          status: 200,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    // Send password reset email via Supabase REST API
    // This sends the built-in recovery email to the user
    const resetRes = await fetch(`${supabaseUrl}/auth/v1/recover`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "apikey": anonKey,
      },
      body: JSON.stringify({
        email,
        gotrue_meta_security: {},
      }),
    });

    return new Response(
      JSON.stringify({
        success: true,
        user_id: newUser.user.id,
        message: "Usuário criado! Um e-mail para definir a senha foi enviado.",
      }),
      {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  } catch (err) {
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
