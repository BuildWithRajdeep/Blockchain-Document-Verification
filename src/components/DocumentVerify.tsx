import { useState, useRef } from "react";
import { Upload, Loader, CheckCircle, AlertCircle, ExternalLink } from "lucide-react";
import { computeSHA256, formatFileSize, formatHash, formatDate } from "../utils/crypto";
import { verifyDocument } from "../utils/api";

interface VerificationResult {
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
}

export function DocumentVerify() {
  const [file, setFile] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);
  const [hash, setHash] = useState<string>("");
  const [result, setResult] = useState<VerificationResult | null>(null);
  const [error, setError] = useState<string>("");
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileSelect = async (selectedFile: File | null) => {
    if (!selectedFile) return;

    if (selectedFile.size > 104857600) {
      setError("File size exceeds 100MB limit");
      return;
    }

    setFile(selectedFile);
    setHash("");
    setResult(null);
    setError("");

    try {
      const computedHash = await computeSHA256(selectedFile);
      setHash(computedHash);
    } catch (err) {
      setError("Failed to compute file hash");
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    handleFileSelect(selectedFile || null);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    const selectedFile = e.dataTransfer.files?.[0];
    handleFileSelect(selectedFile || null);
  };

  const handleVerify = async () => {
    if (!file || !hash) return;

    setLoading(true);
    setError("");
    setResult(null);

    try {
      const verifyResult = await verifyDocument({
        file_hash: hash,
        verifier_address: `0x${"0".repeat(40)}`,
      });

      setResult(verifyResult);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Verification failed");
    } finally {
      setLoading(false);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "verified":
        return "bg-green-50 border-green-200 text-green-900";
      case "tampered":
        return "bg-red-50 border-red-200 text-red-900";
      case "not_found":
        return "bg-yellow-50 border-yellow-200 text-yellow-900";
      default:
        return "bg-gray-50 border-gray-200 text-gray-900";
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "verified":
        return <CheckCircle className="w-6 h-6 text-green-600" />;
      case "tampered":
        return <AlertCircle className="w-6 h-6 text-red-600" />;
      case "not_found":
        return <AlertCircle className="w-6 h-6 text-yellow-600" />;
      default:
        return null;
    }
  };

  return (
    <div className="w-full max-w-2xl">
      <div className="bg-white rounded-lg shadow-lg border border-gray-200 p-8">
        <h2 className="text-2xl font-bold text-gray-900 mb-6">Verify Document</h2>

        <div className="space-y-6">
          <div
            className={`border-2 border-dashed rounded-lg p-8 text-center cursor-pointer transition ${
              file
                ? "border-blue-500 bg-blue-50"
                : "border-gray-300 bg-gray-50 hover:border-gray-400"
            }`}
            onDragOver={handleDragOver}
            onDrop={handleDrop}
            onClick={() => fileInputRef.current?.click()}
          >
            <input
              ref={fileInputRef}
              type="file"
              onChange={handleFileChange}
              className="hidden"
              disabled={loading}
            />
            <Upload className="w-12 h-12 mx-auto mb-3 text-gray-400" />
            <p className="text-lg font-semibold text-gray-700">
              {file ? "File selected" : "Drag file to verify"}
            </p>
            <p className="text-sm text-gray-600 mt-1">or click to browse</p>
            {file && (
              <div className="mt-4 space-y-2">
                <p className="font-mono text-sm text-gray-700">{file.name}</p>
                <p className="text-xs text-gray-600">{formatFileSize(file.size)}</p>
              </div>
            )}
          </div>

          {hash && (
            <div className="bg-gray-50 rounded-lg p-4 border border-gray-200">
              <p className="text-sm font-semibold text-gray-700 mb-2">SHA-256 Hash</p>
              <p className="font-mono text-xs text-gray-600 break-all">{hash}</p>
            </div>
          )}

          {error && (
            <div className="flex items-center gap-3 bg-red-50 border border-red-200 rounded-lg p-4">
              <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0" />
              <p className="text-sm text-red-700">{error}</p>
            </div>
          )}

          {result && (
            <div className={`border-2 rounded-lg p-6 flex gap-4 ${getStatusColor(result.status)}`}>
              <div className="flex-shrink-0">{getStatusIcon(result.status)}</div>
              <div className="flex-1">
                <p className="font-bold text-lg mb-2 capitalize">{result.status}</p>
                <p className="text-sm mb-4">{result.message}</p>

                {result.document && (
                  <div className="bg-white bg-opacity-50 rounded p-3 mb-4 text-sm space-y-2">
                    <div>
                      <span className="font-semibold">Filename:</span> {result.document.filename}
                    </div>
                    <div>
                      <span className="font-semibold">Size:</span>{" "}
                      {formatFileSize(result.document.file_size)}
                    </div>
                    <div>
                      <span className="font-semibold">Type:</span> {result.document.mime_type}
                    </div>
                  </div>
                )}

                {result.blockchain && (
                  <div className="bg-white bg-opacity-50 rounded p-3 text-sm space-y-2">
                    <div className="font-semibold mb-2">Blockchain Details</div>
                    <div className="flex items-center gap-2">
                      <span className="font-semibold">Transaction:</span>
                      <code className="text-xs bg-black bg-opacity-10 px-2 py-1 rounded font-mono">
                        {formatHash(result.blockchain.transaction_hash)}
                      </code>
                      <ExternalLink className="w-3 h-3 opacity-60" />
                    </div>
                    <div>
                      <span className="font-semibold">Block:</span> #{result.blockchain.block_number}
                    </div>
                    <div>
                      <span className="font-semibold">Owner:</span>
                      <code className="text-xs bg-black bg-opacity-10 px-2 py-1 rounded font-mono ml-1">
                        {formatHash(result.blockchain.owner_address)}
                      </code>
                    </div>
                    <div>
                      <span className="font-semibold">Timestamp:</span>{" "}
                      {formatDate(result.blockchain.block_timestamp)}
                    </div>
                    <div>
                      <span className="font-semibold">Status:</span>
                      <span className="ml-2 inline-block px-2 py-1 bg-blue-600 text-white text-xs rounded font-semibold">
                        {result.blockchain.status}
                      </span>
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}

          <button
            onClick={handleVerify}
            disabled={!file || !hash || loading}
            className={`w-full flex items-center justify-center gap-2 px-6 py-3 rounded-lg font-semibold transition ${
              !file || !hash || loading
                ? "bg-gray-300 text-gray-700 cursor-not-allowed"
                : "bg-blue-600 text-white hover:bg-blue-700 active:bg-blue-800"
            }`}
          >
            {loading ? (
              <>
                <Loader className="w-4 h-4 animate-spin" />
                Verifying...
              </>
            ) : (
              <>
                <Upload className="w-4 h-4" />
                Verify Document
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
