'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import ShowAnswers from '../../components/ShowAnswers';
import ImageRow from '@/app/components/ImageRow';
import jsPDF from 'jspdf';
import html2canvas from 'html2canvas-pro';

export default function SurveyPage({ params }) {
  const [survey, setSurvey] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [title, setTitle] = useState('Answers of poll week #20:');
  const [isEditing, setIsEditing] = useState(false);
  const router = useRouter();

  const dev = true
  
  const { id } = params;
  
  useEffect(() => {
    async function fetchSurvey() {
      try {
        const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3002';
        const response = await fetch(`${apiUrl}/api/surveys/${id}/answers`);
        console.log(response);
        if (!response.ok) {
          throw new Error('Failed to fetch survey');
        }
        const data = await response.json();
        setSurvey(data);

        console.log(data);
      } catch (err) {
        if (dev) {
          console.warn('Fetch failed, loading local testanswer.json as fallback');
          try {
              const localData = await fetch('/testanswer.json');
              const json = await localData.json();
              setSurvey(json);
            } catch (jsonErr) {
              console.error('Error loading local testanswer.json:', jsonErr);
              setError('Failed to load fallback survey data.');
          }
        } else {
          console.error('Error fetching survey:', err);
          setError('Failed to load the survey. Please try again later.');
        }
      } finally {
        setLoading(false);
      }
    }
    
    fetchSurvey();
  }, [id]);

  const handleDoubleClick = () => {
    setIsEditing(true);
  };

  const handleTitleChange = (e) => {
    setTitle(e.target.value);
  };

  const handleBlur = () => {
    setIsEditing(false);
  };

  const handleDownloadPDF = async () => {
    const element = document.querySelector('.survey-content');
    const canvas = await html2canvas(element, {
      ignoreElements: (el) =>
        el.tagName === 'SELECT' || el.classList.contains('invisible_select'),
    });

    const imgData = canvas.toDataURL('image/png');
    const pdf = new jsPDF();
    const imgWidth = pdf.internal.pageSize.getWidth();
    const imgHeight = (canvas.height * imgWidth) / canvas.width;
    pdf.addImage(imgData, 'PNG', 0, 0, imgWidth, imgHeight);
    pdf.save('survey.pdf');
  };

  if (loading) {
    return (
      <div className="flex h-screen justify-center flex-col flex-center align-center w-full px-4 py-8">
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
    <div className="flex flex-col justify-center w-full mx-auto px-4 py-8">
      <button
        onClick={handleDownloadPDF}
        className="absolute top-4 right-4 px-5 py-2
              rounded-full 
              background-color-primary-main 
              text-white 
              transition-colors duration-200 
              hover:background-color-primary-dark"
      >
        Download as PDF
      </button>
      <div className="survey-content">
        {isEditing ? (
          <input
            type="text"
            value={title}
            onChange={handleTitleChange}
            onBlur={handleBlur}
            className="text-4xl font-bold mb-6 border border-gray-300 rounded px-2 py-1 text-center"
          />
        ) : (
          <h1
            className="text-4xl font-bold mb-6 text-center"
            onDoubleClick={handleDoubleClick}
          >
            {title}
          </h1>
        )}
        <ShowAnswers survey={survey} />
        <ImageRow />
      </div>
    </div>
  );
}