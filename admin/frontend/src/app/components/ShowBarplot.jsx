import * as React from 'react';
import { Chart } from 'react-google-charts';

/*
Displays one question as a bar plot
*/

const palettes = {
  uva: [
    '#bc0031', '#de8098', '#840022',
    '#A8A29F', '#ebb3c1', '#D7D6D4',
  ],
  funky: [
    '#79c9ff', // vivid blue
    '#ffd85c', // vivid yellow
    '#ff6f61', // vivid red
    '#ffa74d', // vivid orange
    '#6fd1a7', // vivid green
    '#b38cf0', // vivid purple
  ],
};

export default function ShowBarplot({ question, onTitleChange, readOnly = false, colorScheme = 'uva', hideTitle = false, chartFontSize }) {
  const [title, setTitle] = React.useState(question.questionText);
  const [isEditing, setIsEditing] = React.useState(false);
  const colors = palettes[colorScheme] || palettes.uva;
  const fontSize = chartFontSize || 13;

  const barData = [
    ['Answer', 'Responses', { role: 'style' }],
    ...question.answers.map((answer, idx) => [
      answer.answerText,
      Number(answer.count) || 0,
      colors[idx % colors.length],
    ]),
  ];

  const handleDoubleClick = () => {
    setIsEditing(true);
  };

  const handleTitleChange = (e) => {
    setTitle(e.target.value);
  };

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
      <div className={`w-full flex-1 ${hideTitle ? 'min-h-0 h-full' : 'min-h-[300px]'}`}>
        <Chart
          chartType="ColumnChart"
          width="100%"
          height="100%"
          data={barData}
          options={{
            legend: 'none',
            chartArea: { width: '85%', height: '75%' },
            hAxis: { title: '', textStyle: { fontSize } },
            vAxis: { minValue: 0, textStyle: { fontSize } },
            bar: { groupWidth: '70%' },
          }}
          loader={<div>Loading chart...</div>}
        />
      </div>
    </div>
  );
}