'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import FillSurvey from '../../components/FillSurvey';

export default function SurveyPage({ params }) {
  const [survey, setSurvey] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const router = useRouter();

  const { id } = params;

  useEffect(() => {
    async function fetchSurvey() {
      console.log(id)
      try { // Fetches questions from the survey
        const apiUrl = process.env.DOTNET_API_URL || 'http://localhost:5059';
        const response = await fetch(`${apiUrl}/api/surveys/${id}`);

        if (!response.ok) {
          throw new Error('Failed to fetch survey');
        }

        const data = await response.json();
        setSurvey(data);
      } catch (err) {
        console.error('Error fetching survey:', err);
        setError('Failed to load the survey. Please try again later.');
      } finally {
        setLoading(false);
      }
    }

    fetchSurvey();
  }, [id]);

  // Handle submission of each individual answer such that we cannot seperate users
  const uploadAnswerToDatabase = async (questionId, answer) => {
    const apiUrl = process.env.DOTNET_API_URL || 'http://localhost:5059';

    console.log(id)

    // If multiple answers are submitted (multiple choice), upload them all individually, such that we cannot link users
    if (Array.isArray(answer)) {
      const responses = await Promise.all(
        answer.map(async ans => {
          const responseDto = {
            surveyId: id,
            questionId: questionId,
            answerId: ans.answerId,
            additional: ans.extraText || null
          };

          console.log(responseDto)

          console.log('Submitting response to .NET API:', responseDto);

          const response = await fetch(`${apiUrl}/api/responses`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(responseDto),
          });

          if (!response.ok) {
            const text = await response.text();
            throw new Error(`Failed to submit answer: ${response.statusText}\n${text}`);
          }

          return response.json();
        })
      );
      return;
    }

    // only one question submitted
    const responseDto = {
      surveyId: id,
      questionId: questionId,
      answerId: answer.answerId || answer.selectedAnswer?.answerId,
      additional: answer.extraText || answer.selectedAnswer?.extraText || null
    };

    console.log('Submitting response to .NET API:', responseDto);

    const response = await fetch(`${apiUrl}/api/responses`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(responseDto),
    });

    if (!response.ok) {
      throw new Error(`Failed to submit answer: ${response.statusText}`);
    }
  };

  // Handle survey completion, navigates to complete server
  const handleSurveyComplete = (_) => {
    router.push(`/survey/${id}/thanks`);
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
      <div className="min-h-screen flex items-center justify-center">
        <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded">
          <p>{error}</p>
        </div>
      </div>
    );
  }
  
  if (!survey) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="bg-yellow-100 border border-yellow-400 text-yellow-700 px-4 py-3 rounded">
          <p>Survey not found</p>
        </div>
      </div>
    );
  }
  
  return (
    <div className="container mx-auto px-4 py-8">
      <h1 className="mb-6">{survey.title}</h1>
      
      <FillSurvey 
        survey={survey}
        onComplete={handleSurveyComplete}
        uploadAnswerToDatabase={uploadAnswerToDatabase}
      />
    </div>
  );
} 