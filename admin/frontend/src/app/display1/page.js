'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import DisplayPlaceholder from '../components/DisplayPlaceholder';

export default function Display1Page() {
  const [slotData, setSlotData] = useState(null);
  const [loading, setLoading] = useState(true);
  const router = useRouter();
  const slotName = 'display1';

  useEffect(() => {
    async function fetchSlot() {
      try {
        const apiUrl = process.env.DOTNET_API_URL || 'http://localhost:5059';
        const response = await fetch(`${apiUrl}/api/displayslots/${slotName}`);
        
        if (!response.ok) {
          throw new Error('Failed to fetch slot configuration');
        }

        const data = await response.json();
        setSlotData(data);

        // If a survey and view are assigned, redirect to the preview page
        if (data.surveyId && data.viewId) {
          router.push(`/survey/${data.surveyId}/preview?viewId=${data.viewId}`);
        }
      } catch (err) {
        console.error('Error fetching slot:', err);
      } finally {
        setLoading(false);
      }
    }

    fetchSlot();
  }, [router]);

  if (loading) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center p-4">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-400"></div>
      </div>
    );
  }

  // No visualization assigned - show UvA-styled placeholder
  if (!slotData?.surveyId) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center p-4">
        <div className="max-w-md w-full">
          <DisplayPlaceholder
            icon="close"
            title="No visualization assigned"
            message="No visualization has been assigned to Display 1. Use the admin workspace to send a survey view to this display."
          />
        </div>
      </div>
    );
  }

  // This shouldn't be reached as we redirect above, but just in case
  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-4">
      <p className="text-gray-800">Redirecting to visualization...</p>
    </div>
  );
}
