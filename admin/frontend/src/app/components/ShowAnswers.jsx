import React, { useState } from 'react';
import ShowCircle from './ShowCircle';
import ShowBarplot from './ShowBarplot';

export default function ShowAnswers({ survey }) {
  const style = {
    justifyContent: 'space-evenly',
    display: 'flex'
  };

  const [viewType, setViewType] = useState('circle');

  const handleViewChange = (questionId, type) => {
    setViewType((prev) => ({ ...prev, [questionId]: type }));
  };

  return (
    <div className="flex justify-evenly" style={style}>
      {survey.map((question) => {
        const currentView = viewType[question.questionId] || 'circle';
        return (
          <div
            key={question.questionId}
            className="rounded-2xl p-4 flex flex-col items-center bg-white"
          >
            <select
              onChange={(e) => handleViewChange(question.questionId, e.target.value)}
              value={currentView}
              className="mb-4 border border-gray-300 rounded px-2 py-1"
            >
              <option value="circle">Circle</option>
              <option value="barplot">Barplot</option>
            </select>
            {currentView === 'circle' ? (
              <ShowCircle question={question} />
            ) : (
              <ShowBarplot question={question} />
            )}
          </div>
        );
      })}
    </div>
  );
}
