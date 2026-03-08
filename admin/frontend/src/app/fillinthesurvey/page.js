'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import DisplayPlaceholder from '../components/DisplayPlaceholder';
import { useAuthenticatedFetch } from '../utils/useAuthenticatedFetch';

export default function FillInTheSurveyPage() {
  const fetch = useAuthenticatedFetch();
  const [slotData, setSlotData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const router = useRouter();

  useEffect(() => {
    async function fetchSlot() {
      try {
        const apiUrl = process.env.DOTNET_API_URL || 'http://localhost:5059';
        const response = await fetch(`${apiUrl}/api/displayslots/fillin`);
        
        if (!response.ok) {
          throw new Error('Failed to fetch slot configuration');
        }

        const data = await response.json();
        setSlotData(data);

        // If a survey is assigned, redirect to the survey taking page
        if (data.surveyId) {
          router.push(`/survey_taking/${data.surveyId}`);
        }
      } catch (err) {
        console.error('Error fetching slot:', err);
        setError('Failed to load configuration.');
      } finally {
        setLoading(false);
      }
    }

    fetchSlot();
  }, [router]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  // No survey assigned - show placeholder
  if (!slotData?.surveyId) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center p-4">
        <div className="max-w-md w-full">
          <DisplayPlaceholder
            icon="close"
            title="No Survey Available"
            message="No survey has been assigned to this display yet. Please check back later or contact the administrator."
          />
        </div>
      </div>
    );
  }

  // This shouldn't be reached as we redirect above, but just in case
  return (
    <div className="min-h-screen flex items-center justify-center">
      <p>Redirecting to survey...</p>
    </div>
  );
}
