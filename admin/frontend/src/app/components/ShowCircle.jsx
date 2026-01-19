import * as React from 'react';
import { Chart } from 'react-google-charts';

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
/*
Displays one question as a circle plot
*/

export default function ShowCircle({ question, onTitleChange, readOnly = false, colorScheme = 'uva', hideTitle = false }) {
  const [title, setTitle] = React.useState(question.questionText);
  const [isEditing, setIsEditing] = React.useState(false);
  const pieData = [
    ['Answer', 'Responses'],
    ...question.answers.map((answer) => [
      answer.answerText,
      Number(answer.count) || 0,
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

  const colors = palettes[colorScheme] || palettes.uva;
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
          chartType="PieChart"
          width="100%"
          height="100%"
          data={pieData}
          options={{
            legend: { position: 'bottom', alignment: 'center', textStyle: { fontSize: 13 } },
            colors,
            pieSliceText: "label",
            sliceVisibilityThreshold: 0.05, // 5%
            pieHole: 0,
            chartArea: { width: '85%', height: '75%' },
          }}
          loader={<div>Loading chart...</div>}
        />
      </div>
    </div>
  );
}
