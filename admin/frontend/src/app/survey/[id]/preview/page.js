'use client';

/*
Read-only preview page for a single survey, using saved view configuration.
Rendered at /survey/[id]/preview
*/

import { useState, useEffect } from 'react';
import { useSearchParams } from 'next/navigation';
import ShowAnswers from '../../../components/ShowAnswers';
import ImageRow from '@/app/components/ImageRow';

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

  useEffect(() => {
    async function fetchSurvey() {
      try {
        const apiUrl = process.env.DOTNET_API_URL || 'http://localhost:5059';
        const [countsRes, viewRes] = await Promise.all([
          fetch(`${apiUrl}/api/surveys/${id}/responseCounts`),
          fetch(`${apiUrl}/api/viewsurveys/${id}`)
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
    <div
      className="min-h-screen flex flex-col w-full px-2 sm:px-3 py-3 overflow-hidden"
      style={funkyStyle}
    >
      <div className="survey-content flex flex-col h-full">
        <div className="flex items-center justify-between mb-4 gap-4">
          <img
            src="/uvalogo.png"
            alt="First logo"
            className="w-32 h-auto object-contain"
          />
          <h1 className="text-4xl font-bold text-center flex-1">{title}</h1>
          <img
            src="/Artboard4.png"
            alt="Second logo"
            className="w-32 h-auto object-contain"
          />
        </div>
        <div className="flex-1 min-h-0 overflow-auto">
          <ShowAnswers
            questions={questions}
            setQuestions={null}
            viewTypes={viewTypes}
            setViewTypes={null}
            readOnly={true}
            colorScheme={colorScheme}
            fillHeight
          />
        </div>
      </div>
    </div>
  );
}
