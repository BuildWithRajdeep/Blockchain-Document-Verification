import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2.57.4";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

interface VerifyRequest {
  file_hash: string;
  verifier_address?: string;
}

interface VerifyResponse {
  success: boolean;
  status: "verified" | "tampered" | "not_found";
  document?: {
    id: string;
    filename: string;
    file_size: number;
    mime_type: string;
  };
  blockchain?: {
    transaction_hash: string;
    block_number: number;
    owner_address: string;
    block_timestamp: number;
    status: string;
  };
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

    const payload: VerifyRequest = await req.json();

    if (!payload.file_hash) {
      return new Response(
        JSON.stringify({
          success: false,
          status: "not_found",
          error: "file_hash is required",
        } as VerifyResponse),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    const { data: document } = await supabase
      .from("documents")
      .select("id, filename, file_size, mime_type, file_hash, status")
      .eq("file_hash", payload.file_hash)
      .maybeSingle();

    if (!document) {
      const verificationRecord = {
        verified_hash: payload.file_hash,
        status: "not_found",
        verifier_address: payload.verifier_address,
        details: { message: "Document not found in registry" },
      };

      if (payload.verifier_address) {
        await supabase.from("verification_history").insert([verificationRecord]);
      }

      return new Response(
        JSON.stringify({
          success: true,
          status: "not_found",
          message: "Document not found in registry",
        } as VerifyResponse),
        {
          status: 200,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    const { data: blockchainRecord } = await supabase
      .from("blockchain_records")
      .select(
        "transaction_hash, block_number, owner_address, block_timestamp, status"
      )
      .eq("document_id", document.id)
      .maybeSingle();

    if (!blockchainRecord) {
      return new Response(
        JSON.stringify({
          success: true,
          status: "not_found",
          document: {
            id: document.id,
            filename: document.filename,
            file_size: document.file_size,
            mime_type: document.mime_type,
          },
          message: "Document found but not yet confirmed on blockchain",
        } as VerifyResponse),
        {
          status: 200,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    const hashMatch = document.file_hash === payload.file_hash;
    const verificationStatus = hashMatch ? "verified" : "tampered";

    if (payload.verifier_address) {
      await supabase.from("verification_history").insert([
        {
          document_id: document.id,
          verified_hash: payload.file_hash,
          status: verificationStatus,
          verifier_address: payload.verifier_address,
          details: {
            transaction_hash: blockchainRecord.transaction_hash,
            block_number: blockchainRecord.block_number,
          },
        },
      ]);
    }

    return new Response(
      JSON.stringify({
        success: true,
        status: verificationStatus,
        document: {
          id: document.id,
          filename: document.filename,
          file_size: document.file_size,
          mime_type: document.mime_type,
        },
        blockchain: {
          transaction_hash: blockchainRecord.transaction_hash,
          block_number: blockchainRecord.block_number,
          owner_address: blockchainRecord.owner_address,
          block_timestamp: blockchainRecord.block_timestamp,
          status: blockchainRecord.status,
        },
        message: hashMatch
          ? "Document verified successfully"
          : "WARNING: Document hash does not match. File may have been tampered with.",
      } as VerifyResponse),
      {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  } catch (error) {
    console.error("Verification error:", error);
    return new Response(
      JSON.stringify({
        success: false,
        status: "not_found",
        error: error instanceof Error ? error.message : "Internal server error",
      } as VerifyResponse),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});
