import React from "react";

/*
Creation of one multiple choice question
*/

export default function MultiChoiceQuestion({
  value,
  onChange,
  answers,
  onAnswersChange,
  onDelete,
}) {

  const addOption = () => {
    onAnswersChange([...answers, { text: "Option text here", extraText: false }]);
  };

  const updateOptionText = (idx, newText) => {
    const updated = answers.map((a, i) =>
      i === idx ? { ...a, text: newText } : a
    );
    onAnswersChange(updated);
  };

  const toggleExtraText = (idx) => {
    const updated = answers.map((a, i) =>
      i === idx ? { ...a, extraText: !a.extraText } : a
    );
    onAnswersChange(updated);
  };

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

      <div className="flex justify-between items-center mb-2">
        <div
          contentEditable
          suppressContentEditableWarning
          onBlur={(e) => onChange(e.currentTarget.innerText)}
          className="text-xl font-semibold cursor-text"
        >
          {value}
        </div>
        <button
          onClick={addOption}
          className="px-2 py-1 background-color-primary-main text-white rounded hover:background-color-primary-dark"
          title="Add Option"
        >
          + Option
        </button>
      </div>

      <div className="ml-4 space-y-2">
        {answers.map((opt, idx) => (
          <div key={idx} className="flex items-center space-x-2">
            <input
              type="checkbox"
              disabled
              className="h-4 w-4 text-[#CF202E]"
            />
            <div
              contentEditable
              suppressContentEditableWarning
              onBlur={(e) => updateOptionText(idx, e.currentTarget.innerText)}
              className="cursor-text"
            >
              {opt.text}
            </div>
            <label className="flex items-center ml-2">
              <input
                type="checkbox"
                checked={!!opt.extraText}
                onChange={() => toggleExtraText(idx)}
                className="mr-1"
              />
              Extra Text
            </label>
          </div>
        ))}
      </div>
    </div>
  );
}
