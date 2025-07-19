const fs = require('fs');
const path = require('path');

class KnowledgeManager {
  constructor(knowledgeDir = null) {
    this.knowledgeDir = knowledgeDir || path.join(__dirname, '../../data/knowledge');
    this.knowledgeBase = {};
    this.contextMappings = {
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
    if (relevantContext.length === 0 && knowledge.personal_profile_summary) {
      relevantContext.push({
        source: 'personal_profile_summary',
        content: knowledge.personal_profile_summary
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
   * Reload knowledge base (useful for development/testing)
   * @returns {Object} Reloaded knowledge base
   */
  reload() {
    return this.loadKnowledgeBase();
  }
}

module.exports = KnowledgeManager;