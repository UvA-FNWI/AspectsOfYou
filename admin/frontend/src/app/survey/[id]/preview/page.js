'use client';

/*
Read-only preview page for a single survey, using saved view configuration.
Rendered at /survey/[id]/preview
*/

import { useState, useEffect } from 'react';
import { useSearchParams } from 'next/navigation';
import ShowAnswers from '../../../components/ShowAnswers';
import ImageRow from '@/app/components/ImageRow';
import { useAuthenticatedFetch } from '../../../utils/useAuthenticatedFetch';

// Hook to track lg breakpoint (1024px)
function useIsDesktop() {
  const [isDesktop, setIsDesktop] = useState(false);
  useEffect(() => {
    const check = () => setIsDesktop(window.innerWidth >= 1024);
    check();
    window.addEventListener('resize', check);
    return () => window.removeEventListener('resize', check);
  }, []);
  return isDesktop;
}

function regroupByQuestion(responses) {
  const grouped = {};

  responses.forEach((item) => {
    const { questionId, questionText, questionType, answerId, answerText, count } = item;

    if (!grouped[questionId]) {
      grouped[questionId] = {
        questionId,
        questionText,
        questionType,
        answers: []
      };
    }

    grouped[questionId].answers.push({ answerId, answerText, count });
  });

  return Object.values(grouped);
}

export default function SurveyPreviewPage({ params }) {
  const fetch = useAuthenticatedFetch();
  const [questions, setQuestions] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [viewTypes, setViewTypes] = useState({});
  const [colorScheme, setColorScheme] = useState('uva');
  const [funkyBgEnabled, setFunkyBgEnabled] = useState(false);
  const [funkyFontEnabled, setFunkyFontEnabled] = useState(false);
  const searchParams = useSearchParams();
  const isDesktop = useIsDesktop();

  // Apply explicit preview overrides from the query string immediately
  useEffect(() => {
    if (!searchParams) return;
    const paletteParam = searchParams.get('palette');
    if (paletteParam === 'funky' || paletteParam === 'uva') {
      setColorScheme(paletteParam);
    }
    const bgParam = searchParams.get('funky');
    if (bgParam === '1' || bgParam === 'true') {
      setFunkyBgEnabled(true);
    }
    const fontParam = searchParams.get('font');
    if (fontParam === '1' || fontParam === 'true') {
      setFunkyFontEnabled(true);
    }
  }, [searchParams]);

  const { id } = params;
  const viewId = searchParams?.get('viewId');

  useEffect(() => {
    async function fetchSurvey() {
      try {
        const apiUrl = process.env.DOTNET_API_URL || 'http://localhost:5059';
        // If viewId is provided, fetch that specific view, otherwise get the default view
        const viewUrl = viewId 
          ? `${apiUrl}/api/viewsurveys/${id}/view/${viewId}`
          : `${apiUrl}/api/viewsurveys/${id}`;
        const [countsRes, viewRes] = await Promise.all([
          fetch(`${apiUrl}/api/surveys/${id}/responseCounts`),
          fetch(viewUrl)
        ]);

        const counts = await countsRes.json();
        if (!countsRes.ok) {
          throw new Error('Failed to fetch survey response counts');
        }

        const groupedCounts = regroupByQuestion(counts);

        let viewConfig = null;
        if (viewRes.ok) {
          viewConfig = await viewRes.json();
        }

        const hasPaletteOverride = searchParams?.has('palette');
        const hasBgOverride = searchParams?.has('funky');
        const hasFontOverride = searchParams?.has('font');

        if (viewConfig) {
          setTitle(viewConfig.title || '');
          setDescription(viewConfig.description || '');
          if (!hasBgOverride) setFunkyBgEnabled(!!viewConfig.funkyBackground);
          if (!hasPaletteOverride) setColorScheme(viewConfig.funkyColors ? 'funky' : 'uva');
          if (!hasFontOverride) setFunkyFontEnabled(!!viewConfig.funkyFont);
        }

        const viewQuestionsById = new Map();
        if (viewConfig && Array.isArray(viewConfig.questions)) {
          viewConfig.questions.forEach((vq) => {
            viewQuestionsById.set(vq.questionId, vq);
          });
        }

        const initialViewTypes = {};
        const mergedQuestions = groupedCounts.map((q) => {
          const vq = viewQuestionsById.get(q.questionId);

          const questionType = typeof q.questionType === 'number' ? q.questionType : 0;

          const questionTitle = vq?.title || q.questionText;
          const orderingId = typeof vq?.orderingId === 'number' ? vq.orderingId : null;
          const regionFilter = vq?.regionFilter || null;

          const viewTypeListRaw = Array.isArray(vq?.viewTypes) ? vq.viewTypes : [];
          const viewTypesForQuestion = (viewTypeListRaw.length > 0 ? viewTypeListRaw : [questionType === 3 ? 'geochart' : 'circle'])
            .map((vt) => (vt === 'circleplot' ? 'circle' : vt))
            .slice(0, 3);
          if (vq?.isExcludedFromView) {
            // honor exclusion by keeping list but filtered out downstream
          }
          initialViewTypes[q.questionId] = viewTypesForQuestion;

          const answersWithViewTitles = q.answers.map((a) => {
            const viewAnswer = vq?.answers?.find((va) => va.answerId === a.answerId);
            return {
              ...a,
              answerText: viewAnswer?.title || a.answerText
            };
          });

          return {
            ...q,
            questionText: questionTitle,
            questionType,
            orderingId,
            isExcludedFromView: !!vq?.isExcludedFromView,
            regionFilter,
            viewTypes: viewTypesForQuestion,
            answers: answersWithViewTitles
          };
        });

        mergedQuestions.sort((a, b) => {
          const aOrder = typeof a.orderingId === 'number' ? a.orderingId : Number.MAX_SAFE_INTEGER;
          const bOrder = typeof b.orderingId === 'number' ? b.orderingId : Number.MAX_SAFE_INTEGER;
          return aOrder - bOrder;
        });
        setQuestions(mergedQuestions);
        setViewTypes(initialViewTypes);
        setLoading(false);
      } catch (err) {
        setError(err.message);
        setLoading(false);
      }
    }
    fetchSurvey();
  }, [id, searchParams]);

  if (loading) {
    return (
      <div className="flex h-screen justify-center flex-col items-center w-full px-4 py-8">
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

  if (!questions) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="bg-yellow-100 border border-yellow-400 text-yellow-700 px-4 py-3 rounded">
          <p>Survey not found</p>
        </div>
      </div>
    );
  }

  const funkyStyle = {
    ...(funkyBgEnabled ? {
      background: 'repeating-linear-gradient(45deg, #E0D4F7 0% 10%, #D6EAF8 10% 20%, #D4EFDF 20% 30%, #FCF3CF 30% 40%, #FAD7A0 40% 50%, #F5B7B1 50% 60%)'
    } : {}),
    ...(funkyFontEnabled ? {
      fontFamily: 'Arial, sans-serif'
    } : {})
  };

  return (
    <div className="min-h-screen lg:h-screen flex flex-col w-full lg:overflow-hidden" style={funkyStyle}>

      {/* UvA red header — logo only, scales with viewport on desktop */}
      <header
        className="flex-shrink-0 flex items-center px-4 py-3"
        style={{ backgroundColor: '#bc0031', paddingTop: 'clamp(0.5rem, 1vh, 1.25rem)', paddingBottom: 'clamp(0.5rem, 1vh, 1.25rem)' }}
      >
        <img src="/uvalogo.png" alt="UvA" className="w-auto object-contain" style={{ height: 'clamp(2rem, 3vh, 3.5rem)' }} />
      </header>

      {/* Main white content area */}
      <main className={`flex-1 min-h-0 relative flex flex-col items-center px-2 sm:px-3 py-4 lg:py-2 ${isDesktop ? 'justify-center overflow-hidden' : 'overflow-auto'}`}>
        {/* Aspects-of-You logo: absolute on desktop, in-flow on mobile */}
        {isDesktop && (
          <img
            src="/Artboard4.png"
            alt="Aspects of You"
            className="absolute bottom-4 right-4 h-auto object-contain pointer-events-none z-10"
            style={{ width: 'clamp(5rem, 6vw, 8rem)' }}
          />
        )}

        {/* Title */}
        <h1
          className="font-bold text-center mb-2 flex-shrink-0"
          style={{ fontSize: 'clamp(1.5rem, 3vw, 3.5rem)' }}
        >{title}</h1>

        {/* Plots container */}
        <div className={`w-full ${isDesktop ? 'lg:h-2/3 lg:flex-shrink-0' : ''}`}>
          <ShowAnswers
            questions={questions}
            setQuestions={null}
            viewTypes={viewTypes}
            setViewTypes={null}
            readOnly={true}
            colorScheme={colorScheme}
            fillHeight={isDesktop}
          />
        </div>

        {/* Aspects-of-You logo: in-flow on mobile, below plots */}
        {!isDesktop && (
          <div className="w-full flex justify-end mt-4 mb-2 px-4">
            <img
              src="/Artboard4.png"
              alt="Aspects of You"
              className="h-auto object-contain"
              style={{ width: '5rem' }}
            />
          </div>
        )}
      </main>

      {/* Dark gray footer — scales with viewport on desktop */}
      <footer
        className="flex-shrink-0 flex items-center justify-center px-4"
        style={{ backgroundColor: '#374151', paddingTop: 'clamp(0.5rem, 1vh, 1.25rem)', paddingBottom: 'clamp(0.5rem, 1vh, 1.25rem)' }}
      >
        <span style={{ color: '#9ca3af', fontSize: 'clamp(0.75rem, 1vw, 1.1rem)' }}>Aspects-of-You survey</span>
      </footer>

    </div>
  );
}
