const fs = require('fs');
const path = require('path');
const KnowledgeManager = require('../../../src/backend/knowledgeManager');

// Mock fs and path modules
jest.mock('fs');
jest.mock('path');

describe('KnowledgeManager', () => {
  let knowledgeManager;
  
  beforeEach(() => {
    jest.clearAllMocks();
    
    // Mock path.join to return predictable paths
    path.join.mockImplementation((...args) => args.join('/'));
    
    // Mock successful directory reading by default
    fs.readdirSync.mockReturnValue([]);
  });

  describe('constructor and initialization', () => {
    it('should initialize with default knowledge directory', () => {
      fs.readdirSync.mockReturnValue(['personal_profile_summary.md']);
      fs.readFileSync.mockReturnValue('Personal content');
      
      knowledgeManager = new KnowledgeManager();
      
      expect(path.join).toHaveBeenCalledWith(expect.anything(), '../../data/knowledge');
      expect(fs.readdirSync).toHaveBeenCalled();
    });

    it('should initialize with custom knowledge directory', () => {
      const customDir = '/custom/knowledge';
      fs.readdirSync.mockReturnValue([]);
      
      knowledgeManager = new KnowledgeManager(customDir);
      
      expect(knowledgeManager.knowledgeDir).toBe(customDir);
    });

    it('should automatically load knowledge base on construction', () => {
      fs.readdirSync.mockReturnValue(['work.md']);
      fs.readFileSync.mockReturnValue('Work content');
      
      knowledgeManager = new KnowledgeManager();
      
      expect(knowledgeManager.getKnowledgeBase()).toEqual({
        work: 'Work content'
      });
    });
  });

  describe('loadKnowledgeBase', () => {
    beforeEach(() => {
      knowledgeManager = new KnowledgeManager();
    });

    it('should load markdown files correctly', () => {
      fs.readdirSync.mockReturnValue(['personal_profile_summary.md', 'work.md', 'readme.txt']);
      fs.readFileSync.mockImplementation((filePath) => {
        if (filePath.includes('personal_profile_summary.md')) {
          return 'Personal profile content';
        }
        if (filePath.includes('work.md')) {
          return 'Work information';
        }
        return '';
      });

      const result = knowledgeManager.loadKnowledgeBase();

      expect(result).toEqual({
        personal_profile_summary: 'Personal profile content',
        work: 'Work information'
      });
      expect(fs.readFileSync).toHaveBeenCalledTimes(2); // Only .md files
    });

    it('should handle directory read errors gracefully', () => {
      fs.readdirSync.mockImplementation(() => {
        throw new Error('ENOENT: no such file or directory');
      });
      
      const consoleSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
      
      const result = knowledgeManager.loadKnowledgeBase();
      
      expect(result).toEqual({});
      expect(consoleSpy).toHaveBeenCalled();
      
      consoleSpy.mockRestore();
    });
  });

  describe('getRelevantContext', () => {
    beforeEach(() => {
      knowledgeManager = new KnowledgeManager();
      knowledgeManager.knowledgeBase = {
        personal_profile_summary: 'Personal details about Andrey',
        work: 'Meta engineering work',
        interests: 'Basketball and creative pursuits'
      };
    });

    it('should detect personal context keywords', () => {
      const testCases = [
        'Tell me about your personal background',
        'Who are you?',
        'What about your family?',
        'How is Andrey doing?'
      ];

      testCases.forEach(message => {
        const result = knowledgeManager.getRelevantContext(message);
        expect(result.some(ctx => ctx.source === 'personal_profile_summary')).toBe(true);
      });
    });

    it('should detect work context keywords', () => {
      const testCases = [
        'What is your job?',
        'Tell me about Meta',
        'How is your engineering career?',
        'When did you quit?'
      ];

      testCases.forEach(message => {
        const result = knowledgeManager.getRelevantContext(message);
        expect(result.some(ctx => ctx.source === 'work')).toBe(true);
      });
    });

    it('should detect interests context keywords', () => {
      const testCases = [
        'What are your hobbies?',
        'Do you play basketball?',
        'Tell me about your interests',
        'What do you like to do for exercise?'
      ];

      testCases.forEach(message => {
        const result = knowledgeManager.getRelevantContext(message);
        expect(result.some(ctx => ctx.source === 'interests')).toBe(true);
      });
    });

    it('should return default context for generic messages', () => {
      const result = knowledgeManager.getRelevantContext('What is the weather like?');
      
      expect(result).toHaveLength(1);
      expect(result[0].source).toBe('personal_profile_summary');
    });

    it('should handle multiple matching contexts', () => {
      const result = knowledgeManager.getRelevantContext('Tell me about Andrey the engineer');
      
      expect(result.length).toBeGreaterThan(1);
      const sources = result.map(ctx => ctx.source);
      expect(sources).toContain('personal_profile_summary');
      expect(sources).toContain('work');
    });

    it('should return empty array when no knowledge base exists', () => {
      knowledgeManager.knowledgeBase = {};
      const result = knowledgeManager.getRelevantContext('Hello');
      
      expect(result).toHaveLength(0);
    });

    it('should accept custom knowledge base parameter', () => {
      const customKnowledge = {
        custom_topic: 'Custom content'
      };
      
      // Add custom mapping for testing
      knowledgeManager.addContextMapping('custom_topic', ['custom']);
      
      const result = knowledgeManager.getRelevantContext('Tell me about custom', customKnowledge);
      
      expect(result).toHaveLength(1);
      expect(result[0].source).toBe('custom_topic');
    });
  });

  describe('buildSystemPrompt', () => {
    beforeEach(() => {
      knowledgeManager = new KnowledgeManager();
    });

    const basePrompt = 'You are a helpful AI assistant.';

    it('should return base prompt when no context provided', () => {
      const result = knowledgeManager.buildSystemPrompt(basePrompt, []);
      expect(result).toBe(basePrompt);
    });

    it('should properly format context sections', () => {
      const context = [
        { source: 'personal_profile_summary', content: 'Personal info here' }
      ];
      
      const result = knowledgeManager.buildSystemPrompt(basePrompt, context);
      
      expect(result).toContain(basePrompt);
      expect(result).toContain('## Relevant personal context of the user you are talking to');
      expect(result).toContain('### From PERSONAL PROFILE SUMMARY');
      expect(result).toContain('Personal info here');
      expect(result).toContain('Use this context to provide more personalized');
    });

    it('should handle multiple contexts', () => {
      const contexts = [
        { source: 'personal_profile_summary', content: 'Personal details' },
        { source: 'work', content: 'Work details' }
      ];
      
      const result = knowledgeManager.buildSystemPrompt(basePrompt, contexts);
      
      expect(result).toContain('### From PERSONAL PROFILE SUMMARY');
      expect(result).toContain('Personal details');
      expect(result).toContain('### From WORK');
      expect(result).toContain('Work details');
    });

    it('should properly format source names with underscores', () => {
      const context = [
        { source: 'personal_profile_summary', content: 'Content' }
      ];
      
      const result = knowledgeManager.buildSystemPrompt(basePrompt, context);
      
      expect(result).toContain('PERSONAL PROFILE SUMMARY');
      expect(result).not.toContain('personal_profile_summary');
    });
  });

  describe('getEnhancedSystemPrompt', () => {
    beforeEach(() => {
      knowledgeManager = new KnowledgeManager();
      knowledgeManager.knowledgeBase = {
        work: 'Work details'
      };
    });

    it('should combine context detection and prompt building', () => {
      const basePrompt = 'You are helpful.';
      const userMessage = 'Tell me about your work';
      
      const result = knowledgeManager.getEnhancedSystemPrompt(basePrompt, userMessage);
      
      expect(result).toContain(basePrompt);
      expect(result).toContain('## Relevant personal context of the user you are talking to');
      expect(result).toContain('Work details');
    });
  });

  describe('utility methods', () => {
    beforeEach(() => {
      knowledgeManager = new KnowledgeManager();
    });

    it('should allow adding custom context mappings', () => {
      knowledgeManager.addContextMapping('custom', ['keyword1', 'keyword2']);
      
      expect(knowledgeManager.contextMappings.custom).toEqual(['keyword1', 'keyword2']);
    });

    it('should allow reloading knowledge base', () => {
      fs.readdirSync.mockReturnValue(['new_file.md']);
      fs.readFileSync.mockReturnValue('New content');
      
      const result = knowledgeManager.reload();
      
      expect(result).toEqual({ new_file: 'New content' });
      expect(knowledgeManager.getKnowledgeBase()).toEqual({ new_file: 'New content' });
    });
  });
});