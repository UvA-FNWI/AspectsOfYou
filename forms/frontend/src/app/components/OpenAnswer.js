import { useState, useEffect } from 'react';

/*
Open-ended individual questions get put here
*/

export default function OpenAnswer({
  answer,
  extraTextValue = '',
  onTextChange
}) {
  const [extraText, setExtraText] = useState(extraTextValue);

  useEffect(() => {
    setExtraText(extraTextValue);
  }, [extraTextValue]);

  const handleExtraTextChange = (e) => {
    const newValue = e.target.value;
    setExtraText(newValue);
    onTextChange(newValue);
  };

  return (
    <div className="p-4 border rounded-md mb-2 cursor-text transition-colors hover:bg-gray-50 border-gray-300">
      <div className="flex items-center">
        <div className="flex-1">
          <p className="font-semibold mb-2">{answer.answerText}</p>
          <textarea
            className="w-full p-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            placeholder="Please type your answer here..."
            value={extraText}
            onChange={handleExtraTextChange}
            rows={3}
          />
        </div>
      </div>
    </div>
  );
}