'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';

export default function Home() {
  const [surveys, setSurveys] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    async function fetchSurveys() {
      try {
        const apiUrl = process.env.DOTNET_API_URL || 'http://localhost:5059';
        const response = await fetch(`${apiUrl}/api/surveys`);

        if (!response.ok) {
          throw new Error('Failed to fetch surveys');
        }

        const data = await response.json();
        setSurveys(data);
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
    <div className="container mx-auto px-4 py-8">
      <h1 className="text-3xl font-bold mb-8 text-center">Available Surveys</h1>

      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        {surveys.length === 0 ? (
          <div className="text-center py-8">
            <p className="text-gray-600">No surveys are currently available.</p>
          </div>
        ) : (
          <>
            {surveys.map((survey) => (
              <div key={survey.surveyId} className="relative group block bg-white border border-gray-200 rounded-lg p-6 hover:shadow-md transition-shadow">
                <Link href={`/survey/${survey.surveyId}`}>
                  <h2 className="mb-2">{survey.title}</h2>
                  <p className="text-gray-600 mb-4">{survey.questions.length} questions</p>
                  <div className="background-color-primary-main rounded-full text-white px-4 py-1 text-sm inline-flex items-center">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5l7 7-7 7" />
                    </svg>
                    View Survey Results
                  </div>
                </Link>
                <button
                  onClick={() => deleteSurvey(survey.surveyId)}
                  className="absolute top-4 right-4 opacity-0 group-hover:opacity-100 transition-opacity"
                  title="Delete survey"
                >
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    className="h-6 w-6 text-red-500 hover:text-red-700"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                    strokeWidth={2}
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      d="M19 7L5 7M9 7V4h6v3m2 0v12a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V7h14z"
                    />
                  </svg>
                </button>
              </div>
            ))}
          </>
        )}
        <Link
          href={`/createform`}
          className="block bg-white border border-gray-200 rounded-lg p-6 hover:shadow-md transition-shadow"
        >
          <h2 className="mb-2">Create New Survey</h2>
          <p className="text-gray-600 mb-4">Add a new survey to the system</p>
          <div className="background-color-primary-main rounded-full text-white px-4 py-1 text-sm inline-flex items-center">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
            </svg>
            Create New Survey
          </div>
        </Link>
      </div>
    </div>
  );
}
