'use client';

import Link from 'next/link';

export default function ThankYouPage({ params }) {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-4">
      <div className="background-color-primary-lighter border-color-primary-main border rounded-lg p-8 max-w-md w-full text-center shadow-lg">
        <div className="w-16 h-16 background-color-primary-main mx-auto rounded-full flex items-center justify-center mb-4">
          <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8 text-color-primary-dark" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" />
          </svg>
        </div>
        
        <h1 className="text-2xl font-bold text-gray-800 mb-2">Thank You!</h1>
        <p className="text-gray-600 mb-6">Your survey responses have been successfully submitted.</p>
      </div>
    </div>
  );
} 