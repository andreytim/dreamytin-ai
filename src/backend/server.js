const express = require('express');
const cors = require('cors');
const { openai } = require('@ai-sdk/openai');
const { anthropic } = require('@ai-sdk/anthropic');
const { google } = require('@ai-sdk/google');
const { streamText } = require('ai');
const { defaultModel, models } = require('../config/models.json');
const { pricing } = require('../config/pricing.json');
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

// Load knowledge files
function loadKnowledgeBase() {
  const knowledgeDir = path.join(__dirname, '../../data/knowledge');
  const knowledge = {};
  
  try {
    const files = fs.readdirSync(knowledgeDir);
    for (const file of files) {
      if (file.endsWith('.md')) {
        const filePath = path.join(knowledgeDir, file);
        const content = fs.readFileSync(filePath, 'utf8');
        const key = file.replace('.md', '');
        knowledge[key] = content;
      }
    }
  } catch (error) {
    console.error('Error loading knowledge base:', error);
  }
  
  return knowledge;
}

// Determine relevant context based on user message
function getRelevantContext(userMessage, knowledgeBase) {
  const message = userMessage.toLowerCase();
  const relevantContext = [];
  
  // Keywords for different knowledge areas
  const contextMappings = {
    personal_profile_summary: [
      'personal', 'profile', 'background', 'about you', 'who are you',
      'andrey', 'divorce', 'separation', 'marriage', 'relationship',
      'danielle', 'olga', 'family', 'mother', 'father', 'dad',
      'london', 'age', 'birthday', 'depression', 'therapy'
    ],
    work: [
      'work', 'job', 'career', 'meta', 'facebook', 'engineer', 'engineering',
      'metaverse', 'unity', 'game', 'development', 'ai tooling', 'cursor',
      'staff engineer', 'ic7', 'leave', 'vesting', 'november', 'quit'
    ],
    interests: [
      'interests', 'hobbies', 'basketball', 'exercise', 'fitness', 'calisthenics',
      'writing', 'drawing', 'music', 'travel', 'hiking', 'philosophy',
      'world-building', 'creative', 'mastery', 'flow'
    ]
  };
  
  // Check each knowledge file for relevance
  for (const [knowledgeKey, keywords] of Object.entries(contextMappings)) {
    if (knowledgeBase[knowledgeKey]) {
      const hasMatch = keywords.some(keyword => message.includes(keyword));
      if (hasMatch) {
        relevantContext.push({
          source: knowledgeKey,
          content: knowledgeBase[knowledgeKey]
        });
      }
    }
  }
  
  // If no specific matches, include personal profile for general context
  if (relevantContext.length === 0 && knowledgeBase.personal_profile_summary) {
    relevantContext.push({
      source: 'personal_profile_summary',
      content: knowledgeBase.personal_profile_summary
    });
  }
  
  return relevantContext;
}

// Build context-aware system prompt
function buildSystemPrompt(basePrompt, relevantContext) {
  if (relevantContext.length === 0) {
    return basePrompt;
  }
  
  let contextPrompt = basePrompt + '\n\n## Relevant Personal Context\n\n';
  
  for (const context of relevantContext) {
    contextPrompt += `### From ${context.source.replace('_', ' ').toUpperCase()}\n`;
    contextPrompt += context.content + '\n\n';
  }
  
  contextPrompt += 'Use this context to provide more personalized and relevant responses, but only mention personal details when directly relevant to the conversation.\n';
  
  return contextPrompt;
}

app.use(cors());
app.use(express.json());

// Session-based usage tracking
let sessionUsage = {
  totalCost: 0,
  requests: 0,
  startTime: new Date().toISOString()
};

// Load knowledge base once at startup
const knowledgeBase = loadKnowledgeBase();

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
    
    // Get relevant context and build enhanced system prompt
    const relevantContext = getRelevantContext(message, knowledgeBase);
    const systemPrompt = buildSystemPrompt(baseSystemPrompt, relevantContext);
    
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