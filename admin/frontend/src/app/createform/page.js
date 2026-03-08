'use client';

/*
Creation of one form
*/

import React, { Suspense, useCallback, useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { v4 as uuidv4 } from "uuid";
import OpenQuestion from "../components/OpenQuestion";
import SingleChoiceQuestion from "../components/SingleChoiceQuestion";
import MultiChoiceQuestion from "../components/MultiChoiceQuestion";
import GeoQuestion from "../components/GeoQuestion";
import UnsavedChangesModal from "../components/UnsavedChangesModal";
import { useUnsavedChanges } from "../utils/useUnsavedChanges";
import { getCountriesForRegion, detectRegionFromAnswers } from "../data/geoRegions";
import { useAuthenticatedFetch } from "../utils/useAuthenticatedFetch";

const QUESTION_TYPE_MAP = {
  single: 0,
  multi: 1,
  open: 2,
  geo: 3,
};

const QUESTION_TYPE_FROM_API = {
  0: "single",
  1: "multi",
  2: "open",
  3: "geo",
};

function CreateFormInner() {
  const fetch = useAuthenticatedFetch();
  const searchParams = useSearchParams();
  const router = useRouter();
  const surveyIdFromQuery = searchParams.get("surveyId");

  const [surveyId, setSurveyId] = useState(surveyIdFromQuery);
  const [isLive, setIsLive] = useState(false);
  const [isEditing, setIsEditing] = useState(true);
  const [questions, setQuestions] = useState([]);
  const [draggedItem, setDraggedItem] = useState(null);
  const [dragOverItem, setDragOverItem] = useState(null);
  const [formTitle, setFormTitle] = useState("Double-click to edit form title");
  const [loadingSurvey, setLoadingSurvey] = useState(false);
  const [saveState, setSaveState] = useState(null);
  const [error, setError] = useState(null);
  const {
    hasChanges,
    showUnsavedModal,
    setShowUnsavedModal,
    markDirty,
    markClean,
    requestNavigation,
    pendingNavigation,
    setPendingNavigation,
  } = useUnsavedChanges();

  const mapApiQuestion = useCallback((q) => {
    const mappedType = QUESTION_TYPE_FROM_API[q.questionType] || "single";
    const base = {
      id: q.questionId || uuidv4(),
      type: mappedType,
      text: q.questionText || "",
    };

    if (mappedType === "open") {
      return {
        ...base,
        answers: [{ text: "", extraText: true }],
      };
    }

    if (mappedType === "geo") {
      const region = detectRegionFromAnswers(q.answers || []);
      return {
        ...base,
        region,
        allowMultipleSelections: !!q.allowMultipleSelections,
        answers: (q.answers || []).map((a) => ({
          text: a.answerText || "",
          extraText: false,
        })),
      };
    }

    return {
      ...base,
      answers: (q.answers || []).map((a) => ({
        text: a.answerText || "",
        extraText: !!a.extraText,
      })),
    };
  }, []);

  const hydrateSurvey = useCallback(async (id) => {
    setLoadingSurvey(true);
    setError(null);

    try {
      const apiUrl = process.env.DOTNET_API_URL || "http://localhost:5059";
      const response = await fetch(`${apiUrl}/api/surveys/${id}`);
      if (!response.ok) {
        throw new Error("Failed to load survey");
      }

      const data = await response.json();
      setSurveyId(data.surveyId);
      setFormTitle(data.title || "");
      setIsLive(!!data.live);
      setIsEditing(typeof data.editing === "boolean" ? data.editing : !data.live);
      setQuestions((data.questions || []).map(mapApiQuestion));
      markClean();
    } catch (err) {
      setError(err.message);
      markClean();
    } finally {
      setLoadingSurvey(false);
    }
  }, [mapApiQuestion, markClean]);

  useEffect(() => {
    if (surveyIdFromQuery) {
      hydrateSurvey(surveyIdFromQuery);
    }
  }, [surveyIdFromQuery, hydrateSurvey]);

  useEffect(() => {
    if (!surveyIdFromQuery) {
      markClean();
    }
  }, [surveyIdFromQuery, markClean]);

  const addQuestion = (type) => {
    const defaultGeoAnswers = type === "geo"
      ? getCountriesForRegion('world').map((name) => ({ text: name, extraText: false }))
      : undefined;
    setQuestions((prev) => [
      ...prev,
      {
        id: uuidv4(),
        type,
        text: "This is a question",
        answers:
          type === "single" || type === "multi"
            ? [{ text: "This is an answer", extraText: false }]
            : type === "open"
              ? [{ text: "This is an open-ended answer", extraText: true }]
              : type === "geo"
                ? defaultGeoAnswers
                : undefined,
        region: type === "geo" ? "world" : undefined,
        allowMultipleSelections: type === "geo" ? false : undefined,
      },
    ]);
    markDirty();
  };

  const deleteQuestion = (id) => {
    setQuestions((prev) => prev.filter((q) => q.id !== id));
    markDirty();
  };

  const handleQuestionChange = (id, changes) => {
    setQuestions((prev) => prev.map((q) => (q.id === id ? { ...q, ...changes } : q)));
    markDirty();
  };

  const handleAnswersChange = (id, answers) => {
    setQuestions((prev) => prev.map((q) => (q.id === id ? { ...q, answers } : q)));
    markDirty();
  };

  const handleDragStart = (e, index) => {
    setDraggedItem(index);
    e.dataTransfer.effectAllowed = "move";
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
    markDirty();
  };

  const DragHandle = () => (
    <div className="cursor-grab active:cursor-grabbing p-2 mr-4 flex items-center">
      <div className="grid grid-cols-2 gap-1 w-4 h-3">
        {[...Array(6)].map((_, i) => (
          <div key={i} className="w-1 h-1 bg-gray-400 rounded-full" />
        ))}
      </div>
    </div>
  );

  const handleTitleBlur = (e) => {
    setFormTitle(e.currentTarget.innerText);
    markDirty();
  };

  const buildPayload = (goLive) => ({
    title: formTitle,
    live: !!goLive,
    editing: !goLive,
    questions: questions.map((q, index) => ({
      questionText: q.text || "",
      questionType: QUESTION_TYPE_MAP[q.type],
        allowMultipleSelections: q.type === "geo" ? !!q.allowMultipleSelections : QUESTION_TYPE_MAP[q.type] === 1,
      answers:
        q.type === "open"
          ? [{ answerText: "", extraText: true }]
          : (q.answers || []).map((a) => ({
              answerText: a.text || "",
              extraText: !!a.extraText,
            })),
      orderIndex: index,
    })),
  });

  const saveSurvey = async ({ goLive }) => {
    setSaveState(goLive ? "goLive" : "save");
    setError(null);

    try {
      const apiUrl = process.env.DOTNET_API_URL || "http://localhost:5059";
      const payload = buildPayload(goLive);
      const isEditing = !!surveyId;
      const endpoint = isEditing ? `${apiUrl}/api/surveys/${surveyId}` : `${apiUrl}/api/surveys`;
      const method = isEditing ? "PUT" : "POST";

      const response = await fetch(endpoint, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        throw new Error(goLive ? "Failed to go live" : "Failed to save survey");
      }

      const data = await response.json().catch(() => null);
      if (!isEditing && data) {
        if (typeof data === "string") {
          setSurveyId(data);
        } else if (data.surveyId) {
          setSurveyId(data.surveyId);
        }
      }

      if (goLive) {
        setIsLive(true);
        setIsEditing(false);
      } else {
        setIsEditing(true);
      }

      markClean();
      return true;
    } catch (err) {
      setError(err.message);
      return false;
    } finally {
      setSaveState(null);
    }
  };

  const savingInProgress = saveState === "save" || saveState === "goLive";
  const saveDisabled = savingInProgress || !hasChanges;

  const performNavigation = (target) => {
    const navTarget = target || pendingNavigation || "back";
    if (navTarget === "home") {
      router.push("/");
    } else {
      router.back();
    }
    setPendingNavigation(null);
  };

  const handleBackClick = (e) => {
    e.preventDefault();
    const canNavigate = requestNavigation("home");
    if (canNavigate) {
      performNavigation("home");
    }
  };

  const handleDiscardAndLeave = () => {
    setShowUnsavedModal(false);
    markClean();
    performNavigation(pendingNavigation || "back");
  };

  const handleSaveAndLeave = async () => {
    const saved = await saveSurvey({ goLive: false });
    if (saved) {
      setShowUnsavedModal(false);
      performNavigation(pendingNavigation || "back");
    }
  };

  const handleCancelLeave = () => {
    setShowUnsavedModal(false);
    setPendingNavigation(null);
  };

  return (
    <div className="min-h-screen bg-white text-color-dark flex justify-center">
      <div className="w-full max-w-3xl flex flex-col items-center p-6 space-y-6">
        <div className="w-full flex justify-start">
            <button
              type="button"
              onClick={handleBackClick}
              className="text-sm text-color-dark border border-gray-300 rounded-full px-3 py-2 hover:bg-gray-100 transition-colors"
            >
              Back to home
            </button>
        </div>
        <div
          contentEditable
          suppressContentEditableWarning
            onBlur={handleTitleBlur}
          className="text-xl font-semibold cursor-text"
        >
          {formTitle}
        </div>

        {loadingSurvey ? (
          <div className="text-gray-600">Loading survey...</div>
        ) : null}
        {error ? (
          <div className="w-full bg-red-100 border border-red-300 text-red-700 px-4 py-2 rounded">{error}</div>
        ) : null}

        <div className="flex flex-wrap gap-4 mb-4 w-full justify-center">
          <button
            onClick={() => addQuestion("single")}
            className="questionbutton px-6 py-3 rounded-full background-color-primary-main text-white transition-colors duration-200 hover:background-color-primary-dark"
          >
            + Single Choice
          </button>
          <button
            onClick={() => addQuestion("multi")}
            className="questionbutton px-6 py-3 rounded-full background-color-primary-main text-white transition-colors duration-200 hover:background-color-primary-dark"
          >
            + Multi-Choice
          </button>
          <button
            onClick={() => addQuestion("open")}
            className="questionbutton px-6 py-3 rounded-full background-color-primary-main text-white transition-colors duration-200 hover:background-color-primary-dark"
          >
            Open-Ended
          </button>
          <button
            onClick={() => addQuestion("geo")}
            className="questionbutton px-6 py-3 rounded-full background-color-primary-main text-white transition-colors duration-200 hover:background-color-primary-dark"
          >
            Region (Geo)
          </button>
        </div>

        <div className="flex flex-wrap gap-4 mb-8 w-full justify-center">
          <button
            onClick={() => saveSurvey({ goLive: false })}
            disabled={saveDisabled}
            className="questionbutton px-8 py-4 rounded-full background-color-primary-main text-white transition-colors duration-200 hover:background-color-primary-dark disabled:opacity-60"
          >
            {saveState === "save" ? "Saving..." : "Save"}
          </button>
          <button
            onClick={() => saveSurvey({ goLive: true })}
            disabled={saveDisabled}
            className="questionbutton px-8 py-4 rounded-full border-2 border-color-primary-main text-color-dark transition-colors duration-200 hover:background-color-primary-main hover:text-white disabled:opacity-60"
          >
            {saveState === "goLive" ? "Going live..." : "Go live"}
          </button>
        </div>

        {isLive ? (
          <div className="w-full text-center text-green-700 bg-green-100 border border-green-200 rounded p-3">
            This survey is live. Question layout changes are locked in other stages.
          </div>
        ) : null}

        <div className="space-y-8 w-full">
          {questions.map((q, index) => {
            const isHovered = dragOverItem === index && draggedItem !== null && draggedItem !== index;
            return (
              <div
                key={q.id}
                className="relative flex items-start"
                style={isHovered ? {
                  backgroundColor: "rgba(235, 179, 193, 0.3)",
                  transition: "background-color 0.2s ease",
                  borderRadius: "16px",
                  padding: "8px",
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
                            value={q.text || ""}
                            onChange={(text) => handleQuestionChange(q.id, { text })}
                          />
                        );
                      case "single":
                        return (
                          <SingleChoiceQuestion
                            onDelete={() => deleteQuestion(q.id)}
                            value={q.text || ""}
                            onChange={(text) => handleQuestionChange(q.id, { text })}
                            answers={q.answers || []}
                            onAnswersChange={(answers) => handleAnswersChange(q.id, answers)}
                          />
                        );
                      case "multi":
                        return (
                          <MultiChoiceQuestion
                            onDelete={() => deleteQuestion(q.id)}
                            value={q.text || ""}
                            onChange={(text) => handleQuestionChange(q.id, { text })}
                            answers={q.answers || []}
                            onAnswersChange={(answers) => handleAnswersChange(q.id, answers)}
                          />
                        );
                      case "geo":
                        return (
                          <GeoQuestion
                            onDelete={() => deleteQuestion(q.id)}
                            value={q.text || ""}
                            onChange={(text) => handleQuestionChange(q.id, { text })}
                            region={q.region || "world"}
                            onRegionChange={(region) => handleQuestionChange(q.id, { region })}
                            allowMultipleSelections={!!q.allowMultipleSelections}
                            onAllowMultipleChange={(allowMultipleSelections) => handleQuestionChange(q.id, { allowMultipleSelections })}
                            answers={q.answers || []}
                            onAnswersChange={(answers) => handleAnswersChange(q.id, answers)}
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

        <UnsavedChangesModal
          open={showUnsavedModal}
          saving={savingInProgress}
          onCancel={handleCancelLeave}
          onDiscard={handleDiscardAndLeave}
          onSave={handleSaveAndLeave}
        />
      </div>
    </div>
  );
}

export default function CreateFormPage() {
  return (
    <Suspense fallback={<div className="min-h-screen flex items-center justify-center text-gray-600">Loading...</div>}>
      <CreateFormInner />
    </Suspense>
  );
}
