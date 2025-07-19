const express = require('express');
const cors = require('cors');
const { openai } = require('@ai-sdk/openai');
const { anthropic } = require('@ai-sdk/anthropic');
const { google } = require('@ai-sdk/google');
const { streamText } = require('ai');
const { defaultModel, models } = require('../config/models.json');
const { pricing } = require('../config/pricing.json');
require('dotenv').config();

const app = express();
const PORT = 3001;

app.use(cors());
app.use(express.json());

// Session-based usage tracking
let sessionUsage = {
  totalCost: 0,
  requests: 0,
  startTime: new Date().toISOString()
};

// Get the appropriate AI provider for a model
function getModelProvider(modelKey) {
  const modelConfig = models[modelKey];
  if (!modelConfig) {
    throw new Error(`Unknown model: ${modelKey}`);
  }
  
  switch (modelConfig.provider) {
    case 'openai':
      if (!process.env.OPENAI_API_KEY) {
        throw new Error('OpenAI API key not configured');
      }
      return openai(modelConfig.name);
    case 'anthropic':
      if (!process.env.ANTHROPIC_API_KEY) {
        throw new Error('Anthropic API key not configured');
      }
      return anthropic(modelConfig.name);
    case 'google':
      if (!process.env.GOOGLE_GENERATIVE_AI_API_KEY) {
        throw new Error('Google API key not configured');
      }
      return google(modelConfig.name);
    default:
      throw new Error(`Unknown provider: ${modelConfig.provider}`);
  }
}

// AI chat endpoint with streaming
app.post('/api/chat', async (req, res) => {
  try {
    const { message, model = defaultModel } = req.body;
    
    res.setHeader('Content-Type', 'text/plain');
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

    const modelProvider = getModelProvider(model);
    const result = streamText({
      model: modelProvider,
      prompt: message,
    });

    for await (const textPart of result.textStream) {
      res.write(textPart);
    }
    res.end();
    
    // Calculate cost after streaming is complete
    try {
      const usage = await result.usage;
      if (usage && pricing[model]) {
        const modelPricing = pricing[model];
        const cost = (usage.promptTokens * modelPricing.input / 1000) + 
                     (usage.completionTokens * modelPricing.output / 1000);
        
        sessionUsage.totalCost += cost;
        sessionUsage.requests += 1;
      }
    } catch (usageError) {
      console.error('Error calculating usage:', usageError);
    }
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

// Usage endpoint
app.get('/api/usage', (req, res) => {
  res.json(sessionUsage);
});

// Reset usage endpoint
app.post('/api/usage/reset', (req, res) => {
  sessionUsage = {
    totalCost: 0,
    requests: 0,
    startTime: new Date().toISOString()
  };
  res.json(sessionUsage);
});

app.listen(PORT, () => {
  console.log(`Backend server running on port ${PORT}`);
});