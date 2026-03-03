import React from "react";

/*
Creation of one open question
*/

export default function OpenQuestion({ value, onChange, onDelete }) {
  return (
    <div className="relative group border border-[#CF202E] rounded-lg p-4 bg-[#FFF5F5]">
      <button
        onClick={onDelete}
        className="absolute -left-8 top-4 opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer"
        title="Delete question"
      >
        <img src="/icons/trash.svg" alt="Delete" className="h-6 w-6 cursor-pointer" />
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
