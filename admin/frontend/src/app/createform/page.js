'use client';

import React, { useState } from "react";
import { v4 as uuidv4 } from "uuid";
import OpenQuestion from "../components/OpenQuestion";
import SingleChoiceQuestion from "../components/SingleChoiceQuestion";
import MultiChoiceQuestion from "../components/MultiChoiceQuestion";

export default function CeateForms() {
  const [questions, setQuestions] = useState([]);

  const [formTitle, setFormTitle] = useState(
      "Double-click to edit form title"
    );

  const addQuestion = (type) => {
    setQuestions((prev) => [
      ...prev,
      {
        id: uuidv4(),
        type,
        text: '',
        answers: type === 'single' || type === 'multi' ? [
          { text: '', extraText: false }
        ] : type === 'open' ? [
          { text: '', extraText: true }
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
              px-15 py-10
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
              px-15 py-10
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
              px-15 py-10
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
              px-15 py-10
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
          {questions.map((q) => {
            switch (q.type) {
              case "open":
                return (
                  <OpenQuestion
                    key={q.id}
                    onDelete={() => deleteQuestion(q.id)}
                    value={q.text || ''}
                    onChange={text => handleQuestionChange(q.id, { text })}
                  />
                );
              case "single":
                return (
                  <SingleChoiceQuestion
                    key={q.id}
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
                    key={q.id}
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
          })}
        </div>
      </div>
    </div>
  );
}
