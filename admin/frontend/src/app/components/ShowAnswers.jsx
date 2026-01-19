import React, { useState } from 'react';
import ShowCircle from './ShowCircle';
import ShowBarplot from './ShowBarplot';
import ShowWordCloudQuestion from './ShowWordCloudQuestion';
import ShowGeoChart from './ShowGeoChart';

/*
Main component for one question: loads the questions and shows the answers
*/

export default function ShowAnswers({ questions, setQuestions, viewTypes, setViewTypes, readOnly = false, onOpenResponses, colorScheme = 'uva', fillHeight = false }) {
  const [draggedQuestion, setDraggedQuestion] = useState(null);
  const [dragOverQuestion, setDragOverQuestion] = useState(null);
  const [draggedView, setDraggedView] = useState(null);
  const [dragOverView, setDragOverView] = useState(null);
  const [editingTitleId, setEditingTitleId] = useState(null);

  const baseTypeForQuestion = (question) => (question.questionType === 3 ? 'geochart' : 'circle');

  const getViewListForQuestion = (question) => {
    const fromMap = viewTypes?.[question.questionId];
    const list = Array.isArray(fromMap) ? fromMap.filter(Boolean) : [];
    if (list.length > 0) {
      return list.slice(0, 3);
    }
    return [baseTypeForQuestion(question)];
  };

  const updateViewTypesForQuestion = (question, updater) => {
    if (!setViewTypes || readOnly) return;
    setViewTypes((prev) => {
      const prevListRaw = Array.isArray(prev?.[question.questionId]) ? prev[question.questionId] : [];
      const prevList = prevListRaw.length > 0 ? prevListRaw : getViewListForQuestion(question);
      const nextList = typeof updater === 'function' ? updater([...prevList]) : updater;
      return {
        ...prev,
        [question.questionId]: (nextList || []).filter(Boolean).slice(0, 3)
      };
    });
  };

  const handleAddView = (question) => {
    if (readOnly) return;
    updateViewTypesForQuestion(question, (current) => {
      if (current.length >= 3) return current;
      return [...current, baseTypeForQuestion(question)];
    });
  };

  const handleViewChange = (question, viewIndex, type) => {
    if (readOnly) return;
    updateViewTypesForQuestion(question, (current) => {
      const next = [...current];
      next[viewIndex] = type;
      return next;
    });
  };

  const handleRemoveView = (question, viewIndex) => {
    if (readOnly) return;
    updateViewTypesForQuestion(question, (current) => {
      if (current.length <= 1) return current;
      const next = [...current];
      next.splice(viewIndex, 1);
      return next;
    });
  };

  const handleQuestionTitleChange = (questionId, newTitle) => {
    if (readOnly || !setQuestions) return;
    setQuestions((prev) =>
      prev.map((q) =>
        q.questionId === questionId ? { ...q, questionText: newTitle } : q
      )
    );
  };

  const handleAnswerTextChange = (questionId, answerId, newText) => {
    if (readOnly || !setQuestions) return;
    setQuestions((prev) =>
      prev.map((q) =>
        q.questionId === questionId
          ? {
              ...q,
              answers: q.answers.map((a) =>
                a.answerId === answerId ? { ...a, answerText: newText } : a
              )
            }
          : q
      )
    );
  };

  const toggleExcluded = (questionId) => {
    if (readOnly || !setQuestions) return;
    setQuestions((prev) =>
      prev.map((q) =>
        q.questionId === questionId ? { ...q, isExcludedFromView: !q.isExcludedFromView } : q
      )
    );
  };

  const handleQuestionDragStart = (e, index) => {
    setDraggedQuestion(index);
    e.dataTransfer.effectAllowed = 'move';
  };

  const handleQuestionDragOver = (e, index) => {
    e.preventDefault();
    setDragOverQuestion(index);
  };

  const handleQuestionDragLeave = () => {
    setDragOverQuestion(null);
  };

  const handleQuestionDrop = (e, dropIndex) => {
    e.preventDefault();

    if (readOnly || !setQuestions) {
      setDraggedQuestion(null);
      setDragOverQuestion(null);
      return;
    }

    if (draggedQuestion === null || draggedQuestion === dropIndex) {
      setDraggedQuestion(null);
      setDragOverQuestion(null);
      return;
    }

    const newQuestions = [...questions];
    const draggedQuestionData = newQuestions[draggedQuestion];

    newQuestions.splice(draggedQuestion, 1);
    newQuestions.splice(dropIndex, 0, draggedQuestionData);

    setQuestions(newQuestions);
    setDraggedQuestion(null);
    setDragOverQuestion(null);
  };

  const handleViewDragStart = (e, questionId, viewIndex) => {
    setDraggedView({ questionId, index: viewIndex });
    e.dataTransfer.effectAllowed = 'move';
  };

  const handleViewDragOver = (e, questionId, viewIndex) => {
    e.preventDefault();
    setDragOverView({ questionId, index: viewIndex });
  };

  const handleViewDragLeave = () => {
    setDragOverView(null);
  };

  const handleViewDrop = (e, question, dropIndex) => {
    e.preventDefault();
    if (readOnly || draggedView === null || draggedView.questionId !== question.questionId) {
      setDraggedView(null);
      setDragOverView(null);
      return;
    }

    if (draggedView.index === dropIndex) {
      setDraggedView(null);
      setDragOverView(null);
      return;
    }

    updateViewTypesForQuestion(question, (current) => {
      const next = [...current];
      const [moved] = next.splice(draggedView.index, 1);
      next.splice(dropIndex, 0, moved);
      return next;
    });

    setDraggedView(null);
    setDragOverView(null);
  };

  const DragHandle = () => (
    <div className="absolute top-2 left-2 cursor-grab active:cursor-grabbing p-4 invisible_select">
      <div className="grid grid-cols-2 gap-1 w-4 h-3">
        {[...Array(6)].map((_, i) => (
          <div key={i} className="w-1 h-1 bg-gray-400 rounded-full" />
        ))}
      </div>
    </div>
  );

  const renderedQuestions = readOnly
    ? questions.filter((q) => !q.isExcludedFromView)
    : questions;

  const rootClass = fillHeight
    ? 'w-full h-full grid items-stretch gap-3'
    : 'flex flex-wrap justify-center items-center gap-3 w-full';
  const rootStyle = fillHeight
    ? { gridTemplateColumns: 'repeat(auto-fit, minmax(420px, 1fr))' }
    : undefined;

  return (
    <div className={rootClass} style={rootStyle}>
      {renderedQuestions.map((question, index) => {
        const viewList = getViewListForQuestion(question);
        const isExcluded = !!question.isExcludedFromView;
        const isHovered = !readOnly && dragOverQuestion === index && draggedQuestion !== null && draggedQuestion !== index;

        return (
          <div
            key={question.questionId}
            className={`rounded-2xl p-4 flex flex-col items-center bg-white relative w-full max-w-[700px] flex-shrink-0 ${
              isExcluded ? 'invisible_select' : ''
            } ${fillHeight ? 'h-full max-w-none' : ''}`}
            style={{
              ...(fillHeight
                ? { flexBasis: '100%', maxWidth: '100%' }
                : { flexBasis: 'calc(50% - 6px)' }),
              ...(isExcluded
                ? {
                    position: 'relative',
                    backgroundColor: 'rgba(128, 128, 128, 0.3)',
                    border: '2px solid #4a4a4a',
                    opacity: 0.7
                  }
                : isHovered
                  ? {
                      backgroundColor: 'rgba(235, 179, 193, 0.3)',
                      transition: 'background-color 0.2s ease'
                    }
                  : {})
            }}
            draggable={!readOnly && !isExcluded}
            onDragStart={readOnly ? undefined : (e) => handleQuestionDragStart(e, index)}
            onDragOver={readOnly ? undefined : (e) => handleQuestionDragOver(e, index)}
            onDragLeave={readOnly ? undefined : handleQuestionDragLeave}
            onDrop={readOnly ? undefined : (e) => handleQuestionDrop(e, index)}
          >
            {!readOnly && !isExcluded && <DragHandle />}

            <div className="w-full flex items-start justify-between gap-3 mb-2">
              {readOnly ? (
                <h2 className="text-2xl font-bold text-center flex-1">{question.questionText}</h2>
              ) : editingTitleId === question.questionId ? (
                <input
                  type="text"
                  value={question.questionText}
                  onChange={(e) => handleQuestionTitleChange(question.questionId, e.target.value)}
                  onBlur={() => setEditingTitleId(null)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' || e.key === 'Escape') {
                      e.preventDefault();
                      setEditingTitleId(null);
                    }
                  }}
                  className="flex-1 text-center font-bold text-2xl border border-gray-300 rounded px-2 py-1"
                  autoFocus
                />
              ) : (
                <h2
                  className="text-2xl font-bold text-center flex-1 cursor-text"
                  onDoubleClick={() => setEditingTitleId(question.questionId)}
                >
                  {question.questionText}
                </h2>
              )}
              {!readOnly && (
                <label className="flex items-center gap-2 text-sm text-gray-700">
                  <input
                    type="checkbox"
                    checked={isExcluded}
                    onChange={() => toggleExcluded(question.questionId)}
                    className="h-4 w-4"
                  />
                  <span>Hide in preview/export</span>
                </label>
              )}
            </div>

            {!readOnly && (
              <div className="w-full flex items-center justify-between mb-3 gap-3">
                <button
                  type="button"
                  disabled={isExcluded || viewList.length >= 3}
                  onClick={() => handleAddView(question)}
                  className="px-3 py-2 rounded-full background-color-primary-main text-white transition-colors duration-200 disabled:opacity-50"
                >
                  + Add view
                </button>
                <span className="text-xs text-gray-500">Up to 3 per question</span>
              </div>
            )}

            <div
              className="w-full grid gap-4"
              style={{
                gridTemplateColumns: `repeat(${Math.min(viewList.length, 3)}, minmax(0, 1fr))`,
                ...(fillHeight ? { gridAutoRows: '1fr' } : {})
              }}
            >
              {viewList.map((viewType, viewIndex) => {
                  const viewHover =
                  !readOnly &&
                  dragOverView?.questionId === question.questionId &&
                  dragOverView.index === viewIndex &&
                  draggedView?.index !== viewIndex;

                const geoWidescreen = viewType === 'geochart' && viewList.length > 2;

                const chart = viewType === 'circle' ? (
                  <ShowCircle
                    question={question}
                    onTitleChange={handleQuestionTitleChange}
                    readOnly={readOnly}
                    colorScheme={colorScheme}
                    hideTitle
                  />
                ) : viewType === 'geochart' ? (
                  <ShowGeoChart
                    question={question}
                    onTitleChange={handleQuestionTitleChange}
                    readOnly={readOnly}
                    colorScheme={colorScheme}
                    hideTitle
                  />
                ) : viewType === 'wordcloud' ? (
                  <ShowWordCloudQuestion
                    question={question}
                    onTitleChange={handleQuestionTitleChange}
                    readOnly={readOnly}
                    onOpenResponses={onOpenResponses}
                    colorScheme={colorScheme}
                    hideTitle
                  />
                ) : (
                  <ShowBarplot
                    question={question}
                    onTitleChange={handleQuestionTitleChange}
                    readOnly={readOnly}
                    colorScheme={colorScheme}
                    hideTitle
                  />
                );

                return (
                  <div
                    key={`${question.questionId}-${viewIndex}`}
                    className="w-full h-full border border-gray-200 rounded-lg p-3 bg-white relative"
                    style={{
                      ...(viewHover ? { backgroundColor: 'rgba(235, 179, 193, 0.3)', transition: 'background-color 0.2s ease' } : {}),
                      ...(geoWidescreen ? { gridColumn: 'span 2 / span 2' } : {})
                    }}
                    draggable={!readOnly && viewList.length > 1}
                    onDragStart={readOnly ? undefined : (e) => handleViewDragStart(e, question.questionId, viewIndex)}
                    onDragOver={readOnly ? undefined : (e) => handleViewDragOver(e, question.questionId, viewIndex)}
                    onDragLeave={readOnly ? undefined : handleViewDragLeave}
                    onDrop={readOnly ? undefined : (e) => handleViewDrop(e, question, viewIndex)}
                  >
                    {!readOnly && (
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center gap-2">
                          <span className="text-xs text-gray-500">View {viewIndex + 1}</span>
                          <select
                            onChange={(e) => handleViewChange(question, viewIndex, e.target.value)}
                            value={viewType}
                            className="border border-gray-300 rounded px-2 py-1"
                          >
                            <option value="circle">Circle</option>
                            <option value="barplot">Barplot</option>
                            <option value="wordcloud">Word Cloud</option>
                            {(question.questionType === 3 || viewType === 'geochart') ? (
                              <option value="geochart">Geo chart</option>
                            ) : null}
                          </select>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="text-xs text-gray-500">Drag to reorder</span>
                          <button
                            type="button"
                            disabled={viewList.length <= 1}
                            onClick={() => handleRemoveView(question, viewIndex)}
                            className="px-2 py-1 text-xs rounded-full border border-gray-300 text-gray-700 hover:bg-gray-100 disabled:opacity-50"
                          >
                            Remove
                          </button>
                        </div>
                      </div>
                    )}
                    {chart}
                  </div>
                );
              })}
            </div>

            {!readOnly && (
              <div className="mt-3 w-full editor-only">
                {question.answers.map((answer) => (
                  <div key={answer.answerId} className="flex items-center space-x-2 text-sm mb-1">
                    <span className="text-gray-500 w-10 text-right">{answer.count}</span>
                    <input
                      type="text"
                      value={answer.answerText}
                      onChange={(e) => handleAnswerTextChange(question.questionId, answer.answerId, e.target.value)}
                      className="flex-1 border border-gray-300 rounded px-2 py-1"
                    />
                  </div>
                ))}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
