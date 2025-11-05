const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL;
const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY;

const API_BASE = `${SUPABASE_URL}/functions/v1`;

interface RegisterPayload {
  filename: string;
  file_hash: string;
  file_size: number;
  mime_type: string;
  uploader_address: string;
  tags?: string[];
}

interface VerifyPayload {
  file_hash: string;
  verifier_address?: string;
}

export async function registerDocument(payload: RegisterPayload) {
  const response = await fetch(`${API_BASE}/register-document`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${SUPABASE_ANON_KEY}`,
    },
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || "Failed to register document");
  }

  return response.json();
}

export async function verifyDocument(payload: VerifyPayload) {
  const response = await fetch(`${API_BASE}/verify-document`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${SUPABASE_ANON_KEY}`,
    },
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || "Failed to verify document");
  }

  return response.json();
}

export async function getDocuments(
  status?: string,
  limit: number = 50,
  offset: number = 0
) {
  const params = new URLSearchParams();
  if (status) params.append("status", status);
  params.append("limit", limit.toString());
  params.append("offset", offset.toString());

  const response = await fetch(`${API_BASE}/get-documents?${params.toString()}`, {
    method: "GET",
    headers: {
      Authorization: `Bearer ${SUPABASE_ANON_KEY}`,
    },
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || "Failed to fetch documents");
  }

  return response.json();
}

export async function exportProofs(format: "csv" | "json" = "csv", status?: string) {
  const params = new URLSearchParams();
  params.append("format", format);
  if (status) params.append("status", status);

  const response = await fetch(`${API_BASE}/export-proofs?${params.toString()}`, {
    method: "GET",
    headers: {
      Authorization: `Bearer ${SUPABASE_ANON_KEY}`,
    },
  });

  if (!response.ok) {
    throw new Error("Failed to export proofs");
  }

  return response.blob();
}
