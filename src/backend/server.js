const express = require('express');
const cors = require('cors');
const { openai } = require('@ai-sdk/openai');
const { generateText } = require('ai');
require('dotenv').config();

const app = express();
const PORT = 3001;

app.use(cors());
app.use(express.json());

// AI chat endpoint
app.post('/api/chat', async (req, res) => {
  try {
    const { message, model = 'gpt-3.5-turbo' } = req.body;
    
    if (!process.env.OPENAI_API_KEY) {
      return res.status(500).json({ error: 'OpenAI API key not configured' });
    }

    const { text } = await generateText({
      model: openai(model),
      prompt: message,
    });
    
    res.json({ 
      response: text,
      model: model 
    });
  } catch (error) {
    console.error('Chat error:', error);
    res.status(500).json({ error: error.message });
  }
});

app.listen(PORT, () => {
  console.log(`Backend server running on port ${PORT}`);
});