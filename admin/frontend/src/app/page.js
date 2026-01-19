'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';

export default function Home() {
  const [surveys, setSurveys] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [confirmDelete, setConfirmDelete] = useState({ open: false, surveyId: null, title: '' });
  const [confirmStatus, setConfirmStatus] = useState({ open: false, surveyId: null, title: '', toLive: null });
  const [statusError, setStatusError] = useState(null);

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
  }, []);

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

  const requestStatusChange = (survey, toLive) => {
    setStatusError(null);
    setConfirmStatus({ open: true, surveyId: survey.surveyId, title: survey.title, toLive });
  };

  const cancelStatusChange = () => {
    setConfirmStatus({ open: false, surveyId: null, title: '', toLive: null });
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
    if (!confirmStatus.surveyId || confirmStatus.toLive === null) return;
    try {
      setStatusError(null);
      await updateSurveyStatus({
        surveyId: confirmStatus.surveyId,
        live: confirmStatus.toLive,
        editing: false,
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

  const liveSurveys = surveys.filter((survey) => survey.live);
  const editingSurveys = surveys.filter((survey) => survey.editing);

  const StatusBadge = ({ survey }) => (
    <button
      type="button"
      onClick={() => requestStatusChange(survey, !survey.live)}
      className={`text-xs font-semibold px-3 py-1 rounded-full border transition-colors cursor-pointer hover:shadow-sm ${
        survey.live
          ? 'text-green-900 bg-green-100 border-green-200 hover:bg-green-200'
          : 'text-orange-800 bg-orange-100 border-orange-200 hover:bg-orange-200'
      }`}
      title={survey.live ? 'Click to set non-live' : 'Click to set live'}
    >
      {survey.live ? 'Live' : 'Non-live'}
    </button>
  );

  return (
    <div className="container mx-auto px-4 py-8 space-y-12">
      <div className="text-center space-y-2">
        <h1 className="text-3xl font-bold">Survey workspace</h1>
        <p className="text-gray-600">Create, review results, and preview the participant view.</p>
      </div>

      <section className="bg-white border border-gray-200 rounded-lg p-6 shadow-sm">
        <h2 className="text-2xl font-semibold mb-2">Create new survey</h2>
        <p className="text-gray-600 mb-4">Start a fresh survey to collect new responses.</p>
        <Link
          href={`/createform`}
          className="inline-flex items-center background-color-primary-main text-white rounded-full px-4 py-2 text-sm font-semibold hover:opacity-90 transition-opacity"
        >
          <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
          </svg>
          Create new survey
        </Link>
      </section>

      <section className="space-y-4">
        <div>
          <h2 className="text-2xl font-semibold">Change question layout</h2>
          <p className="text-gray-600">Edit surveys in draft mode before setting them live.</p>
        </div>
        {editingSurveys.length === 0 ? (
          <div className="text-center py-8 bg-white border border-gray-200 rounded-lg">
            <p className="text-gray-600">All surveys are live. Create a new survey to adjust its layout.</p>
          </div>
        ) : (
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {editingSurveys.map((survey) => (
              <div key={`draft-${survey.surveyId}`} className="group block bg-white border border-gray-200 rounded-lg p-6 hover:shadow-md transition-shadow">
                <div className="flex items-start gap-3 mb-2">
                  <StatusBadge survey={survey} />
                  <button
                    onClick={() => requestDelete(survey)}
                    className="ml-auto opacity-80 hover:opacity-100 transition-opacity cursor-pointer"
                    title="Delete survey"
                  >
                    <img src="/delete.png" alt="Delete" className="h-6 w-6 cursor-pointer" />
                  </button>
                </div>
                <Link href={`/createform?surveyId=${survey.surveyId}`}>
                  <h3 className="text-lg font-semibold mb-2">{survey.title}</h3>
                  <p className="text-gray-600 mb-4">{survey.questions.length} questions</p>
                  <div className="background-color-primary-main rounded-full text-white px-4 py-1 text-sm inline-flex items-center">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 6h16M4 12h10M4 18h7" />
                    </svg>
                    Edit question layout
                  </div>
                </Link>
              </div>
            ))}
          </div>
        )}
      </section>

      <section className="space-y-4">
        <div>
          <h2 className="text-2xl font-semibold">Wait for survey results</h2>
          <p className="text-gray-600">Open the survey via the links below to fill in responses.</p>
        </div>
        {liveSurveys.length === 0 ? (
          <div className="text-center py-8 bg-white border border-gray-200 rounded-lg">
            <p className="text-gray-600">No live surveys yet. Go live from the layout stage to see them here.</p>
          </div>
        ) : (

          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {surveys.map((survey) => (
              <div
                key={`results-${survey.surveyId}`}
                className={`relative group block bg-white border border-gray-200 rounded-lg p-6 transition-shadow ${survey.live ? 'hover:shadow-md' : 'opacity-75'}`}
              >
                {!survey.live && (
                  <div className="pointer-events-none absolute inset-0 rounded-lg bg-white/70 backdrop-blur-sm" />
                )}
                <div className="relative flex flex-col h-full">
                  <div className="flex items-start gap-3 mb-2">
                    <StatusBadge survey={survey} />
                    <button
                      onClick={() => requestDelete(survey)}
                      className="ml-auto opacity-80 hover:opacity-100 transition-opacity cursor-pointer"
                      title="Delete survey"
                    >
                      <img src="/delete.png" alt="Delete" className="h-6 w-6 cursor-pointer" />
                    </button>
                  </div>

                  {survey.live ? (
                    <Link href={`/survey_taking/${survey.surveyId}`} className="block">
                      <h3 className="text-lg font-semibold mb-2">{survey.title}</h3>
                      <p className="text-gray-600 mb-4">{survey.questions.length} questions</p>
                    </Link>
                  ) : (
                    <div className="block">
                      <h3 className="text-lg font-semibold mb-2">{survey.title}</h3>
                      <p className="text-gray-600 mb-4">{survey.questions.length} questions</p>
                    </div>
                  )}

                  {survey.live ? (
                    <Link href={`/survey_taking/${survey.surveyId}`} className="background-color-primary-main rounded-full text-white px-4 py-1 text-sm inline-flex items-center w-fit mt-auto">
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5l7 7-7 7" />
                      </svg>
                      Add survey response
                    </Link>
                  ) : (
                    <button
                      onClick={() => requestStatusChange(survey, true)}
                      className="mt-auto background-color-primary-main text-white px-4 py-2 rounded-full text-sm transition-opacity opacity-0 group-hover:opacity-100"
                    >
                      Change to live
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </section>

      <section className="space-y-4">
        <div>
          <h2 className="text-2xl font-semibold">View and format results</h2>
          <p className="text-gray-600">Open a survey to review submissions and adjust formatting. Non-live surveys are grayed out.</p>
        </div>
        {surveys.length === 0 ? (
          <div className="text-center py-8 bg-white border border-gray-200 rounded-lg">
            <p className="text-gray-600">No surveys yet. Create one to begin.</p>
          </div>
        ) : (
           <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {surveys.map((survey) => (
              <div
                key={`results-${survey.surveyId}`}
                className={`relative group block bg-white border border-gray-200 rounded-lg p-6 transition-shadow hover:shadow-md`}
              >
                <div className="relative flex flex-col h-full">
                  <div className="flex items-start gap-3 mb-2">
                    <StatusBadge survey={survey} />
                    <button
                      onClick={() => requestDelete(survey)}
                      className="ml-auto opacity-80 hover:opacity-100 transition-opacity cursor-pointer"
                      title="Delete survey"
                    >
                      <img src="/delete.png" alt="Delete" className="h-6 w-6 cursor-pointer" />
                    </button>
                  </div>

                  <Link href={`/survey/${survey.surveyId}`} className="block">
                    <h3 className="text-lg font-semibold mb-2">{survey.title}</h3>
                    <p className="text-gray-600 mb-4">{survey.questions.length} questions</p>
                  </Link>

                  <Link href={`/survey/${survey.surveyId}`} className="background-color-primary-main rounded-full text-white px-4 py-1 text-sm inline-flex items-center w-fit mt-auto">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5l7 7-7 7" />
                    </svg>
                    View survey results
                  </Link>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>

      <section className="space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-semibold">Preview</h2>
            <p className="text-gray-600">Jump straight to the participant-facing preview for any survey.</p>
          </div>
        </div>
        {liveSurveys.length === 0 ? (
          <div className="text-center py-8 bg-white border border-gray-200 rounded-lg">
            <p className="text-gray-600">No live surveys are available to preview.</p>
          </div>
        ) : (
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {surveys.map((survey) => (
              <Link
                key={`${survey.surveyId}-preview`}
                href={`/survey/${survey.surveyId}/preview`}
                className="block bg-white border border-gray-200 rounded-lg p-6 hover:shadow-md transition-shadow"
              >
                <h3 className="text-lg font-semibold mb-2">{survey.title}</h3>
                <p className="text-gray-600 mb-4">Preview the participant view.</p>
                <div className="background-color-primary-main rounded-full text-white px-4 py-1 text-sm inline-flex items-center">
                  Preview
                </div>
              </Link>
            ))}
          </div>
        )}
      </section>

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
                className="px-4 py-2 rounded-full border border-gray-300 text-gray-700 hover:bg-gray-100"
              >
                Cancel
              </button>
              <button
                onClick={confirmDeleteSurvey}
                className="px-4 py-2 rounded-full background-color-primary-main text-white hover:opacity-90"
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      )}

      {confirmStatus.open && (
        <div className="fixed inset-0 bg-black bg-opacity-40 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-md w-full p-6 space-y-4">
            <div className="space-y-1">
              <h3 className="text-xl font-semibold">Change live status?</h3>
              <p className="text-gray-600">
                {confirmStatus.toLive ? 'Set this survey live and lock editing?' : 'Set this survey to non-live and reopen editing?'}
              </p>
              {confirmStatus.title ? <p className="text-gray-800 font-medium">{confirmStatus.title}</p> : null}
              {statusError ? <p className="text-red-600 text-sm">{statusError}</p> : null}
            </div>
            <div className="flex justify-end gap-3">
              <button
                onClick={cancelStatusChange}
                className="px-4 py-2 rounded-full border border-gray-300 text-gray-700 hover:bg-gray-100"
              >
                Cancel
              </button>
              <button
                onClick={confirmStatusChange}
                className="px-4 py-2 rounded-full background-color-primary-main text-white hover:opacity-90"
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
