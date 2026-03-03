'use client';

/*
The page where the visualization of a single survey is shown
*/

import { useState, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import ShowAnswers from '../../components/ShowAnswers';

const uvaRed = '#bc0031';
const uvaRedDark = '#840022';

function ToggleSwitch({ label, checked, onChange, hidden = false, onLabel = 'On', offLabel = 'Off' }) {
  // The left-side label will show the appropriate text depending on `checked` if onLabel/offLabel are supplied.
  const leftText = (onLabel || offLabel) ? (checked ? onLabel : offLabel) : label;
  // Switch background colors: when ON => purple (colorful), when OFF => UvA red
  const purple = '#6b21a8';
  return (
    <div className={`${hidden ? 'sr-only' : 'flex items-center gap-2'}`}>
      <span className="text-sm font-medium text-gray-800 whitespace-nowrap">{leftText}</span>
      <button
        type="button"
        aria-pressed={checked}
        onClick={onChange}
        className="relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer items-center rounded-full transition-colors duration-200 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2"
        style={{ backgroundColor: checked ? purple : uvaRed }}
      >
        <span
          className={`inline-block h-5 w-5 transform rounded-full bg-white shadow transition-transform duration-200 ${checked ? 'translate-x-5' : 'translate-x-1'}`}
        />
        <span className="sr-only">{label}</span>
      </button>
    </div>
  );
}

function regroupByQuestion(responses) {
  const grouped = {};

  responses.forEach(item => {
    const { questionId, questionText, questionType, answerId, answerText, count } = item;

    if (!grouped[questionId]) {
      grouped[questionId] = {
        questionId,
        questionText,
        questionType,
        answers: []
      };
    }

    grouped[questionId].answers.push({ answerId, answerText, count });
  });

  return Object.values(grouped);
}

export default function SurveyPage({ params }) {
  const [questions, setQuestions] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [viewTypes, setViewTypes] = useState({}); // per-question view types (array)
  const [saving, setSaving] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [responseDetails, setResponseDetails] = useState({}); // questionId -> responses list
  const [modalQuestion, setModalQuestion] = useState(null);
  const [modalResponses, setModalResponses] = useState([]);
  const [modalLoading, setModalLoading] = useState(false);
  const [funkyBgEnabled, setFunkyBgEnabled] = useState(false);
  const [colorScheme, setColorScheme] = useState('uva');
  const [funkyFontEnabled, setFunkyFontEnabled] = useState(false);
  const [hasChanges, setHasChanges] = useState(false);
  const [dataInitialized, setDataInitialized] = useState(false);
  const [showUnsavedModal, setShowUnsavedModal] = useState(false);
  const router = useRouter();
  const searchParams = useSearchParams();

  const { id } = params;
  const viewId = searchParams.get('viewId');

  const markDirty = () => {
    if (dataInitialized) {
      setHasChanges(true);
    }
  };

  const setQuestionsWithDirty = (valueOrUpdater) => {
    setQuestions((prev) => {
      const next = typeof valueOrUpdater === 'function' ? valueOrUpdater(prev) : valueOrUpdater;
      return next;
    });
    markDirty();
  };

  const setViewTypesWithDirty = (valueOrUpdater) => {
    setViewTypes((prev) => {
      const next = typeof valueOrUpdater === 'function' ? valueOrUpdater(prev) : valueOrUpdater;
      return next;
    });
    markDirty();
  };

  useEffect(() => {
    async function fetchSurvey() {
      // Gets grouped answers per question
      try {
        const apiUrl = process.env.DOTNET_API_URL || 'http://localhost:5059';
        // If viewId is provided, fetch that specific view, otherwise get the default view
        const viewUrl = viewId 
          ? `${apiUrl}/api/viewsurveys/${id}/view/${viewId}`
          : `${apiUrl}/api/viewsurveys/${id}`;
        const [countsRes, viewRes] = await Promise.all([
          fetch(`${apiUrl}/api/surveys/${id}/responseCounts`),
          fetch(viewUrl)
        ]);

        const counts = await countsRes.json();
        if (!countsRes.ok) {
          throw new Error('Failed to fetch survey response counts');
        }

        const groupedCounts = regroupByQuestion(counts);

        let viewConfig = null;
        if (viewRes.ok) {
          viewConfig = await viewRes.json();
        }

        // Set survey title and description from view config if available
        if (viewConfig) {
          setTitle(viewConfig.title || '');
          setDescription(viewConfig.description || '');
          setFunkyBgEnabled(!!viewConfig.funkyBackground);
          setColorScheme(viewConfig.funkyColors ? 'funky' : 'uva');
          setFunkyFontEnabled(!!viewConfig.funkyFont);
        } else {
          setTitle('');
          setDescription('');
          setFunkyBgEnabled(false);
          setColorScheme('uva');
          setFunkyFontEnabled(false);
        }

        // Merge grouped counts with view configuration (titles, order, view type, etc.)
        const viewQuestionsById = new Map();
        if (viewConfig && Array.isArray(viewConfig.questions)) {
          viewConfig.questions.forEach((vq) => {
            viewQuestionsById.set(vq.questionId, vq);
          });
        }

        const initialViewTypes = {};
        const mergedQuestions = groupedCounts.map((q) => {
          const vq = viewQuestionsById.get(q.questionId);

          const questionType = typeof q.questionType === 'number' ? q.questionType : 0;

          const questionTitle = vq?.title || q.questionText;
          const orderingId = typeof vq?.orderingId === 'number' ? vq.orderingId : null;
          const excludedAnswerIds = vq?.excludedAnswerIds || '';
          const excludedResponseIds = vq?.excludedResponseIds || '';
          const isExcludedFromView = vq?.isExcludedFromView || false;
          const regionFilter = vq?.regionFilter || null;

          const viewTypeListRaw = Array.isArray(vq?.viewTypes) ? vq.viewTypes : [];
          const viewTypesForQuestion = (viewTypeListRaw.length > 0 ? viewTypeListRaw : [questionType === 3 ? 'geochart' : 'circle'])
            .map((vt) => (vt === 'circleplot' ? 'circle' : vt))
            .slice(0, 3);

          initialViewTypes[q.questionId] = viewTypesForQuestion;

          const answersWithViewTitles = q.answers.map((a) => {
            const viewAnswer = vq?.answers?.find((va) => va.answerId === a.answerId);
            return {
              ...a,
              answerText: viewAnswer?.title || a.answerText
            };
          });

          return {
            ...q,
            questionText: questionTitle,
            questionType,
            orderingId,
            excludedAnswerIds,
            excludedResponseIds,
            isExcludedFromView,
            regionFilter,
            viewTypes: viewTypesForQuestion,
            answers: answersWithViewTitles
          };
        });

        // Sort questions by orderingId if available, otherwise keep original order
        mergedQuestions.sort((a, b) => {
          const aOrder = typeof a.orderingId === 'number' ? a.orderingId : Number.MAX_SAFE_INTEGER;
          const bOrder = typeof b.orderingId === 'number' ? b.orderingId : Number.MAX_SAFE_INTEGER;
          return aOrder - bOrder;
        });

        setQuestions(mergedQuestions);
        setViewTypes(initialViewTypes);
        setHasChanges(false);
        setDataInitialized(true);
      } catch (err) {
        console.error('Error fetching survey:', err);
        setError('Failed to load the survey. Please try again later.');
      } finally {
        setLoading(false);
      }
    }

    fetchSurvey();
  }, [id]);

  useEffect(() => {
    const handlePopState = (event) => {
      if (hasChanges) {
        event.preventDefault();
        setShowUnsavedModal(true);
        if (router && typeof router.forward === 'function') {
          router.forward();
        } else {
          window.history.forward();
        }
      }
    };

    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, [hasChanges, router]);

  const handleDoubleClick = () => {
    setIsEditing(true);
  };

  const handleTitleChange = (e) => {
    setTitle(e.target.value);
    markDirty();
  };

  const handleBlur = () => {
    setIsEditing(false);
  };

  const handleGoToPreview = () => {
    const params = new URLSearchParams();
    if (viewId) params.set('viewId', viewId);
    if (funkyBgEnabled) params.set('funky', '1');
    if (colorScheme === 'funky') params.set('palette', 'funky');
    if (funkyFontEnabled) params.set('font', 'funky');
    const qs = params.toString();
    router.push(`/survey/${id}/preview${qs ? `?${qs}` : ''}`);
  };

  const toggleFunkyBg = () => {
    setFunkyBgEnabled((prev) => !prev);
    markDirty();
  };

  const togglePalette = () => {
    setColorScheme((prev) => (prev === 'uva' ? 'funky' : 'uva'));
    markDirty();
  };

  const toggleFunkyFont = () => {
    setFunkyFontEnabled((prev) => !prev);
    markDirty();
  };

  const handleOpenResponsesModal = async (question) => {
    if (!question) return;
    setModalQuestion(question);
    setModalLoading(true);
    try {
      const cached = responseDetails[question.questionId];
      if (cached) {
        setModalResponses(cached);
        return;
      }

      const apiUrl = process.env.DOTNET_API_URL || 'http://localhost:5059';
      const res = await fetch(`${apiUrl}/api/questions/${question.questionId}/responses`);
      const data = await res.json();
      if (!res.ok) {
        throw new Error('Failed to fetch individual responses');
      }

      setResponseDetails((prev) => ({ ...prev, [question.questionId]: data }));
      setModalResponses(data);
    } catch (err) {
      console.error('Error fetching individual responses:', err);
      setError('Failed to load individual responses. Please try again later.');
    } finally {
      setModalLoading(false);
    }
  };

  const handleCloseResponsesModal = () => {
    setModalQuestion(null);
    setModalResponses([]);
    setModalLoading(false);
  };

  const handleToggleResponseExcluded = (questionId, response) => {
    setQuestionsWithDirty((prev) =>
      prev.map((q) => {
        if (q.questionId !== questionId) return q;

        const currentIds = (q.excludedResponseIds || '')
          .split(',')
          .map((s) => s.trim())
          .filter((s) => s.length > 0);
        const set = new Set(currentIds);
        const idStr = response.responseId;
        const wasExcluded = set.has(idStr);
        if (wasExcluded) {
          set.delete(idStr);
        } else {
          set.add(idStr);
        }

        const delta = wasExcluded ? 1 : -1;
        const newAnswers = q.answers.map((a) => ({ ...a }));

        if (delta !== 0) {
          if (response.questionType === 2) {
            const textKey = response.additional && response.additional.length > 0
              ? response.additional
              : 'No response';
            const idx = newAnswers.findIndex((a) => a.answerText === textKey);
            if (idx >= 0) {
              const current = typeof newAnswers[idx].count === 'number'
                ? newAnswers[idx].count
                : parseInt(newAnswers[idx].count, 10) || 0;
              newAnswers[idx].count = Math.max(0, current + delta);
            }
          } else {
            const idx = newAnswers.findIndex((a) => a.answerId === response.answerId);
            if (idx >= 0) {
              const current = typeof newAnswers[idx].count === 'number'
                ? newAnswers[idx].count
                : parseInt(newAnswers[idx].count, 10) || 0;
              newAnswers[idx].count = Math.max(0, current + delta);
            }
          }
        }

        return {
          ...q,
          excludedResponseIds: Array.from(set).join(','),
          answers: newAnswers
        };
      })
    );
  };

  const handleSaveConfig = async () => {
    if (!questions) return false;

    try {
      setSaving(true);
      const apiUrl = process.env.DOTNET_API_URL || 'http://localhost:5059';

      const payload = {
        title,
        description,
        funkyBackground: funkyBgEnabled,
        funkyColors: colorScheme === 'funky',
        funkyFont: funkyFontEnabled,
        viewQuestions: questions.map((q, index) => {
          const rawList = Array.isArray(viewTypes[q.questionId]) && viewTypes[q.questionId].length > 0
            ? viewTypes[q.questionId]
            : (Array.isArray(q.viewTypes) && q.viewTypes.length > 0 ? q.viewTypes : []);
          const safeList = (rawList.length > 0 ? rawList : [q.questionType === 3 ? 'geochart' : 'circle'])
            .slice(0, 3);

          return {
            questionId: q.questionId,
            title: q.questionText,
            excludedAnswerIds: q.excludedAnswerIds || '',
            excludedResponseIds: q.excludedResponseIds || '',
            isExcludedFromView: !!q.isExcludedFromView,
            orderingId: index,
            regionFilter: q.regionFilter || null,
            viewTypes: safeList,
            viewAnswerOptions: q.answers.map((a) => ({
              answerId: a.answerId,
              title: a.answerText
            }))
          };
        })
      };

      // If viewId is provided, save to that specific view, otherwise save to default
      const saveUrl = viewId
        ? `${apiUrl}/api/viewsurveys/${id}/view/${viewId}`
        : `${apiUrl}/api/viewsurveys/${id}`;
      const response = await fetch(saveUrl, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(payload)
      });

      if (!response.ok) {
        throw new Error('Failed to save configuration');
      }
      setHasChanges(false);
      return true;
    } catch (err) {
      console.error('Error saving configuration:', err);
      setError('Failed to save configuration. Please try again later.');
      return false;
    } finally {
      setSaving(false);
    }
  };

  const handleBackNavigation = () => {
    if (hasChanges) {
      setShowUnsavedModal(true);
      return;
    }
    router.back();
  };

  const handleDiscardAndBack = () => {
    setShowUnsavedModal(false);
    setHasChanges(false);
    router.back();
  };

  const handleSaveAndBack = async () => {
    const saved = await handleSaveConfig();
    if (saved) {
      setShowUnsavedModal(false);
      router.back();
    }
  };

  const saveDisabled = saving || !hasChanges;

  if (loading) {
    return (
      <div className="flex h-screen justify-center flex-col flex-center align-center w-full px-4 py-8">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded">
          <p>{error}</p>
        </div>
      </div>
    );
  }
  
  if (!questions) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="bg-yellow-100 border border-yellow-400 text-yellow-700 px-4 py-3 rounded">
          <p>Survey not found</p>
        </div>
      </div>
    );
  }
  
  return (
    <div
      className="flex flex-col justify-center w-full px-2 sm:px-3 py-6"
      style={{
        fontFamily: funkyFontEnabled ? 'Arial, sans-serif' : undefined,
      }}
    >
      <div className="mt-4 w-full flex flex-col items-center gap-3">
        <div className="w-full max-w-5xl border-t border-gray-200 pt-4 flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <button
              onClick={handleBackNavigation}
              className="px-4 py-2 rounded-full border border-gray-300 text-gray-700 hover:bg-gray-100 transition-colors"
            >
              Back
            </button>
            <span className={`text-sm ${hasChanges ? 'text-red-600' : 'text-gray-500'}`}>
              {hasChanges ? 'Unsaved changes' : 'All changes saved'}
            </span>
          </div>
          <div className="flex flex-wrap gap-3">
            <button
              onClick={handleGoToPreview}
              className="px-5 py-2 rounded-full text-white font-medium transition-opacity duration-200 hover:opacity-90"
              style={{ backgroundColor: uvaRed }}
            >
              Go to preview
            </button>
            <button
              onClick={handleSaveConfig}
              disabled={saveDisabled}
              className="px-5 py-2 rounded-full text-white font-medium transition-opacity duration-200 hover:opacity-90 disabled:opacity-60"
              style={{ backgroundColor: saveDisabled ? '#9ca3af' : saving ? uvaRedDark : uvaRed }}
            >
              {saving ? 'Saving...' : 'Save changed configuration'}
            </button>
          </div>
        </div>
        <div className="w-full max-w-4xl bg-white border border-gray-200 rounded-lg p-4 shadow-sm">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div>
              <p className="text-sm font-semibold text-gray-800">Change only in preview</p>
              <p className="text-xs text-gray-600">Palette and background update on the participant preview after saving.</p>
            </div>
            <div className="flex flex-wrap items-center gap-4">
              <ToggleSwitch
                checked={colorScheme === 'funky'}
                onChange={togglePalette}
                offLabel="UvA color palette"
                onLabel="Colorful color palette"
              />
              <ToggleSwitch
                checked={funkyBgEnabled}
                onChange={toggleFunkyBg}
                offLabel="Simple background"
                onLabel="Colorful background"
              />
              <ToggleSwitch
                label="Funky font"
                checked={funkyFontEnabled}
                onChange={toggleFunkyFont}
                hidden
              />
            </div>
          </div>
        </div>
      </div>
      <div className="survey-content">
        <div className="flex items-center justify-between mb-6 gap-4">
          <img
            src="/uvalogo.png"
            alt="First logo"
            className="w-32 h-auto object-contain"
          />
          {isEditing ? (
            <input
              type="text"
              value={title}
              onChange={handleTitleChange}
              onBlur={handleBlur}
              className="text-4xl font-bold border border-gray-300 rounded px-2 py-1 text-center flex-1"
            />
          ) : (
            <h1
              className="text-4xl font-bold text-center flex-1"
              onDoubleClick={handleDoubleClick}
            >
              {title}
            </h1>
          )}
          <img
            src="/Artboard4.png"
            alt="Second logo"
            className="w-32 h-auto object-contain"
          />
        </div>
        <ShowAnswers
          questions={questions}
          setQuestions={setQuestionsWithDirty}
          viewTypes={viewTypes}
          setViewTypes={setViewTypesWithDirty}
          onOpenResponses={handleOpenResponsesModal}
          colorScheme="uva"
        /> {/* Shows the answers of the individual questions */}
      </div>

      {modalQuestion && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-lg max-h-[80vh] w-full max-w-xl p-4 overflow-hidden">
            <div className="flex justify-between items-center mb-2">
              <h2 className="text-xl font-semibold">
                Responses for &quot;{modalQuestion.questionText}&quot;
              </h2>
              <button
                onClick={handleCloseResponsesModal}
                className="text-gray-500 hover:text-gray-800"
              >
                ✕
              </button>
            </div>
            <div className="border-t pt-2 mt-2 max-h-[60vh] overflow-y-auto">
              {modalLoading ? (
                <div className="flex justify-center py-4">
                  <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-blue-500"></div>
                </div>
              ) : modalResponses.length === 0 ? (
                <p className="text-sm text-gray-500">No responses found.</p>
              ) : (
                modalResponses.map((r) => {
                  const q = questions.find((x) => x.questionId === modalQuestion.questionId);
                  const excludedSet = new Set(
                    (q?.excludedResponseIds || '')
                      .split(',')
                      .map((s) => s.trim())
                      .filter((s) => s.length > 0)
                  );
                  const checked = excludedSet.has(r.responseId);
                  const label = r.questionType === 2
                    ? (r.additional && r.additional.length > 0 ? r.additional : 'No response')
                    : (r.additional && r.additional.length > 0 ? r.additional : 'this was not an open-ended question');
                  return (
                    <label
                      key={r.responseId}
                      className="flex items-center gap-2 text-sm py-1 border-b border-gray-100"
                    >
                      <input
                        type="checkbox"
                        checked={checked}
                        onChange={() => handleToggleResponseExcluded(modalQuestion.questionId, r)}
                        className="h-4 w-4"
                      />
                      <span className="flex-1 break-words">{label}</span>
                    </label>
                  );
                })
              )}
            </div>
          </div>
        </div>
      )}

      {showUnsavedModal && (
        <div className="fixed inset-0 bg-black bg-opacity-40 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-md w-full p-6 space-y-4">
            <div className="space-y-1">
              <h3 className="text-xl font-semibold">Leave without saving?</h3>
              <p className="text-gray-600">You have unsaved changes. Would you like to save before going back?</p>
            </div>
            <div className="flex flex-wrap justify-end gap-3">
              <button
                onClick={() => setShowUnsavedModal(false)}
                className="px-4 py-2 rounded-full border border-gray-300 text-gray-700 hover:bg-gray-100"
              >
                Cancel
              </button>
              <button
                onClick={handleDiscardAndBack}
                className="px-4 py-2 rounded-full border border-gray-300 text-gray-700 hover:bg-gray-100"
              >
                Go back without saving
              </button>
              <button
                onClick={handleSaveAndBack}
                disabled={saving}
                className="px-4 py-2 rounded-full text-white font-medium transition-opacity duration-200 hover:opacity-90 disabled:opacity-60"
                style={{ backgroundColor: saving ? uvaRedDark : uvaRed }}
              >
                {saving ? 'Saving...' : 'Save and go back'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}