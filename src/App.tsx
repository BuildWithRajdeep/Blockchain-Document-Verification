import { useState } from "react";
import { Shield, FileText, Search } from "lucide-react";
import { DocumentUpload } from "./components/DocumentUpload";
import { DocumentVerify } from "./components/DocumentVerify";
import { DocumentRegistry } from "./components/DocumentRegistry";

function App() {
  const [activeTab, setActiveTab] = useState<"register" | "verify" | "registry">("register");
  const [refreshTrigger, setRefreshTrigger] = useState(0);

  const handleRegisterSuccess = () => {
    setRefreshTrigger((prev) => prev + 1);
    setTimeout(() => {
      setActiveTab("registry");
    }, 2500);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-slate-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <header className="py-12 text-center border-b border-gray-200 mb-12">
          <div className="flex items-center justify-center gap-3 mb-4">
            <Shield className="w-10 h-10 text-blue-600" />
            <h1 className="text-4xl font-bold bg-gradient-to-r from-blue-600 to-slate-900 bg-clip-text text-transparent">
              Document Verification
            </h1>
          </div>
          <p className="text-gray-600 max-w-2xl mx-auto">
            Blockchain-backed verification system. Register documents with cryptographic hashes and verify their integrity anytime.
          </p>
        </header>

        <div className="mb-8">
          <div className="flex flex-wrap gap-2 justify-center">
            {[
              { id: "register", label: "Register", icon: FileText },
              { id: "verify", label: "Verify", icon: Search },
              { id: "registry", label: "Registry", icon: FileText },
            ].map(({ id, label, icon: Icon }) => (
              <button
                key={id}
                onClick={() => setActiveTab(id as "register" | "verify" | "registry")}
                className={`flex items-center gap-2 px-6 py-3 rounded-lg font-semibold transition ${
                  activeTab === id
                    ? "bg-blue-600 text-white shadow-lg"
                    : "bg-white text-gray-700 border border-gray-200 hover:border-blue-300 hover:shadow-md"
                }`}
              >
                <Icon className="w-5 h-5" />
                {label}
              </button>
            ))}
          </div>
        </div>

        <div className="pb-12">
          {activeTab === "register" && <DocumentUpload onSuccess={handleRegisterSuccess} />}
          {activeTab === "verify" && <DocumentVerify />}
          {activeTab === "registry" && <DocumentRegistry refreshTrigger={refreshTrigger} />}
        </div>

        <footer className="border-t border-gray-200 py-8 text-center text-sm text-gray-600">
          <p>
            Built with Supabase, React, and blockchain verification. All hashes computed client-side.
          </p>
        </footer>
      </div>
    </div>
  );
}

export default App;
