import * as React from 'react';
import { BarChart } from '@mui/x-charts/BarChart';
import { ThemeProvider } from '@mui/material/styles';
import uvaTheme from './theme';

export default function ShowBarplot({ question }) {
  const barData = question.answers.map((answer) => ({
    category: answer.answerText,
    count: parseInt(answer.count, 10),
  }));

  const uvaColors = [
    '#bc0031', '#de8098', '#840022',
    '#A8A29F', '#ebb3c1', '#D7D6D4',
  ];

  return (
    <div className="flex flex-col items-center">
      <h2 className="mb-4 text-center">{question.questionText}</h2>
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