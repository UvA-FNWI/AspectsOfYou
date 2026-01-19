'use client';

/*
Models one question with different answers (thus refers to openanswer or answer)
*/

import { useState, forwardRef, useImperativeHandle } from 'react';
import Answer from './Answer';
import OpenAnswer from './OpenAnswer';

const Question = forwardRef(({ question }, ref) => {
  const [selectedAnswerId, setSelectedAnswerId] = useState(null);
  const [selectedAnswerExtraText, setSelectedAnswerExtraText] = useState('');
  
  const [selectedAnswers, setSelectedAnswers] = useState([]);

  useImperativeHandle(ref, () => ({
    getSelectedAnswer: () => {
      if (question.questionType === 0) {
        if (!selectedAnswerId) return null;
        return {
          answerId: selectedAnswerId,
          extraText: selectedAnswerExtraText
        };
      } else if (question.questionType === 3) {
        if (!selectedAnswerId) return null;
        return {
          answerId: selectedAnswerId,
          extraText: ''
        };
      } else if (question.questionType === 1) {
        return selectedAnswers.length > 0 ? selectedAnswers : null;
      } else if (question.questionType === 2) {
        return selectedAnswerExtraText ? { answerId: question.answers[0].answerId, extraText: selectedAnswerExtraText } : null;
      }
    },
    clearSelection: () => {
      setSelectedAnswerId(null);
      setSelectedAnswerExtraText('');
      setSelectedAnswers([]);
    }
  }));

  const handleAnswerSelect = (answerId, extraText = '') => {
    if (question.questionType === 0 || question.questionType === 3) {
      setSelectedAnswerId(answerId);
      setSelectedAnswerExtraText(extraText);
    } else {
      const existingIndex = selectedAnswers.findIndex(ans => ans.answerId === answerId);

      if (existingIndex >= 0) {
        const newSelectedAnswers = [...selectedAnswers];
        if (extraText === '' && newSelectedAnswers[existingIndex].extraText === '') {
          newSelectedAnswers.splice(existingIndex, 1);
        } else {
          newSelectedAnswers[existingIndex] = { ...newSelectedAnswers[existingIndex], extraText };
        }
        setSelectedAnswers(newSelectedAnswers);
      } else {
        setSelectedAnswers([...selectedAnswers, { answerId, extraText }]);
      }
    }
  };

  const isAnswerSelected = (answerId) => {
    if (question.questionType === 0) {
      return selectedAnswerId === answerId;
    } else {
      return selectedAnswers.some(ans => ans.answerId === answerId);
    }
  };

  const getExtraTextForAnswer = (answerId) => {
    if (question.questionType === 0) {
      return selectedAnswerId === answerId ? selectedAnswerExtraText : '';
    } else {
      const answer = selectedAnswers.find(ans => ans.answerId === answerId);
      return answer ? answer.extraText : '';
    }
  };

  return (
    <div className="mb-8">
      <h3 className="text-lg font-semibold mb-3">{question.questionText}</h3>

      <div className="space-y-2">
        {question.questionType === 2 ? (
          console.log(question.answers) ||
          question.answers.map((answer) => (
            console.log(question.answers) ||
            <OpenAnswer
              key={answer.answerId}
              answer={answer}
              extraTextValue={selectedAnswerExtraText}
              onTextChange={(text) => setSelectedAnswerExtraText(text)}
            />
          ))
            ) : question.questionType === 3 ? (
              <div className="flex flex-col gap-2">
                <label className="text-sm text-gray-700">Select a country or region</label>
                <select
                  className="border border-gray-300 rounded px-3 py-2"
                  value={selectedAnswerId || ''}
                  onChange={(e) => handleAnswerSelect(e.target.value)}
                >
                  <option value="" disabled>Select an option</option>
                  {[...(question.answers || [])]
                    .slice()
                    .sort((a, b) => (a.answerText || '').localeCompare(b.answerText || ''))
                    .map((answer) => (
                      <option key={answer.answerId} value={answer.answerId}>
                        {answer.answerText}
                      </option>
                    ))}
                </select>
              </div>
        ) : (
          question.answers.map((answer) => (
            <Answer
              key={answer.answerId}
              answer={answer}
              isSelected={isAnswerSelected(answer.answerId)}
              onSelect={handleAnswerSelect}
              extraTextValue={getExtraTextForAnswer(answer.answerId)}
              selectionType={question.questionType === 0 ? 'radio' : 'checkbox'}
            />
          ))
        )}
      </div>

      {question.questionType === 0 && !selectedAnswerId && (
        <p className="text-sm text-gray-500 mt-2">Please select an answer</p>
      )}
      {question.questionType === 1 && selectedAnswers.length === 0 && (
        <p className="text-sm text-gray-500 mt-2">Please select one or more answers</p>
      )}
      {question.questionType === 2 && selectedAnswerExtraText === '' && (
        <p className="text-sm text-gray-500 mt-2">Please type an answer</p>
      )}
      {question.questionType === 3 && !selectedAnswerId && (
        <p className="text-sm text-gray-500 mt-2">Please pick a location</p>
      )}
    </div>
  );
});

Question.displayName = 'Question';

export default Question;
