'use client';

import Link from 'next/link';

export default function ThankYouPage({ params }) {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-4">
      <div className="background-color-primary-lighter border-color-primary-main border rounded-lg p-8 max-w-md w-full text-center shadow-lg">
        <div className="w-16 h-16 background-color-primary-main mx-auto rounded-full flex items-center justify-center mb-4">
          <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8 text-color-primary-dark" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
          </svg>
        </div>
        
        <h1 className="text-2xl font-bold text-gray-800 mb-2">The current survey is unavailable!</h1>
        <p className="text-gray-600 mb-6">Currently, this survey is not taking any responses. If you think this is a mistake, please contact your local administrator.</p>
      </div>
    </div>
  );
} 