const express = require('express');
const cors = require('cors');
const { openai } = require('@ai-sdk/openai');
const { streamText } = require('ai');
const { defaultModel } = require('../config/modelSettings');
require('dotenv').config();

const app = express();
const PORT = 3001;

app.use(cors());
app.use(express.json());

// AI chat endpoint with streaming
app.post('/api/chat', async (req, res) => {
  try {
    const { message, model = defaultModel } = req.body;
    
    if (!process.env.OPENAI_API_KEY) {
      return res.status(500).json({ error: 'OpenAI API key not configured' });
    }

    res.setHeader('Content-Type', 'text/plain');
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

    const result = streamText({
      model: openai(model),
      prompt: message,
    });

    for await (const textPart of result.textStream) {
      res.write(textPart);
    }
    res.end();
  } catch (error) {
    console.error('Chat error:', error);
    if (!res.headersSent) {
      res.status(500).json({ error: error.message });
    } else {
      res.write('\n\nError: ' + error.message);
      res.end();
    }
  }
});

app.listen(PORT, () => {
  console.log(`Backend server running on port ${PORT}`);
});