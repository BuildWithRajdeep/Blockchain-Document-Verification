import { useState, useRef } from "react";
import { Upload, Loader, CheckCircle, AlertCircle, X } from "lucide-react";
import { computeSHA256, formatFileSize } from "../utils/crypto";
import { registerDocument } from "../utils/api";

interface DocumentUploadProps {
  onSuccess: (documentId: string) => void;
}

export function DocumentUpload({ onSuccess }: DocumentUploadProps) {
  const [file, setFile] = useState<File | null>(null);
  const [tags, setTags] = useState<string>("");
  const [loading, setLoading] = useState(false);
  const [hash, setHash] = useState<string>("");
  const [status, setStatus] = useState<"idle" | "computing" | "registering" | "success" | "error">(
    "idle"
  );
  const [errorMessage, setErrorMessage] = useState("");
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileSelect = async (selectedFile: File | null) => {
    if (!selectedFile) return;

    if (selectedFile.size > 104857600) {
      setErrorMessage("File size exceeds 100MB limit");
      setStatus("error");
      return;
    }

    setFile(selectedFile);
    setHash("");
    setStatus("computing");
    setErrorMessage("");

    try {
      const computedHash = await computeSHA256(selectedFile);
      setHash(computedHash);
    } catch (error) {
      setErrorMessage("Failed to compute file hash");
      setStatus("error");
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

  const handleRegister = async () => {
    if (!file || !hash) return;

    setLoading(true);
    setStatus("registering");
    setErrorMessage("");

    try {
      const tagList = tags
        .split(",")
        .map((t) => t.trim())
        .filter((t) => t.length > 0);

      const result = await registerDocument({
        filename: file.name,
        file_hash: hash,
        file_size: file.size,
        mime_type: file.type || "application/octet-stream",
        uploader_address: `0x${"0".repeat(40)}`,
        tags: tagList,
      });

      setStatus("success");
      setTimeout(() => {
        onSuccess(result.document_id);
        resetForm();
      }, 2000);
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : "Failed to register document");
      setStatus("error");
      setLoading(false);
    }
  };

  const resetForm = () => {
    setFile(null);
    setHash("");
    setTags("");
    setStatus("idle");
    setErrorMessage("");
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  return (
    <div className="w-full max-w-2xl">
      <div className="bg-white rounded-lg shadow-lg border border-gray-200 p-8">
        <h2 className="text-2xl font-bold text-gray-900 mb-6">Register Document</h2>

        {status === "success" ? (
          <div className="space-y-4">
            <div className="flex items-center justify-center p-8 bg-green-50 rounded-lg border-2 border-green-200">
              <div className="text-center">
                <CheckCircle className="w-16 h-16 text-green-600 mx-auto mb-4" />
                <p className="text-lg font-semibold text-green-900">Document registered successfully!</p>
                <p className="text-sm text-green-700 mt-2">Awaiting blockchain confirmation...</p>
              </div>
            </div>
          </div>
        ) : (
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
                {file ? "File selected" : "Drag and drop your file"}
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

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Tags (optional, comma-separated)
              </label>
              <input
                type="text"
                value={tags}
                onChange={(e) => setTags(e.target.value)}
                placeholder="e.g. contract, legal, signed"
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition"
                disabled={loading}
              />
            </div>

            {errorMessage && (
              <div className="flex items-center gap-3 bg-red-50 border border-red-200 rounded-lg p-4">
                <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0" />
                <p className="text-sm text-red-700">{errorMessage}</p>
              </div>
            )}

            <div className="flex gap-3">
              {file && (
                <button
                  onClick={resetForm}
                  disabled={loading}
                  className="flex items-center gap-2 px-4 py-2 text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-lg font-medium transition disabled:opacity-50"
                >
                  <X className="w-4 h-4" />
                  Clear
                </button>
              )}
              <button
                onClick={handleRegister}
                disabled={!file || !hash || loading}
                className={`flex-1 flex items-center justify-center gap-2 px-6 py-3 rounded-lg font-semibold transition ${
                  !file || !hash || loading
                    ? "bg-gray-300 text-gray-700 cursor-not-allowed"
                    : "bg-blue-600 text-white hover:bg-blue-700 active:bg-blue-800"
                }`}
              >
                {status === "computing" ? (
                  <>
                    <Loader className="w-4 h-4 animate-spin" />
                    Computing Hash...
                  </>
                ) : status === "registering" ? (
                  <>
                    <Loader className="w-4 h-4 animate-spin" />
                    Registering...
                  </>
                ) : (
                  <>
                    <Upload className="w-4 h-4" />
                    Register Document
                  </>
                )}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
