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

// In-memory conversation storage (maps session ID to conversation history)
const conversations = new Map();

function estimateTokens(text) {
  return Math.ceil(text.length / 4);
}

function truncateConversation(messages, maxTokens, modelKey) {
  const modelConfig = models[modelKey];
  const contextLimit = modelConfig?.maxTokens || 200000;
  
  let totalTokens = 0;
  const result = [];
  
  // Add messages from newest to oldest until we hit the limit
  for (let i = messages.length - 1; i >= 0; i--) {
    const messageTokens = estimateTokens(messages[i].content);
    if (totalTokens + messageTokens > contextLimit * 0.8) { // Use 80% of limit for safety
      break;
    }
    totalTokens += messageTokens;
    result.unshift(messages[i]);
  }
  
  return result;
}


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
    const { message, model = defaultModel, useFullContext = false, sessionId = 'default', messages = [] } = req.body;
    
    res.setHeader('Content-Type', 'text/plain');
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

    // Get or create conversation history
    let conversation = conversations.get(sessionId) || [];
    
    // Add new user message
    conversation.push({ role: 'user', content: message });
    
    // Truncate conversation if needed
    conversation = truncateConversation(conversation, undefined, model);
    
    // Store updated conversation
    conversations.set(sessionId, conversation);

    const modelProvider = getModelProvider(model);
    const baseSystemPrompt = getSystemPrompt();
    
    let systemPrompt;
    const isFirstMessage = conversation.length === 1; // Only the user message we just added
    
    if (useFullContext) {
      if (isFirstMessage) {
        // Inject full knowledge only on first message when toggle is enabled
        const allContext = Object.keys(knowledgeManager.knowledgeBase).map(key => ({
          source: key,
          content: knowledgeManager.knowledgeBase[key]
        }));
        systemPrompt = knowledgeManager.buildSystemPrompt(baseSystemPrompt, allContext);
        console.log('📚 Full knowledge injected on first message');
      } else {
        // Use base prompt only - rely on conversation memory
        systemPrompt = baseSystemPrompt;
        console.log('📚 Using base prompt (knowledge in conversation memory)');
      }
    } else {
      // Use intelligent context selection
      systemPrompt = await knowledgeManager.getEnhancedSystemPromptIntelligent(baseSystemPrompt, message);
      console.log('🧠 Using intelligent context selection');
    }
    
    const result = streamText({
      model: modelProvider,
      system: systemPrompt,
      messages: conversation.map(msg => ({ role: msg.role, content: msg.content }))
    });

    let assistantResponse = '';
    for await (const textPart of result.textStream) {
      assistantResponse += textPart;
      res.write(textPart);
    }
    res.end();
    
    // Add assistant response to conversation history
    conversation.push({ role: 'assistant', content: assistantResponse });
    conversations.set(sessionId, conversation);
    
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
app.get('/api/knowledge/config', async (_, res) => {
  try {
    // Generate summaries if they don't exist
    const summaries = await knowledgeManager.generateKnowledgeSummaries();
    
    res.json({
      intelligentSelection: knowledgeManager.enableIntelligentSelection,
      cacheSize: knowledgeManager.selectionCache.size,
      availableFiles: Object.keys(knowledgeManager.knowledgeBase),
      summariesGenerated: Object.keys(knowledgeManager.knowledgeSummaries).length > 0,
      summaries: summaries
    });
  } catch (error) {
    console.error('Error getting knowledge config:', error);
    res.json({
      intelligentSelection: knowledgeManager.enableIntelligentSelection,
      cacheSize: knowledgeManager.selectionCache.size,
      availableFiles: Object.keys(knowledgeManager.knowledgeBase),
      summariesGenerated: false,
      summaries: {},
      error: error.message
    });
  }
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

// Context size endpoint  
app.get('/api/context/:sessionId', (req, res) => {
  const { sessionId } = req.params;
  const { useFullContext } = req.query;
  const conversation = conversations.get(sessionId) || [];
  
  // Calculate conversation tokens
  const userTokens = conversation
    .filter(msg => msg.role === 'user')
    .reduce((total, msg) => total + estimateTokens(msg.content), 0);
  
  const outputTokens = conversation
    .filter(msg => msg.role === 'assistant')
    .reduce((total, msg) => total + estimateTokens(msg.content), 0);
  
  // Estimate system prompt + knowledge tokens (input overhead)
  const baseSystemPrompt = getSystemPrompt();
  let systemTokens = estimateTokens(baseSystemPrompt);
  
  // Add knowledge tokens if Full Context is enabled and it's not empty conversation
  if (useFullContext === 'true' && conversation.length > 0) {
    const allKnowledge = Object.values(knowledgeManager.knowledgeBase).join('\n');
    systemTokens += estimateTokens(allKnowledge);
  }
  
  const inputTokens = userTokens + systemTokens;
  
  res.json({
    sessionId,
    messageCount: conversation.length,
    tokenCount: inputTokens + outputTokens, // Total for backward compatibility
    inputTokens,
    outputTokens,
    systemTokens // For debugging
  });
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