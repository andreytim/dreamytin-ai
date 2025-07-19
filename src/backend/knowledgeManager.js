const fs = require('fs');
const path = require('path');

class KnowledgeManager {
  constructor(knowledgeDir = null) {
    this.knowledgeDir = knowledgeDir || path.join(__dirname, '../../data/knowledge');
    this.knowledgeBase = {};
    
    // Automatically load knowledge base on construction
    this.loadKnowledgeBase();
  }

  /**
   * Load all markdown files from the knowledge directory
   * @returns {Object} Knowledge base with file keys and content values
   */
  loadKnowledgeBase() {
    const knowledge = {};
    const isTest = process.env.NODE_ENV === 'test';
    
    try {
      const files = fs.readdirSync(this.knowledgeDir);
      for (const file of files) {
        if (file.endsWith('.md')) {
          try {
            const filePath = path.join(this.knowledgeDir, file);
            const content = fs.readFileSync(filePath, 'utf8');
            const key = file.replace('.md', '');
            knowledge[key] = content;
            if (!isTest) console.log(`📖 Loaded knowledge: ${key}`);
          } catch (fileError) {
            if (!isTest) console.error(`Error loading knowledge file ${file}:`, fileError);
            // Continue loading other files
          }
        }
      }
    } catch (error) {
      if (!isTest) console.error('Error loading knowledge base:', error);
    }

    this.knowledgeBase = knowledge;
    if (!isTest) console.log(`📚 Knowledge base loaded with ${Object.keys(knowledge).length} files`);
    return knowledge;
  }

  /**
   * Build system prompt with relevant context
   * @param {string} basePrompt - Base system prompt
   * @param {Array} relevantContext - Array of context objects with source and content
   * @returns {string} Enhanced system prompt
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
    
    return contextPrompt;
  }

  /**
   * Get the loaded knowledge base
   * @returns {Object} Current knowledge base
   */
  getKnowledgeBase() {
    return this.knowledgeBase;
  }

  /**
   * Reload knowledge base from files
   */
  reload() {
    const isTest = process.env.NODE_ENV === 'test';
    if (!isTest) console.log('🔄 Reloading knowledge base...');
    this.loadKnowledgeBase();
  }
}

module.exports = KnowledgeManager;