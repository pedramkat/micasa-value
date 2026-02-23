"use client";

import Form from "next/form";
import { createConfiguration } from "./actions";
import { useState } from "react";

export default function NewConfiguration() {
  const [propertiesJson, setPropertiesJson] = useState("");

  return (
    <div className="max-w-4xl mx-auto p-8">
      <h1 className="text-3xl font-bold mb-6">Create New Configuration</h1>
      <Form action={createConfiguration} className="space-y-6 bg-white p-8 rounded-lg shadow-md text-gray-900">
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
            name="title"
            required
            placeholder="Enter configuration title..."
            className="w-full px-4 py-2 border rounded-lg"
          />
        </div>

        <div>
          <label htmlFor="description" className="block text-lg font-medium mb-2">
            Description
          </label>
          <textarea
            id="description"
            name="description"
            placeholder="Enter configuration description..."
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
              name="fixValue"
              step="1"
              placeholder="0.00"
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
              name="variableValue"
              step="0.1"
              placeholder="0.00"
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
            name="properties"
            value={propertiesJson}
            onChange={(e) => setPropertiesJson(e.target.value)}
            placeholder='{"key": "value"}'
            rows={6}
            className="w-full px-4 py-2 border rounded-lg font-mono text-sm"
          />
          <p className="text-xs text-gray-500 mt-1">Enter valid JSON or leave empty</p>
        </div>

        <div className="flex space-x-6">
          <div className="flex items-center">
            <input
              type="checkbox"
              id="propertyValuation"
              name="propertyValuation"
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
              name="houseValuation"
              className="w-5 h-5 text-purple-600 rounded"
            />
            <label htmlFor="houseValuation" className="ml-2 text-lg font-medium">
              House Valuation
            </label>
          </div>
        </div>

        <button
          type="submit"
          className="w-full bg-purple-500 text-white py-3 rounded-lg hover:bg-purple-600 transition font-semibold"
        >
          Create Configuration
        </button>
      </Form>
    </div>
  );
}
