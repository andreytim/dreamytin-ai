const fs = require('fs');
const path = require('path');
const { anthropic } = require('@ai-sdk/anthropic');
const { generateText } = require('ai');

class KnowledgeManager {
  constructor(knowledgeDir = null) {
    this.knowledgeDir = knowledgeDir || path.join(__dirname, '../../data/knowledge');
    this.knowledgeBase = {};
    this.knowledgeSummaries = {};
    this.selectionCache = new Map();
    this.enableIntelligentSelection = true;
    this.contextMappings = {
      personal: [
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
    
    // Automatically load knowledge base on construction
    this.loadKnowledgeBase();
  }

  /**
   * Load all markdown files from the knowledge directory
   * @returns {Object} Knowledge base with file keys and content values
   */
  loadKnowledgeBase() {
    const knowledge = {};
    
    try {
      const files = fs.readdirSync(this.knowledgeDir);
      for (const file of files) {
        if (file.endsWith('.md')) {
          const filePath = path.join(this.knowledgeDir, file);
          const content = fs.readFileSync(filePath, 'utf8');
          const key = file.replace('.md', '');
          knowledge[key] = content;
        }
      }
    } catch (error) {
      console.error('Error loading knowledge base:', error);
    }
    
    this.knowledgeBase = knowledge;
    return knowledge;
  }

  /**
   * Determine relevant context based on user message keywords
   * @param {string} userMessage - The user's input message
   * @param {Object} knowledgeBase - Optional knowledge base (uses loaded one if not provided)
   * @returns {Array} Array of relevant context objects
   */
  getRelevantContext(userMessage, knowledgeBase = null) {
    const knowledge = knowledgeBase || this.knowledgeBase;
    const message = userMessage.toLowerCase();
    const relevantContext = [];
    
    // Check each knowledge file for relevance
    for (const [knowledgeKey, keywords] of Object.entries(this.contextMappings)) {
      if (knowledge[knowledgeKey]) {
        const hasMatch = keywords.some(keyword => message.includes(keyword));
        if (hasMatch) {
          relevantContext.push({
            source: knowledgeKey,
            content: knowledge[knowledgeKey]
          });
        }
      }
    }
    
    // If no specific matches, include personal profile for general context
    if (relevantContext.length === 0 && knowledge.personal) {
      relevantContext.push({
        source: 'personal',
        content: knowledge.personal
      });
    }
    
    return relevantContext;
  }

  /**
   * Build enhanced system prompt with relevant personal context
   * @param {string} basePrompt - The base system prompt
   * @param {Array} relevantContext - Array of relevant context objects
   * @returns {string} Enhanced system prompt with context
   */
  buildSystemPrompt(basePrompt, relevantContext) {
    if (relevantContext.length === 0) {
      return basePrompt;
    }
    
    let contextPrompt = basePrompt + '\n\n## Relevant personal context of the user you are talking to\n\n';
    
    for (const context of relevantContext) {
      contextPrompt += `### From ${context.source.replace(/_/g, ' ').toUpperCase()}\n`;
      contextPrompt += context.content + '\n\n';
    }
    
    contextPrompt += 'Use this context to provide more personalized and relevant responses, but only mention personal details when directly relevant to the conversation.\n';
    
    return contextPrompt;
  }

  /**
   * Get enhanced system prompt for a user message
   * @param {string} basePrompt - The base system prompt
   * @param {string} userMessage - The user's input message
   * @returns {string} Enhanced system prompt with relevant context
   */
  getEnhancedSystemPrompt(basePrompt, userMessage) {
    const relevantContext = this.getRelevantContext(userMessage);
    return this.buildSystemPrompt(basePrompt, relevantContext);
  }

  /**
   * Get the loaded knowledge base
   * @returns {Object} Current knowledge base
   */
  getKnowledgeBase() {
    return this.knowledgeBase;
  }

  /**
   * Add or update context mapping keywords
   * @param {string} knowledgeKey - The knowledge file key
   * @param {Array} keywords - Array of keywords to match
   */
  addContextMapping(knowledgeKey, keywords) {
    this.contextMappings[knowledgeKey] = keywords;
  }

  /**
   * Generate summaries of knowledge files for intelligent selection
   * @returns {Object} Summaries of each knowledge file
   */
  async generateKnowledgeSummaries() {
    if (Object.keys(this.knowledgeSummaries).length > 0) {
      return this.knowledgeSummaries;
    }

    const summaries = {};
    
    for (const [key, content] of Object.entries(this.knowledgeBase)) {
      try {
        const prompt = `Summarize the following personal knowledge file in 2-3 sentences, focusing on the main topics and themes it covers:\n\n${content.substring(0, 1000)}...`;
        
        const result = await generateText({
          model: anthropic('claude-3-5-haiku-20241022'),
          prompt,
          maxTokens: 100
        });
        
        summaries[key] = result.text.trim();
      } catch (error) {
        console.error(`Error generating summary for ${key}:`, error);
        // Fallback to first few lines as summary
        summaries[key] = content.split('\n').slice(0, 3).join(' ').substring(0, 200) + '...';
      }
    }
    
    this.knowledgeSummaries = summaries;
    return summaries;
  }

  /**
   * Use GPT-4.1 to intelligently select relevant knowledge files
   * @param {string} userMessage - The user's input message
   * @returns {Array} Array of relevant knowledge file keys
   */
  async selectRelevantKnowledgeFiles(userMessage) {
    // Check cache first
    const cacheKey = userMessage.toLowerCase().substring(0, 100);
    if (this.selectionCache.has(cacheKey)) {
      return this.selectionCache.get(cacheKey);
    }

    if (!this.enableIntelligentSelection) {
      return this.getRelevantContextKeys(userMessage);
    }

    try {
      const summaries = await this.generateKnowledgeSummaries();
      const availableFiles = Object.keys(summaries);
      
      if (availableFiles.length === 0) {
        return [];
      }

      const summaryText = availableFiles
        .map(key => `${key}: ${summaries[key]}`)
        .join('\n');

      const prompt = `Given a user message and available personal knowledge files, select which files are most relevant to include in the context.

User message: "${userMessage}"

Available knowledge files:
${summaryText}

Respond with only the file keys that are relevant, separated by commas. If no files are particularly relevant, respond with "none". If the query seems general or personal, include "personal" as a default.

Examples:
- For work-related queries: "work"
- For personal questions: "personal"
- For hobby discussions: "interests"
- For complex queries: "personal,work" or "personal,interests"
- For unrelated queries: "none"

File keys to include:`;

      const result = await generateText({
        model: anthropic('claude-3-5-haiku-20241022'),
        prompt,
        maxTokens: 50,
        temperature: 0.3
      });

      let selectedFiles = [];
      const response = result.text.trim().toLowerCase();
      
      if (response !== 'none') {
        selectedFiles = response
          .split(',')
          .map(key => key.trim())
          .filter(key => availableFiles.includes(key));
      }

      // Cache the result
      this.selectionCache.set(cacheKey, selectedFiles);
      
      // Clear cache if it gets too large
      if (this.selectionCache.size > 100) {
        const keys = Array.from(this.selectionCache.keys());
        for (let i = 0; i < 20; i++) {
          this.selectionCache.delete(keys[i]);
        }
      }

      return selectedFiles;
    } catch (error) {
      console.error('Error in intelligent knowledge file selection:', error);
      // Fallback to keyword-based selection
      return this.getRelevantContextKeys(userMessage);
    }
  }

  /**
   * Get relevant context keys using keyword matching (fallback method)
   * @param {string} userMessage - The user's input message
   * @returns {Array} Array of relevant knowledge file keys
   */
  getRelevantContextKeys(userMessage) {
    const message = userMessage.toLowerCase();
    const relevantKeys = [];
    
    for (const [knowledgeKey, keywords] of Object.entries(this.contextMappings)) {
      if (this.knowledgeBase[knowledgeKey]) {
        const hasMatch = keywords.some(keyword => message.includes(keyword));
        if (hasMatch) {
          relevantKeys.push(knowledgeKey);
        }
      }
    }
    
    // If no specific matches, include personal profile for general context
    if (relevantKeys.length === 0 && this.knowledgeBase.personal) {
      relevantKeys.push('personal');
    }
    
    return relevantKeys;
  }

  /**
   * Enhanced method to get relevant context using intelligent selection
   * @param {string} userMessage - The user's input message
   * @param {Object} knowledgeBase - Optional knowledge base (uses loaded one if not provided)
   * @returns {Array} Array of relevant context objects
   */
  async getRelevantContextIntelligent(userMessage, knowledgeBase = null) {
    const knowledge = knowledgeBase || this.knowledgeBase;
    
    const selectedKeys = await this.selectRelevantKnowledgeFiles(userMessage);
    const relevantContext = [];
    
    for (const key of selectedKeys) {
      if (knowledge[key]) {
        relevantContext.push({
          source: key,
          content: knowledge[key]
        });
      }
    }
    
    return relevantContext;
  }

  /**
   * Enhanced method to get system prompt with intelligent context selection
   * @param {string} basePrompt - The base system prompt
   * @param {string} userMessage - The user's input message
   * @returns {string} Enhanced system prompt with relevant context
   */
  async getEnhancedSystemPromptIntelligent(basePrompt, userMessage) {
    const relevantContext = await this.getRelevantContextIntelligent(userMessage);
    return this.buildSystemPrompt(basePrompt, relevantContext);
  }

  /**
   * Toggle intelligent selection on/off
   * @param {boolean} enabled - Whether to enable intelligent selection
   */
  setIntelligentSelection(enabled) {
    this.enableIntelligentSelection = enabled;
  }

  /**
   * Clear the selection cache
   */
  clearCache() {
    this.selectionCache.clear();
    this.knowledgeSummaries = {};
  }

  /**
   * Reload knowledge base (useful for development/testing)
   * @returns {Object} Reloaded knowledge base
   */
  reload() {
    this.clearCache();
    return this.loadKnowledgeBase();
  }
}

module.exports = KnowledgeManager;