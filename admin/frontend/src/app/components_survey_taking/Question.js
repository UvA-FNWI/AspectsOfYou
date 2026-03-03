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

  const isGeoQuestion = question.questionType === 3;
  const isGeoMulti = isGeoQuestion && !!question.allowMultipleSelections;
  const isSingleChoice = question.questionType === 0 || (isGeoQuestion && !isGeoMulti);
  const isMultiChoice = question.questionType === 1 || isGeoMulti;

  useImperativeHandle(ref, () => ({
    getSelectedAnswer: () => {
      if (isSingleChoice) {
        if (!selectedAnswerId) return null;
        return {
          answerId: selectedAnswerId,
          extraText: selectedAnswerExtraText
        };
      } else if (isMultiChoice) {
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
    if (isSingleChoice) {
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
    if (isSingleChoice) {
      return selectedAnswerId === answerId;
    } else {
      return selectedAnswers.some(ans => ans.answerId === answerId);
    }
  };

  const getExtraTextForAnswer = (answerId) => {
    if (isSingleChoice) {
      return selectedAnswerId === answerId ? selectedAnswerExtraText : '';
    } else {
      const answer = selectedAnswers.find(ans => ans.answerId === answerId);
      return answer ? answer.extraText : '';
    }
  };

  const sortedGeoAnswers = isGeoQuestion
    ? [...(question.answers || [])]
        .slice()
        .sort((a, b) => (a.answerText || '').localeCompare(b.answerText || ''))
    : (question.answers || []);

  return (
    <div className="mb-8">
      <h3 className="text-lg font-semibold mb-3">{question.questionText}</h3>

      <div className="space-y-2 max-h-[360px] overflow-y-auto pr-1">
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
        ) : isGeoQuestion && isGeoMulti ? (
          sortedGeoAnswers.map((answer) => (
            <Answer
              key={answer.answerId}
              answer={answer}
              isSelected={isAnswerSelected(answer.answerId)}
              onSelect={handleAnswerSelect}
              extraTextValue={getExtraTextForAnswer(answer.answerId)}
              selectionType="checkbox"
            />
          ))
        ) : isGeoQuestion ? (
          <div className="flex flex-col gap-2">
            <label className="text-sm text-gray-700">Select a country or region</label>
            <select
              className="border border-gray-300 rounded px-3 py-2"
              value={selectedAnswerId || ''}
              onChange={(e) => handleAnswerSelect(e.target.value)}
            >
              <option value="" disabled>Select an option</option>
              {sortedGeoAnswers.map((answer) => (
                <option key={answer.answerId} value={answer.answerId}>
                  {answer.answerText}
                </option>
              ))}
            </select>
          </div>
        ) : (
          (question.answers || []).map((answer) => (
            <Answer
              key={answer.answerId}
              answer={answer}
              isSelected={isAnswerSelected(answer.answerId)}
              onSelect={handleAnswerSelect}
              extraTextValue={getExtraTextForAnswer(answer.answerId)}
              selectionType={isSingleChoice ? 'radio' : 'checkbox'}
            />
          ))
        )}
      </div>

      {isSingleChoice && !selectedAnswerId && (
        <p className="text-sm text-gray-500 mt-2">{isGeoQuestion ? 'Please pick a location' : 'Please select an answer'}</p>
      )}
      {isMultiChoice && selectedAnswers.length === 0 && (
        <p className="text-sm text-gray-500 mt-2">{isGeoQuestion ? 'Please pick one or more locations' : 'Please select one or more answers'}</p>
      )}
      {question.questionType === 2 && selectedAnswerExtraText === '' && (
        <p className="text-sm text-gray-500 mt-2">Please type an answer</p>
      )}
    </div>
  );
});

Question.displayName = 'Question';

export default Question;
