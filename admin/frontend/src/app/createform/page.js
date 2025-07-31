'use client';

import React, { useState } from "react";
import { v4 as uuidv4 } from "uuid";
import OpenQuestion from "../components/OpenQuestion";
import SingleChoiceQuestion from "../components/SingleChoiceQuestion";
import MultiChoiceQuestion from "../components/MultiChoiceQuestion";

export default function CeateForms() {
  const [questions, setQuestions] = useState([]);
  const [draggedItem, setDraggedItem] = useState(null);
  const [dragOverItem, setDragOverItem] = useState(null);

  const [formTitle, setFormTitle] = useState(
      "Double-click to edit form title"
    );

  const addQuestion = (type) => {
    setQuestions((prev) => [
      ...prev,
      {
        id: uuidv4(),
        type,
        text: 'This is a question',
        answers: type === 'single' || type === 'multi' ? [
          { text: 'This is an answer', extraText: false }
        ] : type === 'open' ? [
          { text: 'This is an open-ended answer', extraText: true }
        ] : undefined
      },
    ]);
  };

  const deleteQuestion = (id) => {
    setQuestions((prev) => prev.filter((q) => q.id !== id));
  };

  const handleQuestionChange = (id, changes) => {
    setQuestions((prev) =>
      prev.map((q) =>
        q.id === id ? { ...q, ...changes } : q
      )
    );
  };

  const handleAnswersChange = (id, answers) => {
    setQuestions((prev) =>
      prev.map((q) =>
        q.id === id ? { ...q, answers } : q
      )
    );
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

    const newQuestions = [...questions];
    const draggedQuestion = newQuestions[draggedItem];

    newQuestions.splice(draggedItem, 1);
    newQuestions.splice(dropIndex, 0, draggedQuestion);

    setQuestions(newQuestions);
    setDraggedItem(null);
    setDragOverItem(null);
  };

  const DragHandle = () => (
    <div className="cursor-grab active:cursor-grabbing p-2 mr-4 flex items-center">
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

  const questionTypeMap = {
    'single': 0,
    'multi': 1,
    'open': 2
  };

  const submitSurvey = async () => {
    const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3002';
    const surveyData = {
      title: formTitle,
      questions: questions.map(q => ({
        questionText: q.text || '',
        questionType: questionTypeMap[q.type],
        answers: q.type === 'open' ? [
          { answerText: '', extraText: true }
        ] : q.answers ? q.answers.map(a => ({
          answerText: a.text || '',
          extraText: !!a.extraText
        })) : []
      }))
    };
    try {
      const response = await fetch(`${apiUrl}/api/surveys`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(surveyData),
      });
      if (!response.ok) {
        throw new Error('Failed to create survey');
      }
      alert('Survey created successfully!');
    } catch (error) {
      alert('Error creating survey: ' + error.message);
    }
  }

  return (
    <div className="min-h-screen bg-white text-color-dark flex justify-center">
      <div className="w-full max-w-3xl flex flex-col items-center p-6 space-y-6">
        <div
          contentEditable
          suppressContentEditableWarning
          onBlur={(e) => setFormTitle(e.currentTarget.innerText)}
          className="text-xl font-semibold cursor-text"
        >
          {formTitle}
        </div>
        <div className="flex gap-4 mb-8">
          <button
            onClick={() => addQuestion("single")}
            className=" questionbutton
              px-8 py-4
              rounded-full 
              background-color-primary-main 
              text-white 
              transition-colors duration-200 
              hover:background-color-primary-dark
            "
          >
            + Single Choice
          </button>
          <button
            onClick={() => addQuestion("multi")}
            className=" questionbutton
              px-8 py-4
              rounded-full 
              background-color-primary-main 
              text-white 
              transition-colors duration-200 
              hover:background-color-primary-dark
            "
          >
            + Multi-Choice
          </button>
          <button
            onClick={() => addQuestion("open")}
            className=" questionbutton
              px-8 py-4
              rounded-full 
              background-color-primary-main 
              text-white 
              transition-colors duration-200 
              hover:background-color-primary-dark
            "
          > Open-Ended</button>
          <button
            onClick={submitSurvey}
            className="questionbutton
              px-8 py-4
              rounded-full 
              background-color-primary-main 
              text-white 
              transition-colors duration-200 
              hover:background-color-primary-dark"
          >
            Add Survey
          </button>
        </div>
        <div className="space-y-8">
          {questions.map((q, index) => {
            const isHovered = dragOverItem === index && draggedItem !== null && draggedItem !== index;
            return (
              <div
                key={q.id}
                className="relative flex items-start"
                style={isHovered ? {
                  backgroundColor: 'rgba(235, 179, 193, 0.3)',
                  transition: 'background-color 0.2s ease',
                  borderRadius: '16px',
                  padding: '8px'
                } : {}}
                draggable
                onDragStart={(e) => handleDragStart(e, index)}
                onDragOver={(e) => handleDragOver(e, index)}
                onDragLeave={handleDragLeave}
                onDrop={(e) => handleDrop(e, index)}
              >
                <DragHandle />
                <div className="flex-1">
                  {(() => {
                  switch (q.type) {
                    case "open":
                      return (
                        <OpenQuestion
                          onDelete={() => deleteQuestion(q.id)}
                          value={q.text || ''}
                          onChange={text => handleQuestionChange(q.id, { text })}
                        />
                      );
                    case "single":
                      return (
                        <SingleChoiceQuestion
                          onDelete={() => deleteQuestion(q.id)}
                          value={q.text || ''}
                          onChange={text => handleQuestionChange(q.id, { text })}
                          answers={q.answers || []}
                          onAnswersChange={answers => handleAnswersChange(q.id, answers)}
                        />
                      );
                    case "multi":
                      return (
                        <MultiChoiceQuestion
                          onDelete={() => deleteQuestion(q.id)}
                          value={q.text || ''}
                          onChange={text => handleQuestionChange(q.id, { text })}
                          answers={q.answers || []}
                          onAnswersChange={answers => handleAnswersChange(q.id, answers)}
                        />
                      );
                    default:
                      return null;
                  }
                })()}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
