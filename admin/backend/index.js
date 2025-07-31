const express = require('express');
const cors = require('cors');
const fetch = require('node-fetch').default;
const app = express();
const port = process.env.PORT || 3001;

const DOTNET_API_URL = process.env.DOTNET_API_URL || 'http://localhost:5059';

app.use(cors());
app.use(express.json());

function regroupByQuestion(responses) {
  const grouped = {};

  responses.forEach(item => {
    const { questionId, questionText, answerId, answerText, count } = item;

    if (!grouped[questionId]) {
      grouped[questionId] = {
        questionId,
        questionText,
        answers: []
      };
    }

    grouped[questionId].answers.push({ answerId, answerText, count });
  });

  return Object.values(grouped);
}

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

app.get('/api/surveys/:surveyId/answers', async (req, res) => {
  try {
    const { surveyId } = req.params;

    const response = await fetch(
      `${DOTNET_API_URL}/api/surveys/${surveyId}/responseCounts`
    );
    if (!response.ok) {
      throw new Error(`Error fetching counts: ${response.statusText}`);
    }
    
    const counts = await response.json(); 
    transformedData = regroupByQuestion(counts);
    res.json(transformedData);
  } catch (error) {
    console.error('Error fetching survey answers:', error);
    res.status(500).json({ message: 'Failed to fetch survey answers from backend service' });
  }
});

app.post('/api/surveys', async (req, res) => {
  try {
    const response = await fetch(`${DOTNET_API_URL}/api/surveys`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(req.body),
    });
    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Error creating survey: ${response.statusText} - ${errorText}`);
    }
    const data = await response.json();
    res.status(201).json(data);
  } catch (error) {
    console.error('Error creating survey:', error);
    res.status(500).json({ message: 'Failed to create survey in backend service' });
  }
});

app.delete('/api/surveys/delete/:id', async (req, res) => {
  console.log(`Deleting survey with ID: ${req.params.id}`);
  try {
    const response = await fetch(`${DOTNET_API_URL}/api/surveys/delete/${req.params.id}`, {
      method: 'DELETE',
    });

    if (response.status === 404) {
      return res.status(404).json({ message: 'Survey not found' });
    }

    if (!response.ok) {
      throw new Error(`Error deleting survey: ${response.statusText}`);
    }

    res.status(204).send();
  } catch (error) {
    console.error('Error deleting survey:', error);
    res.status(500).json({ message: 'Failed to delete survey in backend service' });
  }
});

app.listen(port, () => {
  console.log(`Backend server running on port ${port}`);
  console.log(`Connected to .NET API at ${DOTNET_API_URL}`);
});
