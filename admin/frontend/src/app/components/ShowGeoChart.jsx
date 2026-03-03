import * as React from 'react';
import { Chart } from 'react-google-charts';
import { geoChartRegionForAnswers, REGION_PRESETS, getCountriesForRegion, detectRegionFromAnswers } from '../data/geoRegions';

// Geo chart view for the new region question type.
export default function ShowGeoChart({ question, onTitleChange, onRegionChange, readOnly = false, hideTitle = false, regionFilter }) {
  const [title, setTitle] = React.useState(question.questionText);
  const [isEditing, setIsEditing] = React.useState(false);

  const regionOptions = React.useMemo(
    () => ['world', 'europe', 'africa', 'asia', 'northAmerica', 'southAmerica', 'oceania', 'antarctica'],
    []
  );

  const detectedRegionKey = React.useMemo(() => {
    const detected = detectRegionFromAnswers(question.answers || []);
    return regionOptions.includes(detected) ? detected : 'world';
  }, [question.answers, regionOptions]);

  const initialRegion = React.useMemo(() => {
    // Explicit per-view override takes precedence, then question-level, then detected
    if (regionFilter && regionOptions.includes(regionFilter)) {
      return regionFilter;
    }
    if (question.regionFilter && regionOptions.includes(question.regionFilter)) {
      return question.regionFilter;
    }
    return detectedRegionKey;
  }, [detectedRegionKey, question.regionFilter, regionFilter, regionOptions]);

  const [regionKey, setRegionKey] = React.useState(initialRegion);

  const rows = React.useMemo(() => {
    return (question.answers || []).map((answer) => [
      answer.answerText,
      Number(answer.count) || 0,
    ]);
  }, [question.answers]);

  const allowedCountries = React.useMemo(() => new Set(getCountriesForRegion(regionKey)), [regionKey]);

  const data = React.useMemo(() => {
    const filtered = rows.filter(([country, count]) => count > 0 && allowedCountries.has(country));
    if (filtered.length === 0) {
      return [['Country', 'Responses'], ['', 0]];
    }
    return [['Country', 'Responses'], ...filtered];
  }, [allowedCountries, rows]);

  const chartRegion = React.useMemo(
    () => REGION_PRESETS[regionKey]?.geoChartRegion || geoChartRegionForAnswers(question.answers || []),
    [question.answers, regionKey]
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
    <div className="flex flex-col items-center w-full h-full">
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
      {!readOnly && (
        <div className="w-full flex justify-end mb-2">
            <label className="flex items-center gap-2 text-sm text-gray-700">
              <span>Region filter</span>
              <select
                value={regionKey}
                onChange={(e) => {
                  const next = e.target.value;
                  setRegionKey(next);
                  onRegionChange?.(next);
                }}
                className="border border-gray-300 rounded px-2 py-1"
              >
                {regionOptions.map((key) => (
                  <option key={key} value={key}>
                    {REGION_PRESETS[key]?.label || key}
                  </option>
                ))}
              </select>
            </label>
          </div>
      )}
      <div className={`w-full flex-1 ${hideTitle ? 'min-h-0 h-full' : 'min-h-[300px]'}`}>
        <Chart
          chartType="GeoChart"
          width="100%"
          height="100%"
          data={data}
          options={{
            region: chartRegion,
            legend: 'none',
            colorAxis: { minValue: 0, colors: ['#fce8ec', '#bc0031'] },
            backgroundColor: '#ffffff',
            datalessRegionColor: '#f3f4f6',
          }}
          loader={<div>Loading chart...</div>}
        />
      </div>
    </div>
  );
}
