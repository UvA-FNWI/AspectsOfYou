'use client';

import { useState, useRef, useEffect } from 'react';
import Question from './Question';

export default function FillSurvey({ survey, onComplete, uploadAnswerToDatabase }) {
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [answers, setAnswers] = useState([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  const questionRef = useRef(null);

  const currentQuestion = survey.questions[currentQuestionIndex];
  
  const totalQuestions = survey.questions.length;
  
  const isLastQuestion = currentQuestionIndex === totalQuestions - 1;

  const handleNext = async () => {
    const selectedAnswer = questionRef.current?.getSelectedAnswer();
    if (!selectedAnswer) {e
      return;
    }
    if (isSubmitting) {
      return;
    }
    setIsSubmitting(true);

    try {
      const updatedAnswers = [...answers];
      updatedAnswers[currentQuestionIndex] = {
        questionId: currentQuestion.questionId,
        selectedAnswer
      };
      setAnswers(updatedAnswers);

      if (uploadAnswerToDatabase) {
        await uploadAnswerToDatabase(currentQuestion.questionId, selectedAnswer);
      } else {
        console.warn('No uploadAnswerToDatabase function provided');
      }
      if (isLastQuestion) {
        onComplete && onComplete(updatedAnswers);
      } else {
        setCurrentQuestionIndex(prevIndex => prevIndex + 1);
      }
    } catch (error) {
      console.error('Error submitting answer:', error);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="flex flex-col min-h-[500px] justify-between">
      <div className="flex-1 mb-8">
        <Question 
          ref={questionRef}
          question={currentQuestion} 
          key={currentQuestion.questionId}
        />
      </div>
      
      <div className="sticky bottom-0 bg-white pt-4 pb-6">
        <div className="flex justify-center mb-6">
          {survey.questions.map((_, index) => (
            <div 
              key={index}
              className={`w-3 h-3 mx-1 rounded-full transition-colors ${
                index === currentQuestionIndex 
                  ? 'background-color-primary-dark'
                  : index < currentQuestionIndex 
                    ? 'background-color-primary-main'
                    : 'background-color-primary-light'
              }`}
            />
          ))}
        </div>

        {/* Next Button */}
        <button
          className="w-full py-3 px-4 background-color-primary-main text-white text-white rounded-md font-medium text-lg hover:background-color-primary-dark transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          onClick={handleNext}
          disabled={isSubmitting}
        >
          {isSubmitting ? 'Submitting...' : isLastQuestion ? 'Complete Survey' : 'Next Question'}
        </button>
      </div>
    </div>
  );
}
