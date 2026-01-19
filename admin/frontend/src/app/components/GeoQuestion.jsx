import React, { useEffect, useMemo, useState } from 'react';
import { REGION_PRESETS, getCountriesForRegion } from '../data/geoRegions';

// Builder UI for geo questions. Lets editors pick a region and keeps answer options in sync.
export default function GeoQuestion({
  value,
  onChange,
  region = 'world',
  onRegionChange,
  answers = [],
  onAnswersChange,
  onDelete
}) {
  const [showList, setShowList] = useState(false);

  const countries = useMemo(() => getCountriesForRegion(region), [region]);

  useEffect(() => {
    if (typeof onAnswersChange !== 'function') {
      return;
    }

    if (region === 'custom') {
      return;
    }

    const current = (answers || []).map((a) => a.text || '').filter(Boolean);
    const hasDifference =
      current.length !== countries.length ||
      current.some((name, idx) => name !== countries[idx]);

    if (hasDifference) {
      onAnswersChange(countries.map((name) => ({ text: name, extraText: false })));
    }
  }, [answers, countries, onAnswersChange, region]);

  return (
    <div className="relative group border border-[#CF202E] rounded-lg p-4 bg-[#FFF5F5]">
      <button
        onClick={onDelete}
        className="absolute -left-8 top-4 opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer"
        title="Delete question"
      >
        <img src="/delete.png" alt="Delete" className="h-6 w-6 cursor-pointer" />
      </button>

      <div className="flex flex-col gap-3">
        <div
          contentEditable
          suppressContentEditableWarning
          onBlur={(e) => onChange(e.currentTarget.innerText)}
          className="text-xl font-semibold cursor-text"
        >
          {value}
        </div>

        <label className="flex items-center gap-2 text-sm font-medium text-gray-700">
          <span>Region</span>
          <select
            value={region}
            onChange={(e) => onRegionChange(e.target.value)}
            className="border border-gray-300 rounded px-2 py-1"
          >
            {Object.entries(REGION_PRESETS).map(([key, preset]) => (
              <option key={key} value={key}>
                {preset.label}
              </option>
            ))}
          </select>
        </label>

        <div className="text-sm text-gray-700">
          <p className="font-medium">{countries.length} countries added for {REGION_PRESETS[region]?.label || 'World'}.</p>
          <p className="text-gray-600">Options stay synced to the selected region so results can drive the geo chart.</p>
          <button
            type="button"
            onClick={() => setShowList((prev) => !prev)}
            className="mt-2 text-[#bc0031] hover:text-[#840022] text-xs"
          >
            {showList ? 'Hide sample of countries' : 'Show sample of countries'}
          </button>
          {showList ? (
            <div className="mt-2 max-h-40 overflow-y-auto border border-gray-200 rounded p-2 bg-white text-gray-800">
              {countries.map((name) => (
                <div key={name} className="text-xs py-0.5 border-b border-gray-100 last:border-b-0">
                  {name}
                </div>
              ))}
            </div>
          ) : null}
        </div>
      </div>
    </div>
  );
}
