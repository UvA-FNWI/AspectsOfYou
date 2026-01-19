import * as React from 'react';
import { Chart } from 'react-google-charts';
import { geoChartRegionForAnswers } from '../data/geoRegions';

// Geo chart view for the new region question type.
export default function ShowGeoChart({ question, onTitleChange, readOnly = false, hideTitle = false }) {
  const [title, setTitle] = React.useState(question.questionText);
  const [isEditing, setIsEditing] = React.useState(false);

  const rows = React.useMemo(() => {
    return (question.answers || []).map((answer) => [
      answer.answerText,
      Number(answer.count) || 0,
    ]);
  }, [question.answers]);

  const data = React.useMemo(() => {
    const filtered = rows.filter((row) => row[1] > 0);
    if (filtered.length === 0) {
      return [['Country', 'Responses'], ['', 0]];
    }
    return [['Country', 'Responses'], ...filtered];
  }, [rows]);

  const region = React.useMemo(
    () => geoChartRegionForAnswers(question.answers || []),
    [question.answers]
  );

  const handleDoubleClick = () => setIsEditing(true);
  const handleTitleChange = (e) => setTitle(e.target.value);
  const handleBlur = () => {
    if (onTitleChange) {
      onTitleChange(question.questionId, title);
    }
    setIsEditing(false);
  };

  return (
    <div className="flex flex-col items-center w-full">
      {!hideTitle && (
        readOnly ? (
          <h2 className="text-2xl font-bold mb-4 text-center">{question.questionText}</h2>
        ) : isEditing ? (
          <input
            type="text"
            value={title}
            onChange={handleTitleChange}
            onBlur={handleBlur}
            className="mb-4 text-center font-bold text-2xl border border-gray-300 rounded px-2 py-1"
          />
        ) : (
          <h2
            className="text-2xl font-bold mb-4 text-center"
            onDoubleClick={handleDoubleClick}
          >
            {title}
          </h2>
        )
      )}
      <div className="w-full min-h-[400px] h-[50vh]">
        <Chart
          chartType="GeoChart"
          width="100%"
          height="100%"
          data={data}
          options={{
            region,
            legend: 'none',
            colorAxis: { colors: ['#e0f2ff', '#90c2ff', '#2563eb'] },
            backgroundColor: '#ffffff',
            datalessRegionColor: '#f3f4f6',
          }}
          loader={<div>Loading chart...</div>}
        />
      </div>
    </div>
  );
}
