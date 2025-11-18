import * as React from 'react';
import { BarChart } from '@mui/x-charts/BarChart';
import { ThemeProvider } from '@mui/material/styles';
import uvaTheme from './theme';

/*
Displays one question as a bar plot
*/

export default function ShowBarplot({ question }) {
  const [title, setTitle] = React.useState(question.questionText);
  const [isEditing, setIsEditing] = React.useState(false);
  const barData = question.answers.map((answer) => ({
    category: answer.answerText,
    count: parseInt(answer.count, 10),
  }));

  const handleDoubleClick = () => {
    setIsEditing(true);
  };

  const handleTitleChange = (e) => {
    setTitle(e.target.value);
  };

  const handleBlur = () => {
    setIsEditing(false);
  };

  const uvaColors = [
    '#bc0031', '#de8098', '#840022',
    '#A8A29F', '#ebb3c1', '#D7D6D4',
  ];

  return (
    <div className="flex flex-col items-center">
      {isEditing ? (
          <input
            type="text"
            value={title}
            onChange={handleTitleChange}
            onBlur={handleBlur}
            className="mb-4 text-center font-bold border border-gray-300 rounded px-2 py-1"
          />
        ) : (
          <h2
            className="mb-4 text-center"
            onDoubleClick={handleDoubleClick}
          >
            {title}
          </h2>
        )}
      <ThemeProvider theme={uvaTheme}>
        <BarChart
          width={250}
          height={250}
          dataset={barData}
          xAxis={[
            {
              dataKey: 'category',
              scaleType: 'band',
            },
          ]}

          series={[
            {
              dataKey: 'count',
              label: 'Responses',
            },
          ]}

          colors={uvaColors}
        />
      </ThemeProvider>
    </div>
  );
}