'use client';

import Link from 'next/link';
import DisplayPlaceholder from '../../../components/DisplayPlaceholder';

export default function ThankYouPage({ params }) {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-4">
      <div className="max-w-md w-full">
        <DisplayPlaceholder
          icon="check"
          title="Thank You!"
          message="Your survey responses have been successfully submitted."
        />
      </div>
    </div>
  );
} 