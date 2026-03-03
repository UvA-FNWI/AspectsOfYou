'use client';

import Link from 'next/link';
import DisplayPlaceholder from '../../../components/DisplayPlaceholder';

export default function ThankYouPage({ params }) {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-4">
      <div className="max-w-md w-full">
        <DisplayPlaceholder
          icon="close"
          title="The current survey is unavailable!"
          message="Currently, this survey is not taking any responses. If you think this is a mistake, please contact your local administrator."
        />
      </div>
    </div>
  );
} 