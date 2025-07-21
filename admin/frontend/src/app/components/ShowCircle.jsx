import * as React from 'react';
import { PieChart } from '@mui/x-charts/PieChart'
import { ThemeProvider } from '@mui/material/styles';
import uvaTheme from './theme';

export default function ShowCircle({ question }) {
  const pieData = question.answers.map((answer, index) => ({
    id: index,
    value: answer.count,
    label: answer.answerText,
  }));

  const uvaColors = ['#bc0031', '#de8098', '#840022', '#A8A29F', '#ebb3c1', '#D7D6D4'];
  return (
    <div className="flex flex-col items-center">
      <h2 className="mb-4 text-center">
        {question.questionText}
      </h2>
      <ThemeProvider theme={uvaTheme}>
      <PieChart
        series={[{ data: pieData }]}
        width={250}
        height={250}
        colors={uvaColors}
      />
      </ThemeProvider>
    </div>
  );
}
