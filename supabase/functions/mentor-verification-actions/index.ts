import { createClient } from "npm:@supabase/supabase-js@2.57.4";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

interface AdminUser {
  id: string;
  role: string;
}

async function verifyAdmin(authHeader: string): Promise<AdminUser | null> {
  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_ANON_KEY")!,
    { global: { headers: { Authorization: authHeader } } }
  );
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;

  const { data: profile } = await supabase
    .from("profiles")
    .select("id, role")
    .eq("id", user.id)
    .single();

  if (!profile || profile.role !== "admin") return null;
  return profile;
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 200, headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get("Authorization") || "";
    const admin = await verifyAdmin(authHeader);
    if (!admin) {
      return new Response(
        JSON.stringify({ error: "Unauthorized: admin access required" }),
        { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const body = await req.json();
    const { action } = body;

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      { global: { headers: { Authorization: authHeader } } }
    );

    let result;

    switch (action) {
      case "approve_mentor": {
        const { error } = await supabase.rpc("approve_mentor", {
          p_application_id: body.applicationId,
        });
        if (error) throw error;
        result = { success: true, message: "Mentor approved" };
        break;
      }

      case "set_competency": {
        const { error } = await supabase.rpc("set_competency_verified", {
          p_application_id: body.applicationId,
          p_verified: body.verified,
          p_reason: body.reason || null,
        });
        if (error) throw error;
        result = { success: true, message: body.verified ? "Competency verified" : "Competency verification failed" };
        break;
      }

      case "set_identity": {
        const { error } = await supabase.rpc("set_identity_verified", {
          p_application_id: body.applicationId,
          p_verified: body.verified,
          p_reason: body.reason || null,
        });
        if (error) throw error;
        result = { success: true, message: body.verified ? "Identity verified" : "Identity verification failed" };
        break;
      }

      case "reject_application": {
        const { error } = await supabase.rpc("reject_mentor_application", {
          p_application_id: body.applicationId,
          p_reason: body.reason,
        });
        if (error) throw error;
        result = { success: true, message: "Application rejected" };
        break;
      }

      case "suspend_mentor": {
        const { error } = await supabase.rpc("suspend_mentor", {
          p_application_id: body.applicationId,
          p_reason: body.reason,
        });
        if (error) throw error;
        result = { success: true, message: "Mentor suspended" };
        break;
      }

      case "review_skill": {
        const { error } = await supabase.rpc("review_skill_verification", {
          p_skill_verif_id: body.skillVerifId,
          p_decision: body.decision,
          p_feedback: body.feedback || null,
        });
        if (error) throw error;
        result = { success: true, message: `Skill marked ${body.decision}` };
        break;
      }

      case "request_evidence": {
        const { error } = await supabase.rpc("request_additional_evidence", {
          p_application_id: body.applicationId,
          p_skill_id: body.skillId,
          p_feedback: body.feedback,
        });
        if (error) throw error;
        result = { success: true, message: "Evidence requested" };
        break;
      }

      case "list_applications": {
        const { data, error } = await supabase
          .from("mentor_applications")
          .select(`
            *,
            mentor_skill_verifications (*),
            mentor_verification_history (*),
            profiles!mentor_applications_user_id_fkey (display_name, email)
          `)
          .order("updated_at", { ascending: false });
        if (error) throw error;
        result = { applications: data };
        break;
      }

      default:
        return new Response(
          JSON.stringify({ error: "Unknown action" }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
    }

    return new Response(
      JSON.stringify(result),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err) {
    const message = err instanceof Error ? err.message : "Internal server error";
    return new Response(
      JSON.stringify({ error: message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
