/*
  # Blockchain Document Verification System

  1. New Tables
    - `documents` - Main document metadata
      - `id` (uuid, primary key)
      - `filename` (text)
      - `file_hash` (text, sha256 hex)
      - `file_size` (integer, bytes)
      - `mime_type` (text)
      - `uploader_address` (text, eth address)
      - `tags` (text array)
      - `status` (text: pending/confirmed/not_found)
      - `created_at` (timestamp)
      - `updated_at` (timestamp)
    
    - `blockchain_records` - On-chain transaction data
      - `id` (uuid, primary key)
      - `document_id` (uuid, foreign key)
      - `document_hash` (text, sha256)
      - `transaction_hash` (text)
      - `block_number` (integer)
      - `owner_address` (text, eth address)
      - `block_timestamp` (integer, unix)
      - `status` (text: pending/confirmed)
      - `created_at` (timestamp)
    
    - `verification_history` - Verification audit trail
      - `id` (uuid, primary key)
      - `document_id` (uuid, foreign key)
      - `verified_hash` (text, sha256)
      - `status` (text: verified/tampered/not_found)
      - `verification_timestamp` (timestamp)
      - `verifier_address` (text, optional)
      - `details` (jsonb, error messages etc)

  2. Security
    - Enable RLS on all tables
    - Public read for verified records
    - Authenticated users can create/update own records

  3. Indexes
    - Index on file_hash for quick lookups
    - Index on blockchain_records.document_hash
    - Index on blockchain_records.transaction_hash
*/

CREATE TABLE IF NOT EXISTS documents (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  filename text NOT NULL,
  file_hash text UNIQUE NOT NULL,
  file_size integer NOT NULL,
  mime_type text NOT NULL,
  uploader_address text NOT NULL,
  tags text[] DEFAULT '{}',
  status text DEFAULT 'pending' CHECK (status IN ('pending', 'confirmed', 'not_found')),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS blockchain_records (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  document_id uuid REFERENCES documents(id) ON DELETE CASCADE,
  document_hash text NOT NULL,
  transaction_hash text UNIQUE,
  block_number integer,
  owner_address text NOT NULL,
  block_timestamp integer,
  status text DEFAULT 'pending' CHECK (status IN ('pending', 'confirmed')),
  created_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS verification_history (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  document_id uuid REFERENCES documents(id) ON DELETE CASCADE,
  verified_hash text NOT NULL,
  status text NOT NULL CHECK (status IN ('verified', 'tampered', 'not_found')),
  verification_timestamp timestamptz DEFAULT now(),
  verifier_address text,
  details jsonb DEFAULT '{}'::jsonb
);

CREATE INDEX IF NOT EXISTS idx_documents_file_hash ON documents(file_hash);
CREATE INDEX IF NOT EXISTS idx_documents_created_at ON documents(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_blockchain_records_document_hash ON blockchain_records(document_hash);
CREATE INDEX IF NOT EXISTS idx_blockchain_records_transaction_hash ON blockchain_records(transaction_hash);
CREATE INDEX IF NOT EXISTS idx_blockchain_records_created_at ON blockchain_records(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_verification_history_document_id ON verification_history(document_id);

ALTER TABLE documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE blockchain_records ENABLE ROW LEVEL SECURITY;
ALTER TABLE verification_history ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can read confirmed documents"
  ON documents FOR SELECT
  USING (status = 'confirmed');

CREATE POLICY "Authenticated users can create documents"
  ON documents FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "Users can read their own documents"
  ON documents FOR SELECT
  TO authenticated
  USING (auth.uid()::text = uploader_address OR status = 'confirmed');

CREATE POLICY "Anyone can read blockchain records"
  ON blockchain_records FOR SELECT
  USING (true);

CREATE POLICY "Authenticated users can create blockchain records"
  ON blockchain_records FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "Anyone can read verification history"
  ON verification_history FOR SELECT
  USING (true);

CREATE POLICY "Authenticated users can insert verification history"
  ON verification_history FOR INSERT
  TO authenticated
  WITH CHECK (true);
