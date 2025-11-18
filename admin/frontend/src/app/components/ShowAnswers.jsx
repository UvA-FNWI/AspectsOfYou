import React, { useState } from 'react';
import ShowCircle from './ShowCircle';
import ShowBarplot from './ShowBarplot';
import ShowWordCloudQuestion from './ShowWordCloudQuestion';

/*
Main component for one question: loads the questions and shows the answers
*/

export default function ShowAnswers({ survey }) {
  const style = {
    justifyContent: 'space-evenly',
    display: 'flex'
  };

  const [viewType, setViewType] = useState('circle'); // As which type the question should be displayed
  const [questions, setQuestions] = useState(survey);
  const [draggedItem, setDraggedItem] = useState(null); // Two states to allow the components to be dragged and swapped
  const [dragOverItem, setDragOverItem] = useState(null);

  const handleViewChange = (questionId, type) => {
    setViewType((prev) => ({ ...prev, [questionId]: type }));
  };

  const handleDragStart = (e, index) => {
    setDraggedItem(index);
    e.dataTransfer.effectAllowed = 'move';
  };

  const handleDragOver = (e, index) => {
    e.preventDefault();
    setDragOverItem(index);
  };

  const handleDragLeave = () => {
    setDragOverItem(null);
  };

  const handleDrop = (e, dropIndex) => {
    e.preventDefault();

    if (draggedItem === null || draggedItem === dropIndex) {
      setDraggedItem(null);
      setDragOverItem(null);
      return;
    }

    // Swap the two questions
    const newQuestions = [...questions];
    const draggedQuestion = newQuestions[draggedItem];

    newQuestions.splice(draggedItem, 1);

    newQuestions.splice(dropIndex, 0, draggedQuestion);

    setQuestions(newQuestions);
    setDraggedItem(null);
    setDragOverItem(null);
  };

  const DragHandle = () => (
    <div className={`absolute top-2 left-2 cursor-grab active:cursor-grabbing p-4 invisible_select`}>
      <div className="grid grid-cols-2 gap-1 w-4 h-3">
        {[...Array(6)].map((_, i) => (
          <div
            key={i}
            className="w-1 h-1 bg-gray-400 rounded-full"
          />
        ))}
      </div>
    </div>
  );

  return (
    <div className="grid grid-cols-2 gap-x-8 gap-y-4">
      {questions.map((question, index) => { // for each question:
        const currentView = viewType[question.questionId] || 'circle';
        const isHovered = dragOverItem === index && draggedItem !== null && draggedItem !== index;
        return (
          <div
            key={question.questionId}
            className={`rounded-2xl p-4 flex flex-col items-center bg-white relative ${
                      currentView === 'exclude' ? 'invisible_select' : ''
                    }`}
            style={currentView === 'exclude' ? {
              position: 'relative',
              backgroundColor: 'rgba(128, 128, 128, 0.3)',
              border: '2px solid #4a4a4a',
              opacity: 0.7
            } : isHovered ? {
              backgroundColor: 'rgba(235, 179, 193, 0.3)', // Light UvA red overlay
              transition: 'background-color 0.2s ease'
            } : {}}
            draggable={currentView !== 'exclude'}
            onDragStart={(e) => handleDragStart(e, index)}
            onDragOver={(e) => handleDragOver(e, index)}
            onDragLeave={handleDragLeave}
            onDrop={(e) => handleDrop(e, index)}
          >
            {currentView !== 'exclude' && <DragHandle />}
            <select
              onChange={(e) => handleViewChange(question.questionId, e.target.value)}
              value={currentView}
              className="mb-4 border border-gray-300 rounded px-2 py-1 ml-8"
            > {/* All different displayoptions */}
              <option value="circle">Circle</option>
              <option value="barplot">Barplot</option>
              <option value="wordcloud">Word Cloud</option>
              <option value="exclude">Exclude from PDF</option>
            </select>
            {currentView === 'circle' ? (
              <ShowCircle question={question} />
            ) : currentView === 'wordcloud' ? (
              <ShowWordCloudQuestion question={question} />
            ) : (
              <ShowBarplot question={question} />
            )}
          </div>
        );
      })}
    </div>
  );
}
