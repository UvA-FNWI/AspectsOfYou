'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useAuthenticatedFetch } from './utils/useAuthenticatedFetch';

export default function Home() {
  const fetch = useAuthenticatedFetch();
  const [surveys, setSurveys] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [confirmDelete, setConfirmDelete] = useState({ open: false, surveyId: null, title: '' });
  const [confirmDeleteView, setConfirmDeleteView] = useState({ open: false, surveyId: null, viewId: null, viewName: '' });
  const [confirmStatus, setConfirmStatus] = useState({ open: false, surveyId: null, title: '', field: null, newValue: null });
  const [statusError, setStatusError] = useState(null);
  
  // Display slots state
  const [displaySlots, setDisplaySlots] = useState({
    fillin: { surveyId: null, viewId: null, surveyTitle: null, viewName: null },
    display1: { surveyId: null, viewId: null, surveyTitle: null, viewName: null },
    display2: { surveyId: null, viewId: null, surveyTitle: null, viewName: null },
    display3: { surveyId: null, viewId: null, surveyTitle: null, viewName: null },
  });
  const [slotPopup, setSlotPopup] = useState({ open: false, surveyId: null, surveyTitle: null, views: [] });
  const [draggedView, setDraggedView] = useState(null); // { surveyId, surveyTitle, viewId, viewNumber, viewName }
  const [dragOverSlot, setDragOverSlot] = useState(null); // 'display1' | 'display2' | 'display3'

  useEffect(() => {
    async function fetchSurveys() {
      try {
        const apiUrl = process.env.DOTNET_API_URL || 'http://localhost:5059';
        const response = await fetch(`${apiUrl}/api/surveys`);

        if (!response.ok) {
          throw new Error('Failed to fetch surveys');
        }

        const data = await response.json();
        const normalized = (data || []).map((survey) => ({
          ...survey,
          live: !!survey.live,
          editing: typeof survey.editing === 'boolean' ? survey.editing : !survey.live,
          // Use views from API, each with id, viewNumber, and title
          views: (survey.views && survey.views.length > 0)
            ? survey.views.map(v => ({ id: v.id, viewNumber: v.viewNumber, name: v.title || `View ${v.viewNumber}` }))
            : [{ id: 'default', viewNumber: 1, name: 'View 1' }],
        }));
        setSurveys(normalized);
      } catch (err) {
        console.error('Error fetching surveys:', err);
        setError('Failed to load surveys. Please try again later.');
      } finally {
        setLoading(false);
      }
    }

    fetchSurveys();
    fetchDisplaySlots();
  }, []);

  async function fetchDisplaySlots() {
    try {
      const apiUrl = process.env.DOTNET_API_URL || 'http://localhost:5059';
      const response = await fetch(`${apiUrl}/api/displayslots`);
      if (response.ok) {
        const slots = await response.json();
        const slotMap = {};
        for (const slot of slots) {
          slotMap[slot.slotName] = {
            surveyId: slot.surveyId,
            viewId: slot.viewId,
            surveyTitle: slot.surveyTitle,
            viewName: slot.viewTitle || (slot.viewNumber ? `View ${slot.viewNumber}` : null),
          };
        }
        setDisplaySlots(prev => ({ ...prev, ...slotMap }));
      }
    } catch (err) {
      console.error('Error fetching display slots:', err);
    }
  }

  const deleteSurvey = async (surveyId) => {
    try {
      const apiUrl = process.env.DOTNET_API_URL || 'http://localhost:5059';
      const response = await fetch(`${apiUrl}/api/surveys/delete/${surveyId}`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        console.error('Failed to delete survey:', response);
        throw new Error('Failed to delete survey');
      }

      setSurveys((prevSurveys) => prevSurveys.filter((survey) => survey.surveyId !== surveyId));
    } catch (err) {
      console.error('Error deleting survey:', err);
      alert('Failed to delete survey. Please try again later.');
    }
  };

  const requestDelete = (survey) => {
    setConfirmDelete({ open: true, surveyId: survey.surveyId, title: survey.title });
  };

  const cancelDelete = () => {
    setConfirmDelete({ open: false, surveyId: null, title: '' });
  };

  const requestStatusChange = (survey, field, newValue) => {
    setStatusError(null);
    setConfirmStatus({ open: true, surveyId: survey.surveyId, title: survey.title, field, newValue });
  };

  const cancelStatusChange = () => {
    setConfirmStatus({ open: false, surveyId: null, title: '', field: null, newValue: null });
  };

  const updateSurveyStatus = async ({ surveyId, live, editing }) => {
    const apiUrl = process.env.DOTNET_API_URL || 'http://localhost:5059';
    const response = await fetch(`${apiUrl}/api/surveys/${surveyId}/status`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ live, editing }),
    });

    if (!response.ok) {
      const text = await response.text().catch(() => '');
      throw new Error(text || 'Failed to update survey status');
    }

    const data = await response.json();
    setSurveys((prevSurveys) => prevSurveys.map((survey) =>
      survey.surveyId === surveyId
        ? {
            ...survey,
            live: !!data.live,
            editing: typeof data.editing === 'boolean' ? data.editing : !data.live,
          }
        : survey
    ));
  };

  const confirmStatusChange = async () => {
    if (!confirmStatus.surveyId || confirmStatus.field === null) return;
    try {
      setStatusError(null);
      const survey = surveys.find(s => s.surveyId === confirmStatus.surveyId);
      if (!survey) return;
      
      const newLive = confirmStatus.field === 'live' ? confirmStatus.newValue : survey.live;
      const newEditing = confirmStatus.field === 'editing' ? confirmStatus.newValue : survey.editing;
      
      await updateSurveyStatus({
        surveyId: confirmStatus.surveyId,
        live: newLive,
        editing: newEditing,
      });
      cancelStatusChange();
    } catch (err) {
      console.error('Error updating survey status:', err);
      setStatusError('Failed to update survey status. Please try again.');
    }
  };

  const confirmDeleteSurvey = async () => {
    if (!confirmDelete.surveyId) return;
    await deleteSurvey(confirmDelete.surveyId);
    cancelDelete();
  };

  const hasResponses = (survey) => {
    // Check if survey has any responses (you may need to fetch this from API)
    // For now, we assume live surveys might have responses
    return survey.live;
  };

  const canEditLayout = (survey) => {
    // Can edit layout if not yet published (still in editing mode)
    return survey.editing;
  };

  const addNewView = async (surveyId) => {
    try {
      const apiUrl = process.env.DOTNET_API_URL || 'http://localhost:5059';
      const response = await fetch(`${apiUrl}/api/viewsurveys/${surveyId}/new`, {
        method: 'POST',
      });

      if (!response.ok) {
        throw new Error('Failed to create new view');
      }

      const newView = await response.json();
      setSurveys((prevSurveys) => prevSurveys.map((survey) => {
        if (survey.surveyId === surveyId) {
          return {
            ...survey,
            views: [...(survey.views || []), { id: newView.id, viewNumber: newView.viewNumber, name: newView.title || `View ${newView.viewNumber}` }]
          };
        }
        return survey;
      }));
    } catch (err) {
      console.error('Error creating new view:', err);
      alert('Failed to create new view. Please try again.');
    }
  };

  const requestDeleteView = (survey, view) => {
    setConfirmDeleteView({ open: true, surveyId: survey.surveyId, viewId: view.id, viewName: view.name });
  };

  const cancelDeleteView = () => {
    setConfirmDeleteView({ open: false, surveyId: null, viewId: null, viewName: '' });
  };

  const confirmDeleteViewAction = async () => {
    if (!confirmDeleteView.surveyId || !confirmDeleteView.viewId) return;
    try {
      const apiUrl = process.env.DOTNET_API_URL || 'http://localhost:5059';
      const response = await fetch(`${apiUrl}/api/viewsurveys/${confirmDeleteView.surveyId}/view/${confirmDeleteView.viewId}`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        throw new Error('Failed to delete view');
      }

      setSurveys((prevSurveys) => prevSurveys.map((survey) => {
        if (survey.surveyId === confirmDeleteView.surveyId) {
          return {
            ...survey,
            views: survey.views.filter(v => v.id !== confirmDeleteView.viewId)
          };
        }
        return survey;
      }));
      cancelDeleteView();
    } catch (err) {
      console.error('Error deleting view:', err);
      alert('Failed to delete view. Please try again.');
    }
  };

  // Slot management functions
  const openSlotPopup = (survey) => {
    setSlotPopup({
      open: true,
      surveyId: survey.surveyId,
      surveyTitle: survey.title,
      views: survey.views || [{ id: 'default', viewNumber: 1, name: 'View 1' }],
    });
  };

  const closeSlotPopup = () => {
    setSlotPopup({ open: false, surveyId: null, surveyTitle: null, views: [] });
  };

  const assignToSlot = async (slotName, surveyId, viewId = null) => {
    try {
      const apiUrl = process.env.DOTNET_API_URL || 'http://localhost:5059';
      const response = await fetch(`${apiUrl}/api/displayslots/${slotName}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ surveyId, viewId }),
      });

      if (!response.ok) {
        throw new Error('Failed to assign to slot');
      }

      const data = await response.json();
      setDisplaySlots(prev => ({
        ...prev,
        [slotName]: {
          surveyId: data.surveyId,
          viewId: data.viewId,
          surveyTitle: data.surveyTitle,
          viewName: data.viewTitle || (data.viewNumber ? `View ${data.viewNumber}` : null),
        },
      }));
      closeSlotPopup();
    } catch (err) {
      console.error('Error assigning to slot:', err);
      alert('Failed to assign to slot. Please try again.');
    }
  };

  const clearSlot = async (slotName) => {
    try {
      const apiUrl = process.env.DOTNET_API_URL || 'http://localhost:5059';
      const response = await fetch(`${apiUrl}/api/displayslots/${slotName}`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        throw new Error('Failed to clear slot');
      }

      setDisplaySlots(prev => ({
        ...prev,
        [slotName]: { surveyId: null, viewId: null, surveyTitle: null, viewName: null },
      }));
    } catch (err) {
      console.error('Error clearing slot:', err);
      alert('Failed to clear slot. Please try again.');
    }
  };

  // Drag-and-drop handlers for views → display slots
  const handleViewDragStart = (e, surveyId, surveyTitle, view) => {
    setDraggedView({ surveyId, surveyTitle, viewId: view.id, viewNumber: view.viewNumber, viewName: view.name });
    e.dataTransfer.effectAllowed = 'copy';
    e.dataTransfer.setData('text/plain', JSON.stringify({ surveyId, viewId: view.id }));
  };

  const handleViewDragEnd = () => {
    setDraggedView(null);
    setDragOverSlot(null);
  };

  const handleSlotDragOver = (e, slotName) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'copy';
    setDragOverSlot(slotName);
  };

  const handleSlotDragLeave = (e, slotName) => {
    // Only clear if we actually left the slot element
    if (!e.currentTarget.contains(e.relatedTarget)) {
      setDragOverSlot(null);
    }
  };

  const handleSlotDrop = async (e, slotName) => {
    e.preventDefault();
    setDragOverSlot(null);
    if (draggedView) {
      await assignToSlot(slotName, draggedView.surveyId, draggedView.viewId);
      setDraggedView(null);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4">
        <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded max-w-md w-full">
          <p>{error}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8 space-y-8">
      <div className="text-center space-y-2">
        <h1 className="text-3xl font-bold">Survey workspace</h1>
        <p className="text-gray-600">Create, review results, and preview the participant view.</p>
      </div>

      {/* Create new survey section */}
      <section className="bg-white border border-gray-200 rounded-lg p-6 shadow-sm">
        <h2 className="text-2xl font-semibold mb-2">Create new survey</h2>
        <p className="text-gray-600 mb-4">Start a fresh survey to collect new responses.</p>
        <Link
          href={`/createform`}
          className="inline-flex items-center background-color-primary-main text-white rounded-full px-4 py-2 text-sm font-semibold hover:opacity-90 transition-opacity"
        >
          <img src="/icons/plus.svg" alt="" className="h-4 w-4 mr-2" />
          Create new survey
        </Link>
      </section>

      {/* Survey table */}
      <section className="bg-white border border-gray-200 rounded-lg shadow-sm overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-200">
          <h2 className="text-2xl font-semibold">Your surveys</h2>
          <p className="text-gray-600">Manage all your surveys from one place.</p>
        </div>

        {surveys.length === 0 ? (
          <div className="text-center py-12">
            <p className="text-gray-600">No surveys yet. Create one to begin.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                  <th className="text-left px-6 py-3 text-sm font-semibold text-gray-700">Survey</th>
                  <th className="text-left px-4 py-3 text-sm font-semibold text-gray-700">Status</th>
                  <th className="text-left px-4 py-3 text-sm font-semibold text-gray-700">Edit Questions</th>
                  <th className="text-left px-4 py-3 text-sm font-semibold text-gray-700">Add Response</th>
                  <th className="text-left px-4 py-3 text-sm font-semibold text-gray-700">View Responses & Edit Layout</th>
                  <th className="text-left px-4 py-3 text-sm font-semibold text-gray-700">Preview</th>
                  <th className="text-left px-4 py-3 text-sm font-semibold text-gray-700">Send to Slot</th>
                  <th className="text-center px-4 py-3 text-sm font-semibold text-gray-700 w-12"></th>
                </tr>
              </thead>
              <tbody>
                {surveys.map((survey) => (
                  <tr key={survey.surveyId} className="border-b border-gray-100 hover:bg-gray-50 transition-colors">
                    {/* Survey title and ID */}
                    <td className="px-6 py-4">
                      <div>
                        <h3 className="text-base font-semibold text-gray-900">{survey.title}</h3>
                        <p className="text-xs text-gray-400 font-mono mt-0.5">{survey.surveyId}</p>
                        <p className="text-sm text-gray-500 mt-1">{survey.questions?.length || 0} questions</p>
                      </div>
                    </td>

                    {/* Status flags */}
                    <td className="px-4 py-4">
                      <div className="flex flex-col gap-2">
                        {/* Editing toggle */}
                        <button
                          type="button"
                          onClick={() => requestStatusChange(survey, 'editing', !survey.editing)}
                          className={`text-sm font-semibold px-3 py-1.5 rounded-full border cursor-pointer text-left hover:opacity-90 transition-opacity ${
                            survey.editing
                              ? 'text-blue-800 bg-blue-50 border-blue-200'
                              : 'text-gray-600 bg-gray-100 border-gray-200'
                          }`}
                          title={survey.editing ? 'Click to lock editing' : 'Click to enable editing'}
                        >
                          {survey.editing ? 'In Edit Mode' : (
                            <span className="inline-flex items-center">
                              <img src="/icons/lock.svg" alt="" className="h-4 w-4 mr-1.5" />
                              Editing Locked
                            </span>
                          )}
                        </button>

                        {/* Live toggle */}
                        <button
                          type="button"
                          onClick={() => requestStatusChange(survey, 'live', !survey.live)}
                          className={`text-sm font-semibold px-3 py-1.5 rounded-full border cursor-pointer text-left hover:opacity-90 transition-opacity ${
                            survey.live
                              ? 'text-green-800 bg-green-50 border-green-200'
                              : 'text-red-700 bg-red-50 border-red-200'
                          }`}
                          title={survey.live ? 'Click to close responses' : 'Click to open for responses'}
                        >
                          {survey.live ? 'Open for Responses' : 'Closed'}
                        </button>
                      </div>
                    </td>

                    {/* Edit Questions column */}
                    <td className="px-4 py-4">
                      {canEditLayout(survey) ? (
                        <Link
                          href={`/createform?surveyId=${survey.surveyId}`}
                          className="inline-flex items-center background-color-primary-main text-white rounded-full px-3 py-2 text-sm font-semibold hover:opacity-90 transition-opacity"
                        >
                          <img src="/icons/edit.svg" alt="" className="h-4 w-4 mr-1.5" />
                          Edit Questions
                        </Link>
                      ) : (
                        <div className="inline-flex items-center bg-gray-100 text-gray-400 rounded-full px-3 py-2 text-sm font-semibold cursor-not-allowed">
                          <img src="/icons/lock.svg" alt="" className="h-4 w-4 mr-1.5" />
                          Locked
                        </div>
                      )}
                    </td>

                    {/* Add Response column */}
                    <td className="px-4 py-4">
                      {survey.live ? (
                        <Link
                          href={`/survey_taking/${survey.surveyId}`}
                          className="inline-flex items-center background-color-primary-light text-color-dark rounded-full px-3 py-2 text-sm font-semibold hover:background-color-primary-main hover:text-white transition-colors"
                        >
                          Add Response
                        </Link>
                      ) : (
                        <div className="inline-flex items-center bg-gray-100 text-gray-400 rounded-full px-3 py-2 text-sm font-semibold cursor-not-allowed">
                          <img src="/icons/closed.svg" alt="" className="h-4 w-4 mr-1.5" />
                          Closed
                        </div>
                      )}
                    </td>

                    {/* View Responses & Edit Layout column - supports multiple views */}
                    <td className="px-4 py-4">
                      <div className="flex flex-col gap-1.5">
                        {(survey.views || [{ id: 'default', viewNumber: 1, name: 'View 1' }]).map((view) => (
                          <div key={view.id} className="relative group">
                            <Link
                              href={`/survey/${survey.surveyId}${view.id !== 'default' ? `?viewId=${view.id}` : ''}`}
                              className="inline-flex items-center background-color-primary-main text-white rounded-full px-3 py-1.5 pr-10 text-sm font-semibold hover:opacity-90 transition-opacity w-full"
                            >
                              #{view.viewNumber}: {view.name}
                            </Link>
                            {(survey.views || []).length > 1 && (
                              <button
                                onClick={(e) => {
                                  e.preventDefault();
                                  requestDeleteView(survey, view);
                                }}
                                className="absolute right-2 top-1/2 -translate-y-1/2 opacity-0 group-hover:opacity-100 group-hover:bg-red-50 transition-opacity p-1 rounded hover:bg-red-50"
                                title="Delete view"
                              >
                                <img src="/icons/trash.svg" alt="" className="h-4 w-4 text-red-600" />
                              </button>
                            )}
                          </div>
                        ))}
                        <button
                          onClick={() => addNewView(survey.surveyId)}
                          className="inline-flex items-center text-gray-500 border border-dashed border-gray-300 rounded-full px-3 py-1.5 text-sm font-semibold hover:bg-gray-50 hover:border-gray-400 transition-colors"
                        >
                          <img src="/icons/plus.svg" alt="" className="h-3.5 w-3.5 mr-1.5" />
                          Add View
                        </button>
                      </div>
                    </td>

                    {/* Preview column - supports multiple views */}
                    <td className="px-4 py-4">
                      <div className="flex flex-col gap-1.5">
                        {(survey.views || [{ id: 'default', viewNumber: 1, name: 'View 1' }]).map((view) => (
                          <div key={view.id} className="relative group">
                            <Link
                              href={`/survey/${survey.surveyId}/preview${view.id !== 'default' ? `?viewId=${view.id}` : ''}`}
                              className="inline-flex items-center background-color-primary-light text-color-dark rounded-full px-3 py-1.5 pr-10 text-sm font-semibold hover:opacity-90 transition-opacity w-full"
                            >
                              Preview #{view.viewNumber}
                            </Link>
                            {(survey.views || []).length > 1 && (
                              <button
                                onClick={(e) => {
                                  e.preventDefault();
                                  requestDeleteView(survey, view);
                                }}
                                className="absolute right-2 top-1/2 -translate-y-1/2 opacity-0 group-hover:opacity-100 group-hover:bg-red-50 transition-opacity p-1 rounded hover:bg-red-50"
                                title="Delete view"
                              >
                                <img src="/icons/trash.svg" alt="" className="h-4 w-4 text-red-600" />
                              </button>
                            )}
                          </div>
                        ))}
                      </div>
                    </td>

                    {/* Send to Slot button */}
                    <td className="px-4 py-4">
                      <button
                        onClick={() => openSlotPopup(survey)}
                        className="inline-flex items-center background-color-primary-main text-white rounded-full px-3 py-2 text-sm font-semibold hover:opacity-90 transition-opacity"
                      >
                        Send to Slot
                      </button>
                    </td>

                    {/* Delete button */}
                    <td className="px-4 py-4 text-center">
                      <button
                        onClick={() => requestDelete(survey)}
                        className="opacity-60 hover:opacity-100 transition-opacity p-1.5 rounded hover:bg-red-50"
                        title="Delete survey"
                      >
                        <img src="/icons/trash.svg" alt="" className="h-5 w-5 text-red-600" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      {/* Display Slots section */}
      <section className="bg-white border border-gray-200 rounded-lg shadow-sm overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-200">
          <h2 className="text-2xl font-semibold">Display Slots</h2>
          <p className="text-gray-600">Manage what&apos;s shown on each public display. Use &quot;Send to Slot&quot; on a survey, or drag views to a display slot below.</p>
        </div>

        {/* Active Survey (Fill In) — distinct section */}
        <div className="px-6 pt-6 pb-2">
          <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wider mb-3">Active Survey for Participants</h3>
          <div className="border-2 border-dashed border-gray-300 bg-gray-50 rounded-lg p-5">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-gray-200 flex items-center justify-center flex-shrink-0">
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-gray-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                  </svg>
                </div>
                <div>
                  <p className="font-semibold text-gray-800">Fill In Survey</p>
                  {displaySlots.fillin?.surveyId ? (
                    <p className="text-sm text-gray-700 font-medium">{displaySlots.fillin.surveyTitle || 'Assigned Survey'}</p>
                  ) : (
                    <p className="text-sm text-gray-400 italic">No survey assigned — participants will see a placeholder</p>
                  )}
                </div>
              </div>
              <div className="flex items-center gap-3">
                {displaySlots.fillin?.surveyId && (
                  <button
                    onClick={() => clearSlot('fillin')}
                    className="text-xs text-red-600 hover:text-red-800 hover:underline"
                  >
                    Clear
                  </button>
                )}
                <Link
                  href="/fillinthesurvey"
                  target="_blank"
                  className="text-xs text-gray-600 hover:text-gray-800 hover:underline font-medium"
                >
                  Open page →
                </Link>
              </div>
            </div>
          </div>
        </div>

        {/* Display Slots (Visualizations) — with drop targets */}
        <div className="px-6 pt-5 pb-6">
          <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wider mb-3">Visualization Displays</h3>
          <p className="text-xs text-gray-400 mb-4">Drag a view from the popup to assign it to a display, or use the buttons in &quot;Send to Slot&quot;.</p>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {['display1', 'display2', 'display3'].map((slotName, idx) => {
              const slot = displaySlots[slotName];
              return (
                <div
                  key={slotName}
                  className={`border-2 rounded-lg p-4 ${
                    slot?.surveyId
                      ? 'border-gray-200 bg-gray-50'
                      : 'border-dashed border-gray-300 bg-gray-50'
                  }`}
                >
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-2">
                      <div className="w-8 h-8 rounded-full background-color-primary-lighter flex items-center justify-center flex-shrink-0">
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 text-color-primary-main" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                        </svg>
                      </div>
                      <h4 className="font-semibold text-gray-800">Display {idx + 1}</h4>
                    </div>
                    <Link
                      href={`/${slotName}`}
                      target="_blank"
                      className="text-xs text-color-primary-main hover:text-color-primary-dark hover:underline font-medium"
                    >
                      Open →
                    </Link>
                  </div>
                  {slot?.surveyId ? (
                    <div className="space-y-1.5">
                      <p className="text-sm text-gray-700 font-medium truncate">{slot.surveyTitle || 'Assigned Survey'}</p>
                      {slot.viewName && (
                        <p className="text-xs text-color-primary-main background-color-primary-lighter inline-block px-2 py-0.5 rounded-full">{slot.viewName}</p>
                      )}
                      <div>
                        <button
                          onClick={() => clearSlot(slotName)}
                          className="text-xs text-red-600 hover:text-red-800 hover:underline"
                        >
                          Clear slot
                        </button>
                      </div>
                    </div>
                  ) : (
                    <p className="text-sm text-gray-400 italic">No view assigned</p>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* Slot assignment popup modal */}
      {slotPopup.open && (
        <div className="fixed inset-0 bg-black bg-opacity-40 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full p-6 space-y-5">
            <div className="space-y-1">
              <h3 className="text-xl font-semibold">Send to Slot</h3>
              <p className="text-gray-600">Assign &quot;<span className="font-medium">{slotPopup.surveyTitle}</span>&quot; to a slot</p>
            </div>

            {/* Section 1: Fill In Survey — prominent, distinct */}
            <div className="border-2 rounded-lg p-5" style={{ borderColor: '#de8098', backgroundColor: '#fdf2f4' }}>
              <div className="flex items-start gap-4">
                <div className="w-10 h-10 rounded-full background-color-primary-light flex items-center justify-center flex-shrink-0 mt-0.5">
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                  </svg>
                </div>
                <div className="flex-1">
                  <h4 className="font-semibold text-color-dark text-base">Survey to Fill In</h4>
                  <p className="text-sm text-gray-600 mt-1">Set this as the active survey that participants will complete. Only one survey can be active at a time.</p>
                  <button
                    onClick={() => assignToSlot('fillin', slotPopup.surveyId, null)}
                    className="mt-3 inline-flex items-center gap-2 background-color-primary-main text-white rounded-full px-5 py-2 text-sm font-semibold hover:opacity-90 transition-opacity shadow-sm"
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                    Set as the survey to be filled in
                  </button>
                  {displaySlots.fillin?.surveyId && displaySlots.fillin.surveyId === slotPopup.surveyId && (
                    <p className="text-xs text-color-primary-dark mt-2 font-medium">This survey is already the active fill-in survey.</p>
                  )}
                </div>
              </div>
            </div>

            {/* Divider */}
            <div className="flex items-center gap-3">
              <div className="flex-1 border-t border-gray-200"></div>
              <span className="text-xs text-gray-400 font-medium uppercase tracking-wider">or assign a view to a display</span>
              <div className="flex-1 border-t border-gray-200"></div>
            </div>

            {/* Section 2: Display Slots — draggable views + drop targets */}
            <div className="space-y-4">
              <div>
                <h4 className="font-semibold text-gray-800 text-base mb-1">Visualization Displays</h4>
                <p className="text-sm text-gray-500">Drag a view to a display slot, or click a slot button to assign it directly.</p>
              </div>

              {/* Draggable views */}
              <div className="flex flex-wrap gap-2">
                <span className="text-xs text-gray-400 self-center mr-1">Views:</span>
                {slotPopup.views.map((view) => (
                  <div
                    key={view.id}
                    draggable
                    onDragStart={(e) => handleViewDragStart(e, slotPopup.surveyId, slotPopup.surveyTitle, view)}
                    onDragEnd={handleViewDragEnd}
                    className="inline-flex items-center gap-1.5 background-color-primary-main text-white rounded-full px-3 py-1.5 text-sm font-semibold cursor-grab active:cursor-grabbing hover:opacity-90 transition-opacity select-none"
                  >
                    <img src="/drag.png" alt="" className="h-3.5 w-3.5 opacity-70" />
                    {view.name}
                  </div>
                ))}
              </div>

              {/* Display slot drop targets */}
              <div className="grid grid-cols-3 gap-3">
                {['display1', 'display2', 'display3'].map((slotName, idx) => {
                  const slot = displaySlots[slotName];
                  const isOver = dragOverSlot === slotName;
                  return (
                    <div
                      key={slotName}
                      className={`border-2 rounded-lg p-3 transition-all duration-150 min-h-[120px] flex flex-col ${
                        isOver
                          ? 'scale-[1.03]'
                          : slot?.surveyId
                            ? 'border-gray-200 bg-gray-50'
                            : 'border-dashed border-gray-300 bg-gray-50'
                      }`}
                      style={isOver ? { borderColor: '#de8098', backgroundColor: '#fdf2f4', boxShadow: '0 0 0 2px #de8098' } : {}}
                      onDragOver={(e) => handleSlotDragOver(e, slotName)}
                      onDragLeave={(e) => handleSlotDragLeave(e, slotName)}
                      onDrop={(e) => handleSlotDrop(e, slotName)}
                    >
                      <div className="flex items-center gap-2 mb-2">
                        <div className="w-6 h-6 rounded-full background-color-primary-lighter flex items-center justify-center flex-shrink-0">
                          <span className="text-xs font-bold text-color-primary-main">{idx + 1}</span>
                        </div>
                        <h5 className="font-medium text-gray-700 text-sm">Display {idx + 1}</h5>
                      </div>

                      {isOver ? (
                        <div className="flex-1 flex items-center justify-center">
                          <p className="text-sm text-color-primary-main font-medium">Drop to assign</p>
                        </div>
                      ) : slot?.surveyId ? (
                        <div className="flex-1 space-y-1">
                          <p className="text-xs text-gray-600 truncate">{slot.surveyTitle}</p>
                          {slot.viewName && (
                            <p className="text-xs text-color-primary-main inline-block px-2 py-0.5 rounded-full background-color-primary-lighter">{slot.viewName}</p>
                          )}
                          <button
                            onClick={() => clearSlot(slotName)}
                            className="block text-xs text-red-500 hover:text-red-700 hover:underline mt-1"
                          >
                            Clear
                          </button>
                        </div>
                      ) : (
                        <div className="flex-1 flex flex-col items-center justify-center text-gray-400">
                          <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 mb-1 opacity-30" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M7 16V4m0 0L3 8m4-4l4 4m6 0v12m0 0l4-4m-4 4l-4-4" />
                          </svg>
                          <p className="text-xs italic">Drop view here</p>
                        </div>
                      )}

                      {/* Direct assign buttons (fallback for non-drag) */}
                      {!isOver && !slot?.surveyId && (
                        <div className="flex flex-wrap gap-1 mt-2 pt-2 border-t border-gray-200">
                          {slotPopup.views.map((view) => (
                            <button
                              key={view.id}
                              onClick={() => assignToSlot(slotName, slotPopup.surveyId, view.id)}
                              className="text-xs background-color-primary-main text-white rounded-full px-2 py-1 font-medium hover:opacity-90 transition-opacity"
                            >
                              {view.name}
                            </button>
                          ))}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>

            <div className="flex justify-end pt-2">
              <button
                onClick={closeSlotPopup}
                className="px-4 py-2 rounded-full border border-gray-300 text-gray-700 text-sm font-semibold hover:opacity-90 transition-opacity"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete confirmation modal */}
      {confirmDelete.open && (
        <div className="fixed inset-0 bg-black bg-opacity-40 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-md w-full p-6 space-y-4">
            <div className="space-y-1">
              <h3 className="text-xl font-semibold">Delete survey?</h3>
              <p className="text-gray-600">This action cannot be undone. The survey and its responses will be removed.</p>
              {confirmDelete.title ? <p className="text-gray-800 font-medium">{confirmDelete.title}</p> : null}
            </div>
            <div className="flex justify-end gap-3">
              <button
                onClick={cancelDelete}
                className="px-4 py-2 rounded-full border border-gray-300 text-gray-700 text-sm font-semibold hover:opacity-90 transition-opacity"
              >
                Cancel
              </button>
              <button
                onClick={confirmDeleteSurvey}
                className="px-4 py-2 rounded-full background-color-primary-main text-white text-sm font-semibold hover:opacity-90 transition-opacity"
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete view confirmation modal */}
      {confirmDeleteView.open && (
        <div className="fixed inset-0 bg-black bg-opacity-40 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-md w-full p-6 space-y-4">
            <div className="space-y-1">
              <h3 className="text-xl font-semibold">Delete view?</h3>
              <p className="text-gray-600">This action cannot be undone. The view configuration will be removed.</p>
              {confirmDeleteView.viewName ? <p className="text-gray-800 font-medium">{confirmDeleteView.viewName}</p> : null}
            </div>
            <div className="flex justify-end gap-3">
              <button
                onClick={cancelDeleteView}
                className="px-4 py-2 rounded-full border border-gray-300 text-gray-700 text-sm font-semibold hover:opacity-90 transition-opacity"
              >
                Cancel
              </button>
              <button
                onClick={confirmDeleteViewAction}
                className="px-4 py-2 rounded-full background-color-primary-main text-white text-sm font-semibold hover:opacity-90 transition-opacity"
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Status change confirmation modal */}
      {confirmStatus.open && (
        <div className="fixed inset-0 bg-black bg-opacity-40 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-md w-full p-6 space-y-4">
            <div className="space-y-1">
              <h3 className="text-xl font-semibold">
                {confirmStatus.field === 'live' 
                  ? (confirmStatus.newValue ? 'Open for responses?' : 'Close responses?')
                  : (confirmStatus.newValue ? 'Enable editing?' : 'Lock editing?')
                }
              </h3>
              <p className="text-gray-600">
                {confirmStatus.field === 'live' 
                  ? (confirmStatus.newValue 
                      ? 'This will allow participants to submit responses to this survey.'
                      : 'This will prevent new responses from being submitted.')
                  : (confirmStatus.newValue 
                      ? 'This will allow you to edit the survey questions. Note: This may not be possible if responses exist.'
                      : 'This will lock the survey questions from further editing.')
                }
              </p>
              {confirmStatus.title ? <p className="text-gray-800 font-medium">{confirmStatus.title}</p> : null}
              {statusError ? <p className="text-red-600 text-sm">{statusError}</p> : null}
            </div>
            <div className="flex justify-end gap-3">
              <button
                onClick={cancelStatusChange}
                className="px-4 py-2 rounded-full border border-gray-300 text-gray-700 text-sm font-semibold hover:opacity-90 transition-opacity"
              >
                Cancel
              </button>
              <button
                onClick={confirmStatusChange}
                className="px-4 py-2 rounded-full background-color-primary-main text-white text-sm font-semibold hover:opacity-90 transition-opacity"
              >
                Yes, update
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
