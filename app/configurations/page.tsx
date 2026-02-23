"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

interface Configuration {
  id: string;
  title: string;
  description?: string;
  fixValue?: number;
  variableValue?: number;
  properties?: any;
  propertyValuation: boolean;
  houseValuation: boolean;
  createdAt: string;
  updatedAt: string;
}

export const dynamic = "force-dynamic";

export default function ConfigurationsPage() {
  const [configurations, setConfigurations] = useState<Configuration[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchConfigurations();
  }, []);

  async function fetchConfigurations() {
    setIsLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/configurations");
      if (!res.ok) throw new Error("Failed to fetch configurations");
      const data = await res.json();
      setConfigurations(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : "An error occurred");
    } finally {
      setIsLoading(false);
    }
  }

  async function deleteConfiguration(id: string) {
    if (!confirm("Are you sure you want to delete this configuration?")) return;

    try {
      const res = await fetch(`/api/configurations/${id}`, {
        method: "DELETE",
      });
      if (!res.ok) throw new Error("Failed to delete configuration");
      fetchConfigurations();
    } catch (err) {
      alert(err instanceof Error ? err.message : "Failed to delete");
    }
  }

  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <div className="max-w-6xl mx-auto">
        <div className="flex justify-between items-center mb-8">
          <h1 className="text-4xl font-bold text-gray-900">Configurations</h1>
          <Link
            href="/configurations/new"
            className="bg-purple-500 text-white px-6 py-3 rounded-lg hover:bg-purple-600 transition"
          >
            New Configuration
          </Link>
        </div>

        {isLoading ? (
          <div className="flex items-center justify-center space-x-2 min-h-[200px]">
            <div className="w-6 h-6 border-4 border-purple-500 border-t-transparent rounded-full animate-spin"></div>
            <p className="text-gray-600">Loading...</p>
          </div>
        ) : error ? (
          <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded">
            {error}
          </div>
        ) : configurations.length === 0 ? (
          <p className="text-gray-600 text-center py-8">No configurations available.</p>
        ) : (
          <div className="grid gap-6">
            {configurations.map((config) => (
              <div key={config.id} className="bg-white shadow-md rounded-lg p-6">
                <div className="flex justify-between items-start">
                  <div className="flex-1">
                    <Link href={`/configurations/${config.id}`}>
                      <h2 className="text-2xl font-semibold text-gray-900 hover:text-purple-600 cursor-pointer">
                        {config.title}
                      </h2>
                    </Link>
                    {config.description && (
                      <p className="text-gray-600 mt-2">{config.description}</p>
                    )}
                    <div className="mt-4 grid grid-cols-2 gap-4 text-sm text-gray-900">
                      {config.fixValue && (
                        <div>
                          <span className="font-medium">Fix Value:</span> %{config.fixValue}
                        </div>
                      )}
                      {config.variableValue && (
                        <div>
                          <span className="font-medium">Variable Value:</span> %{config.variableValue}
                        </div>
                      )}
                      <div>
                        <span className="font-medium">Property Valuation:</span>{" "}
                        {config.propertyValuation ? "✅ Yes" : "❌ No"}
                      </div>
                      <div>
                        <span className="font-medium">House Valuation:</span>{" "}
                        {config.houseValuation ? "✅ Yes" : "❌ No"}
                      </div>
                    </div>
                    <p className="text-xs text-gray-400 mt-4">
                      Created: {new Date(config.createdAt).toLocaleDateString()}
                    </p>
                  </div>
                  <div className="flex space-x-2 ml-4">
                    <Link
                      href={`/configurations/${config.id}`}
                      className="bg-blue-500 text-white px-4 py-2 rounded hover:bg-blue-600 transition text-sm"
                    >
                      Edit
                    </Link>
                    <button
                      onClick={() => deleteConfiguration(config.id)}
                      className="bg-red-500 text-white px-4 py-2 rounded hover:bg-red-600 transition text-sm"
                    >
                      Delete
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
