import * as React from 'react';
import { PieChart } from '@mui/x-charts/PieChart'
import { ThemeProvider } from '@mui/material/styles';
import uvaTheme from './theme';


export default function ShowCircle({ question }) {
  const [title, setTitle] = React.useState(question.questionText);
  const [isEditing, setIsEditing] = React.useState(false);
  const pieData = question.answers.map((answer, index) => ({
    id: index,
    value: answer.count,
    label: answer.answerText,
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


  const uvaColors = ['#bc0031', '#de8098', '#840022', '#A8A29F', '#ebb3c1', '#D7D6D4'];
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
            className="text-2xl font-bold mb-6"
            onDoubleClick={handleDoubleClick}
          >
            {title}
          </h2>
        )}
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
