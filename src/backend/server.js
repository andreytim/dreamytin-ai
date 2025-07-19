const express = require('express');
const cors = require('cors');
const { openai } = require('@ai-sdk/openai');
const { anthropic } = require('@ai-sdk/anthropic');
const { google } = require('@ai-sdk/google');
const { streamText } = require('ai');
const { defaultModel, models } = require('../config/models.json');
const { pricing } = require('../config/pricing.json');
const KnowledgeManager = require('./knowledgeManager');
const fs = require('fs');
const path = require('path');
require('dotenv').config();

const app = express();
const PORT = 3001;

// Load system prompt
function getSystemPrompt() {
  try {
    const promptPath = path.join(__dirname, '../../data/system-prompt.md');
    return fs.readFileSync(promptPath, 'utf8');
  } catch (error) {
    console.error('Error loading system prompt:', error);
    return 'You are a helpful AI assistant. Provide clear, accurate, and concise responses.';
  }
}

// Initialize knowledge manager
const knowledgeManager = new KnowledgeManager();

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
    const baseSystemPrompt = getSystemPrompt();
    
    // Get enhanced system prompt with intelligent context selection
    const systemPrompt = await knowledgeManager.getEnhancedSystemPromptIntelligent(baseSystemPrompt, message);
    
    const result = streamText({
      model: modelProvider,
      system: systemPrompt,
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

// Knowledge system configuration endpoints
app.get('/api/knowledge/config', (_, res) => {
  res.json({
    intelligentSelection: knowledgeManager.enableIntelligentSelection,
    cacheSize: knowledgeManager.selectionCache.size,
    availableFiles: Object.keys(knowledgeManager.knowledgeBase),
    summariesGenerated: Object.keys(knowledgeManager.knowledgeSummaries).length > 0
  });
});

app.post('/api/knowledge/config', (req, res) => {
  const { intelligentSelection } = req.body;
  if (typeof intelligentSelection === 'boolean') {
    knowledgeManager.setIntelligentSelection(intelligentSelection);
  }
  res.json({ success: true });
});

app.post('/api/knowledge/cache/clear', (_, res) => {
  knowledgeManager.clearCache();
  res.json({ success: true, message: 'Cache cleared' });
});

app.post('/api/knowledge/reload', (_, res) => {
  knowledgeManager.reload();
  res.json({ success: true, message: 'Knowledge base reloaded' });
});

// Usage endpoint
app.get('/api/usage', (_, res) => {
  res.json(sessionUsage);
});

// Reset usage endpoint
app.post('/api/usage/reset', (_, res) => {
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