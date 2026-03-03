'use client';

import { useState, useEffect } from 'react';

/*
Models one option for multi- or single- choice questions
*/
export default function Answer({ 
  answer, 
  isSelected, 
  onSelect,
  extraTextValue = '',
  selectionType = 'radio'
}) {
  const [extraText, setExtraText] = useState(extraTextValue);

  useEffect(() => {
    setExtraText(extraTextValue);
  }, [extraTextValue]);

  const handleClick = () => {
    onSelect(answer.answerId, extraText);
  };

  const handleExtraTextChange = (e) => {
    const newValue = e.target.value;
    setExtraText(newValue);
    if (isSelected) {
      onSelect(answer.answerId, newValue);
    }
  };

  return (
    <div 
      className={`p-4 border rounded-md mb-2 cursor-pointer transition-colors 
        ${isSelected ? 'background-color-primary-lighter border-color-primary-main' : 'hover:bg-gray-50 border-gray-300'}`}
      onClick={handleClick}
    >
      <div className="flex items-center">
        {selectionType === 'radio' ? (
          // Radio button style for single selection
          <div className={`w-5 h-5 mr-3 rounded-full border flex items-center justify-center ${isSelected ? 'background-color-primary-main border-color-primary-main' : 'border-gray-400'}`}>
            {isSelected && (
              <div className="w-full h-full flex items-center justify-center text-white">
                <img src="/icons/checkmark.svg" alt="" className="h-3 w-3" />
              </div>
            )}
          </div>
        ) : (
          // Checkbox style for multiple selection
          <div className={`w-5 h-5 mr-3 rounded border flex items-center justify-center ${isSelected ? 'background-color-primary-main border-color-primary-main' : 'border-gray-400'}`}>
            {isSelected && (
              <div className="w-full h-full flex items-center justify-center text-white">
                <img src="/icons/checkmark.svg" alt="" className="h-3 w-3" />
              </div>
            )}
          </div>
        )}
        
        <div className="flex-1">
          <p>{answer.answerText}</p>
          
          {answer.extraText && (
            <div className="mt-3">
              <textarea
                className="w-full p-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="Please provide additional information..."
                value={extraText}
                onChange={handleExtraTextChange}
                onClick={(e) => e.stopPropagation()}
                rows={3}
              />
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
