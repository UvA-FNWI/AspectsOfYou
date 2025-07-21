import React from "react";

export default function OpenQuestion({ value, onChange, onDelete }) {
  return (
    <div className="relative group border border-[#CF202E] rounded-lg p-4 bg-[#FFF5F5]">
      <button
        onClick={onDelete}
        className="absolute -left-8 top-4 opacity-0 group-hover:opacity-100 transition-opacity"
        title="Delete question"
      >
        <svg
          xmlns="http://www.w3.org/2000/svg"
          className="h-6 w-6 text-[#CF202E] hover:text-[#840022]"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          strokeWidth={2}
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M19 7L5 7M9 7V4h6v3m2 0v12a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V7h14z"
          />
        </svg>
      </button>

      <div
        contentEditable
        suppressContentEditableWarning
        onBlur={(e) => onChange(e.currentTarget.innerText)}
        className="text-xl font-semibold mb-2 cursor-text"
      >
        {value}
      </div>

      <textarea
        disabled
        placeholder="User will type here"
        className="w-full mt-2 p-2 border rounded text-gray-600 bg-gray-100"
        rows={3}
      />
    </div>
  );
}
