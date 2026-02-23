"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

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

export default function EditConfiguration({ params }: { params: Promise<{ id: string }> }) {
  const router = useRouter();
  const [configId, setConfigId] = useState<string | null>(null);
  const [config, setConfig] = useState<Configuration | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [fixValue, setFixValue] = useState("");
  const [variableValue, setVariableValue] = useState("");
  const [properties, setProperties] = useState("");
  const [propertyValuation, setPropertyValuation] = useState(false);
  const [houseValuation, setHouseValuation] = useState(false);

  useEffect(() => {
    params.then(({ id }) => {
      setConfigId(id);
      fetchConfiguration(id);
    });
  }, []);

  async function fetchConfiguration(id: string) {
    setIsLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/configurations/${id}`);
      if (!res.ok) throw new Error("Failed to fetch configuration");
      const data = await res.json();
      setConfig(data);
      setTitle(data.title);
      setDescription(data.description || "");
      setFixValue(data.fixValue?.toString() || "");
      setVariableValue(data.variableValue?.toString() || "");
      setProperties(data.properties ? JSON.stringify(data.properties, null, 2) : "");
      setPropertyValuation(data.propertyValuation);
      setHouseValuation(data.houseValuation);
    } catch (err) {
      setError(err instanceof Error ? err.message : "An error occurred");
    } finally {
      setIsLoading(false);
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!configId) return;

    setIsSaving(true);
    setError(null);

    try {
      let parsedProperties = null;
      if (properties.trim()) {
        parsedProperties = JSON.parse(properties);
      }

      const res = await fetch(`/api/configurations/${configId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title,
          description,
          fixValue: fixValue ? parseFloat(fixValue) : null,
          variableValue: variableValue ? parseFloat(variableValue) : null,
          properties: parsedProperties,
          propertyValuation,
          houseValuation,
        }),
      });

      if (!res.ok) throw new Error("Failed to update configuration");
      router.push("/configurations");
    } catch (err) {
      setError(err instanceof Error ? err.message : "An error occurred");
    } finally {
      setIsSaving(false);
    }
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="w-10 h-10 border-4 border-purple-500 border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  if (error && !config) {
    return (
      <div className="max-w-4xl mx-auto p-8">
        <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded">
          {error}
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto p-8 text-gray-900">
      <h1 className="text-3xl font-bold mb-6">Edit Configuration</h1>
      <form onSubmit={handleSubmit} className="space-y-6 bg-white p-8 rounded-lg shadow-md">
        {error && (
          <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded">
            {error}
          </div>
        )}

        <div>
          <label htmlFor="title" className="flex text-lg font-medium mb-2 items-center">
            Title
            <span className="ml-2 px-2 py-1 text-xs font-semibold text-white bg-gray-500 rounded-lg">
              Required
            </span>
          </label>
          <input
            type="text"
            id="title"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            required
            className="w-full px-4 py-2 border rounded-lg"
          />
        </div>

        <div>
          <label htmlFor="description" className="block text-lg font-medium mb-2">
            Description
          </label>
          <textarea
            id="description"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            rows={3}
            className="w-full px-4 py-2 border rounded-lg"
          />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label htmlFor="fixValue" className="block text-lg font-medium mb-2">
              Fix Value (%)
            </label>
            <input
              type="number"
              id="fixValue"
              value={fixValue}
              onChange={(e) => setFixValue(e.target.value)}
              step="0.01"
              className="w-full px-4 py-2 border rounded-lg"
            />
          </div>

          <div>
            <label htmlFor="variableValue" className="block text-lg font-medium mb-2">
              Variable Value (%)
            </label>
            <input
              type="number"
              id="variableValue"
              value={variableValue}
              onChange={(e) => setVariableValue(e.target.value)}
              step="0.01"
              className="w-full px-4 py-2 border rounded-lg"
            />
          </div>
        </div>

        <div>
          <label htmlFor="properties" className="block text-lg font-medium mb-2">
            Properties (JSON)
          </label>
          <textarea
            id="properties"
            value={properties}
            onChange={(e) => setProperties(e.target.value)}
            rows={6}
            className="w-full px-4 py-2 border rounded-lg font-mono text-sm"
          />
        </div>

        <div className="flex space-x-6">
          <div className="flex items-center">
            <input
              type="checkbox"
              id="propertyValuation"
              checked={propertyValuation}
              onChange={(e) => setPropertyValuation(e.target.checked)}
              className="w-5 h-5 text-purple-600 rounded"
            />
            <label htmlFor="propertyValuation" className="ml-2 text-lg font-medium">
              Property Valuation
            </label>
          </div>

          <div className="flex items-center">
            <input
              type="checkbox"
              id="houseValuation"
              checked={houseValuation}
              onChange={(e) => setHouseValuation(e.target.checked)}
              className="w-5 h-5 text-purple-600 rounded"
            />
            <label htmlFor="houseValuation" className="ml-2 text-lg font-medium">
              House Valuation
            </label>
          </div>
        </div>

        <button
          type="submit"
          disabled={isSaving}
          className="w-full bg-purple-500 text-white py-3 rounded-lg hover:bg-purple-600 transition font-semibold disabled:bg-gray-400"
        >
          {isSaving ? "Saving..." : "Update Configuration"}
        </button>
      </form>
    </div>
  );
}
