"use client";

import Form from "next/form";
import { createHouse } from "./actions";

export default function NewHouse() {
  return (
    <div className="max-w-2xl mx-auto p-4">
      <h1 className="text-2xl font-bold mb-6">Create New House</h1>
      <Form action={createHouse} className="space-y-6">
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
            placeholder="Enter house title ..."
            className="w-full px-4 py-2 border rounded-lg"
          />
        </div>
        <div>
          <label htmlFor="description" className="block text-lg font-medium mb-2">Description</label>
          <textarea
            id="description"
            name="description"
            placeholder="Write house description here ..."
            rows={6}
            className="w-full px-4 py-2 border rounded-lg"
          />
        </div>
        <button type="submit" className="w-full bg-blue-500 text-white py-3 rounded-lg hover:bg-blue-600">
          Create House
        </button>
      </Form>
    </div>
  );
}
