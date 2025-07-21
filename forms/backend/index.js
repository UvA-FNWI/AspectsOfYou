const express = require('express');
const cors = require('cors');
const fetch = require('node-fetch');
const app = express();
const port = process.env.PORT || 3001;

const DOTNET_API_URL = process.env.DOTNET_API_URL || 'http://localhost:5059';

app.use(cors());
app.use(express.json());

app.get('/api/surveys', async (req, res) => {
  try {
    const response = await fetch(`${DOTNET_API_URL}/api/surveys`);
    
    if (!response.ok) {
      throw new Error(`Error fetching surveys: ${response.statusText}`);
    }
    
    const data = await response.json();
    res.json(data);
  } catch (error) {
    console.error('Error fetching surveys:', error);
    res.status(500).json({ message: 'Failed to fetch surveys from backend service' });
  }
});

app.get('/api/surveys/:id', async (req, res) => {
  try {
    const response = await fetch(`${DOTNET_API_URL}/api/surveys/${req.params.id}`);
    
    if (response.status === 404) {
      return res.status(404).json({ message: 'Survey not found' });
    }
    
    if (!response.ok) {
      throw new Error(`Error fetching survey: ${response.statusText}`);
    }
    
    const data = await response.json();
    res.json(data);
  } catch (error) {
    console.error('Error fetching survey:', error);
    res.status(500).json({ message: 'Failed to fetch survey from backend service' });
  }
});

app.post('/api/answers', async (req, res) => {
  const { surveyId, questionId, answer } = req.body;
  console.log('Received body:', req.body);
  if (!surveyId || !questionId || !answer) {
    return res.status(400).json({ message: 'Missing required fields' });
  }
  
  try {
    if (Array.isArray(answer)) {
      const responses = await Promise.all(
        answer.map(async ans => {
          const responseDto = {
            surveyId,
            questionId,
            answerId: ans.answerId,
            additional: ans.extraText || null
          };
    
          console.log('Submitting response to .NET API:', responseDto);
    
          const response = await fetch(`${DOTNET_API_URL}/api/responses`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(responseDto),
          });
    
          if (!response.ok) {
            const text = await response.text();
            throw new Error(`Failed to submit answer: ${response.statusText}\n${text}`);
          }
    
          return response.json();
        })
      );
    
      res.status(201).json({
        surveyId,
        questionId,
        answers: answer,
        responses,
        timestamp: new Date()
      });
    
      return;
    }
    const responseDto = {
      surveyId: surveyId,
      questionId: questionId,
      answerId: answer.answerId || answer.selectedAnswer?.answerId,
      additional: answer.extraText || answer.selectedAnswer?.extraText || null
    };
    const response = await fetch(`${DOTNET_API_URL}/api/responses`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(responseDto),
    });
    
    if (!response.ok) {
      throw new Error(`Failed to submit answer: ${response.statusText}`);
    }
    
    const data = await response.json();
    
    res.status(201).json({
      id: data,
      surveyId,
      questionId,
      answer,
      timestamp: new Date()
    });
  } catch (error) {
    console.error('Error submitting answer:', error);
    res.status(500).json({ message: 'Failed to submit answer to backend service' });
  }
});

app.get('/api/surveys/:surveyId/answers', async (req, res) => {
  try {
    const response = await fetch(`${DOTNET_API_URL}/api/surveys/${req.params.surveyId}/responses`);
    
    if (!response.ok) {
      throw new Error(`Error fetching answers: ${response.statusText}`);
    }
    
    const data = await response.json();
    
    const transformedData = data.map(item => ({
      id: item.responseId,
      surveyId: item.surveyId,
      questionId: item.questionId,
      answer: {
        answerId: item.answerId,
        extraText: item.additional
      },
      timestamp: item.date
    }));
    
    res.json(transformedData);
  } catch (error) {
    console.error('Error fetching survey answers:', error);
    res.status(500).json({ message: 'Failed to fetch survey answers from backend service' });
  }
});

app.listen(port, () => {
  console.log(`Backend server running on port ${port}`);
  console.log(`Connected to .NET API at ${DOTNET_API_URL}`);
});
