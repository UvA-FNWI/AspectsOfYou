import React, { useEffect, useMemo, useRef, useState } from 'react';
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
  const [openEditOptions, setOpenEditOptions] = useState({});
  const cardRefs = useRef({});
  const [maxCardHeight, setMaxCardHeight] = useState(null);
  // Per-view geo region state keyed by "questionId-viewIndex"
  const [geoViewRegions, setGeoViewRegions] = useState({});

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

  const handleGeoRegionChange = (questionId, viewIndex, regionKey) => {
    setGeoViewRegions((prev) => ({
      ...prev,
      [`${questionId}-${viewIndex}`]: regionKey
    }));
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
    <img
      src="/drag.png"
      alt="Drag handle"
      className="h-6 w-6 cursor-grab active:cursor-grabbing select-none"
      draggable={false}
    />
  );

  const renderedQuestions = readOnly
    ? questions.filter((q) => !q.isExcludedFromView)
    : questions;

  // --- Auto-scaling for fillHeight mode ---
  const gridContainerRef = useRef(null);
  const [containerDims, setContainerDims] = useState({ width: 0, height: 0 });

  useEffect(() => {
    if (!fillHeight) return;
    const el = gridContainerRef.current;
    if (!el) return;
    const ro = new ResizeObserver(([entry]) => {
      setContainerDims({
        width: entry.contentRect.width,
        height: entry.contentRect.height,
      });
    });
    ro.observe(el);
    return () => ro.disconnect();
  }, [fillHeight]);

  // Total "slots" — each question with n views counts as n slots
  const totalSlots = useMemo(() => {
    return renderedQuestions.reduce((sum, q) => sum + getViewListForQuestion(q).length, 0);
  }, [renderedQuestions, viewTypes]);

  // Compute the column count that maximises per-cell area for the viewport
  const optimalCols = useMemo(() => {
    if (!fillHeight) return 1;
    const n = totalSlots;
    if (n === 0) return 1;
    const { width: W, height: H } = containerDims;
    if (W === 0 || H === 0) return Math.ceil(Math.sqrt(n));

    let bestCols = 1;
    let bestMinDim = 0;
    for (let cols = 1; cols <= n; cols++) {
      const rows = Math.ceil(n / cols);
      const cellW = W / cols;
      const cellH = H / rows;
      const minDim = Math.min(cellW, cellH);
      if (minDim > bestMinDim) {
        bestMinDim = minDim;
        bestCols = cols;
      }
    }
    return bestCols;
  }, [fillHeight, totalSlots, containerDims]);

  // Discrete chart font-size tiers based on viewport width
  const [chartFontSize, setChartFontSize] = useState(13);
  const [isMobile, setIsMobile] = useState(false);
  useEffect(() => {
    function updateFontTier() {
      const w = window.innerWidth;
      setIsMobile(w < 1024);
      if (w >= 3000) setChartFontSize(24);
      else if (w >= 2400) setChartFontSize(20);
      else if (w >= 1800) setChartFontSize(17);
      else if (w >= 1200) setChartFontSize(14);
      else setChartFontSize(13);
    }
    updateFontTier();
    window.addEventListener('resize', updateFontTier);
    return () => window.removeEventListener('resize', updateFontTier);
  }, []);

  const toggleEditOptions = (questionId) => {
    setOpenEditOptions((prev) => ({
      ...prev,
      [questionId]: !prev[questionId]
    }));
  };

  const recalcMaxHeight = () => {
    let tallest = 0;
    renderedQuestions.forEach((q) => {
      const el = cardRefs.current[q.questionId];
      if (el && el.offsetHeight > tallest) {
        tallest = el.offsetHeight;
      }
    });
    setMaxCardHeight(tallest || null);
  };

  useEffect(() => {
    const handleResize = () => recalcMaxHeight();
    recalcMaxHeight();
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, [renderedQuestions, viewTypes, readOnly, fillHeight]);

  const rootClass = fillHeight
    ? 'w-full h-full grid gap-2'
    : 'flex flex-wrap justify-center items-center gap-3 w-full';
  const effectiveCols = isMobile ? 1 : optimalCols;
  const fillRows = fillHeight ? Math.ceil(totalSlots / effectiveCols) : 1;
  // Each row gets at most its fair share of the container height. Rows shrink
  // to their content when smaller, so there's no extra whitespace between
  // titles and charts. align-content centers the whole block vertically.
  const gap = 8; // gap-2 = 0.5rem = 8px
  const maxRowHeight = fillHeight && containerDims.height > 0
    ? Math.floor((containerDims.height - gap * (fillRows - 1)) / fillRows)
    : undefined;
  const rootStyle = fillHeight
    ? {
        gridTemplateColumns: `repeat(${effectiveCols}, 1fr)`,
        gridTemplateRows: maxRowHeight
          ? `repeat(${fillRows}, minmax(0, ${maxRowHeight}px))`
          : `repeat(${fillRows}, auto)`,
        alignContent: 'center',
        alignItems: 'stretch',
      }
    : undefined;

  return (
    <div className={rootClass} style={rootStyle} ref={fillHeight ? gridContainerRef : undefined}>
      {renderedQuestions.map((question, index) => {
        const viewList = getViewListForQuestion(question);
        const isExcluded = !!question.isExcludedFromView;
        const isHovered = !readOnly && dragOverQuestion === index && draggedQuestion !== null && draggedQuestion !== index;
        const isEditOpen = !!openEditOptions[question.questionId];

        return (
          <div
            key={question.questionId}
            className={`rounded-2xl ${fillHeight ? 'p-1' : 'p-4'} flex flex-col items-center bg-white relative w-full flex-shrink-0 border border-gray-200 shadow-sm ${
              isExcluded ? 'invisible_select' : ''
            } ${fillHeight && !isMobile ? 'h-full min-h-0 max-w-none overflow-hidden' : ''} ${!fillHeight && viewList.length <= 1 ? 'max-w-[700px]' : ''}`}
            style={{
              ...(fillHeight
                ? { gridColumn: `span ${isMobile ? 1 : viewList.length}` }
                : isMobile
                  ? { flexBasis: '100%' }
                  : viewList.length > 1
                    ? { flexBasis: '100%' }
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
                  : {}),
              ...(maxCardHeight && fillHeight ? { minHeight: `${maxCardHeight}px` } : {})
            }}
            ref={(el) => {
              if (el) {
                cardRefs.current[question.questionId] = el;
              } else {
                delete cardRefs.current[question.questionId];
              }
            }}
            draggable={!readOnly && !isExcluded}
            onDragStart={readOnly ? undefined : (e) => handleQuestionDragStart(e, index)}
            onDragOver={readOnly ? undefined : (e) => handleQuestionDragOver(e, index)}
            onDragLeave={readOnly ? undefined : handleQuestionDragLeave}
            onDrop={readOnly ? undefined : (e) => handleQuestionDrop(e, index)}
          >
            <div className={`w-full flex flex-col ${fillHeight ? 'gap-1 mb-1' : 'gap-3 mb-2'}`}>
              {readOnly ? (
                <h2
                  className="font-bold text-center flex-1"
                  style={{ fontSize: fillHeight ? 'clamp(1rem, 2vw, 2.5rem)' : undefined }}
                >{question.questionText}</h2>
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
                <div className="w-full flex items-center justify-between gap-3 flex-wrap">
                  <div className="flex items-center gap-3">
                    <DragHandle />
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
                  <label className="flex items-center gap-2 text-sm text-gray-700 ml-auto">
                    <input
                      type="checkbox"
                      checked={isExcluded}
                      onChange={() => toggleExcluded(question.questionId)}
                      className="h-4 w-4"
                    />
                    <span>Hide in preview/export</span>
                  </label>
                </div>
              )}
            </div>

            <div
              className={`w-full grid ${fillHeight ? 'gap-2 flex-1 min-h-0' : 'gap-4'}`}
              style={{
                gridTemplateColumns: isMobile
                  ? '1fr'
                  : `repeat(${Math.min(viewList.length, 2)}, minmax(0, 1fr))`,
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
                const perViewRegion = geoViewRegions[`${question.questionId}-${viewIndex}`];

                const chart = viewType === 'circle' ? (
                  <ShowCircle
                    question={question}
                    onTitleChange={handleQuestionTitleChange}
                    readOnly={readOnly}
                    colorScheme={colorScheme}
                    hideTitle
                    chartFontSize={fillHeight ? chartFontSize : undefined}
                  />
                ) : viewType === 'geochart' ? (
                  <ShowGeoChart
                    question={question}
                    onTitleChange={handleQuestionTitleChange}
                    readOnly={readOnly}
                    colorScheme={colorScheme}
                    regionFilter={perViewRegion}
                    onRegionChange={!readOnly ? (region) => handleGeoRegionChange(question.questionId, viewIndex, region) : undefined}
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
                    chartFontSize={fillHeight ? chartFontSize : undefined}
                  />
                );

                return (
                  <div
                    key={`${question.questionId}-${viewIndex}`}
                    className={`w-full h-full min-h-0 ${!readOnly ? 'border border-gray-200' : ''} rounded-lg ${fillHeight ? 'p-1 overflow-hidden' : 'p-3'} bg-white relative flex flex-col items-center justify-center`}
                    style={{
                      ...(viewHover ? { backgroundColor: 'rgba(235, 179, 193, 0.3)', transition: 'background-color 0.2s ease' } : {}),
                      ...(geoWidescreen && !isMobile ? { gridColumn: 'span 2 / span 2' } : {}),
                      // Center the orphan last item in a 2+1 layout (3 views, 2 columns) — skip on mobile
                      ...(!isMobile && viewList.length === 3 && viewIndex === 2 && !geoWidescreen
                        ? { gridColumn: '1 / -1', justifySelf: 'center', maxWidth: '50%' }
                        : {})
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
              <div className="mt-3 w-full editor-only border border-gray-200 rounded-lg bg-gray-50">
                <button
                  type="button"
                  onClick={() => toggleEditOptions(question.questionId)}
                  className="w-full px-3 py-2 flex items-center justify-between text-sm font-semibold text-gray-800"
                >
                  <span>Edit options</span>
                  <span className="text-xs text-gray-500">{isEditOpen ? 'Hide' : 'Show'}</span>
                </button>
                {isEditOpen && (
                  <div className="px-3 pb-3 pt-1 space-y-1">
                    {question.answers.map((answer) => (
                      <div key={answer.answerId} className="flex items-center space-x-2 text-sm">
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
            )}
          </div>
        );
      })}
    </div>
  );
}
