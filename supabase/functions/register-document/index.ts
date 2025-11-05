import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2.57.4";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

interface RegisterRequest {
  filename: string;
  file_hash: string;
  file_size: number;
  mime_type: string;
  uploader_address: string;
  tags?: string[];
}

interface RegisterResponse {
  success: boolean;
  document_id?: string;
  message: string;
  error?: string;
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, {
      status: 200,
      headers: corsHeaders,
    });
  }

  try {
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL") || "",
      Deno.env.get("SUPABASE_ANON_KEY") || ""
    );

    const payload: RegisterRequest = await req.json();

    if (!payload.filename || !payload.file_hash || !payload.file_size) {
      return new Response(
        JSON.stringify({
          success: false,
          error: "Missing required fields: filename, file_hash, file_size",
        } as RegisterResponse),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    if (!/^[0-9a-f]{64}$/i.test(payload.file_hash)) {
      return new Response(
        JSON.stringify({
          success: false,
          error: "Invalid hash format. Expected SHA-256 hex (64 chars)",
        } as RegisterResponse),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    if (payload.file_size > 104857600) {
      return new Response(
        JSON.stringify({
          success: false,
          error: "File size exceeds 100MB limit",
        } as RegisterResponse),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    const existingDoc = await supabase
      .from("documents")
      .select("id, status")
      .eq("file_hash", payload.file_hash)
      .maybeSingle();

    if (existingDoc.data) {
      return new Response(
        JSON.stringify({
          success: false,
          error: `Document already registered with ID: ${existingDoc.data.id}. Status: ${existingDoc.data.status}`,
        } as RegisterResponse),
        {
          status: 409,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    const { data, error } = await supabase
      .from("documents")
      .insert([
        {
          filename: payload.filename,
          file_hash: payload.file_hash,
          file_size: payload.file_size,
          mime_type: payload.mime_type,
          uploader_address: payload.uploader_address,
          tags: payload.tags || [],
          status: "pending",
        },
      ])
      .select("id")
      .single();

    if (error) {
      throw error;
    }

    const { data: blockchainRecord } = await supabase
      .from("blockchain_records")
      .insert([
        {
          document_id: data.id,
          document_hash: payload.file_hash,
          owner_address: payload.uploader_address,
          status: "pending",
        },
      ])
      .select("id");

    setTimeout(async () => {
      const blockNumber = Math.floor(Date.now() / 1000);
      const txHash =
        "0x" +
        Array.from(crypto.getRandomValues(new Uint8Array(32)))
          .map((b) => b.toString(16).padStart(2, "0"))
          .join("");

      await supabase
        .from("blockchain_records")
        .update({
          transaction_hash: txHash,
          block_number: blockNumber,
          block_timestamp: Math.floor(Date.now() / 1000),
          status: "confirmed",
        })
        .eq("document_id", data.id);

      await supabase
        .from("documents")
        .update({ status: "confirmed", updated_at: new Date().toISOString() })
        .eq("id", data.id);
    }, 2000);

    return new Response(
      JSON.stringify({
        success: true,
        document_id: data.id,
        message: "Document registered successfully. Pending blockchain confirmation...",
      } as RegisterResponse),
      {
        status: 201,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  } catch (error) {
    console.error("Register error:", error);
    return new Response(
      JSON.stringify({
        success: false,
        error: error instanceof Error ? error.message : "Internal server error",
      } as RegisterResponse),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});
