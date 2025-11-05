import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2.57.4";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, {
      status: 200,
      headers: corsHeaders,
    });
  }

  try {
    const url = new URL(req.url);
    const format = url.searchParams.get("format") || "csv";
    const status = url.searchParams.get("status");

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL") || "",
      Deno.env.get("SUPABASE_ANON_KEY") || ""
    );

    let query = supabase
      .from("documents")
      .select(
        `
        id,
        filename,
        file_hash,
        file_size,
        mime_type,
        uploader_address,
        tags,
        status,
        created_at,
        blockchain_records(transaction_hash, block_number, owner_address, block_timestamp, status)
      `
      )
      .eq("status", "confirmed")
      .order("created_at", { ascending: false });

    if (status && ["pending", "confirmed", "not_found"].includes(status)) {
      query = query.eq("status", status);
    }

    const { data: documents, error } = await query;

    if (error) {
      throw error;
    }

    let output = "";

    if (format === "csv") {
      const headers = [
        "Filename",
        "SHA-256 Hash",
        "File Size (bytes)",
        "MIME Type",
        "Owner Address",
        "Transaction Hash",
        "Block Number",
        "Block Timestamp",
        "Status",
        "Registered At",
      ];
      output = headers.join(",") + "\n";

      for (const doc of documents || []) {
        const bc = doc.blockchain_records?.[0];
        const row = [
          `"${(doc.filename || "").replace(/"/g, '""')}"`,
          doc.file_hash,
          doc.file_size,
          doc.mime_type,
          doc.owner_address,
          bc?.transaction_hash || "",
          bc?.block_number || "",
          bc?.block_timestamp || "",
          bc?.status || "pending",
          new Date(doc.created_at).toISOString(),
        ];
        output += row.join(",") + "\n";
      }
    } else if (format === "json") {
      output = JSON.stringify(documents, null, 2);
    }

    const filename =
      format === "csv"
        ? `document-proofs-${new Date().toISOString().split("T")[0]}.csv`
        : `document-proofs-${new Date().toISOString().split("T")[0]}.json`;

    return new Response(output, {
      status: 200,
      headers: {
        ...corsHeaders,
        "Content-Type": format === "csv" ? "text/csv" : "application/json",
        "Content-Disposition": `attachment; filename="${filename}"`,
      },
    });
  } catch (error) {
    console.error("Export error:", error);
    return new Response(
      JSON.stringify({
        success: false,
        error: error instanceof Error ? error.message : "Internal server error",
      }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});
