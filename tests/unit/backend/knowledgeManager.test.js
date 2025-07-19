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
      fs.readdirSync.mockReturnValue(['personal.md']);
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

    it('should handle initialization errors gracefully', () => {
      fs.readdirSync.mockImplementation(() => {
        throw new Error('Directory not found');
      });
      
      knowledgeManager = new KnowledgeManager();
      
      expect(knowledgeManager.getKnowledgeBase()).toEqual({});
    });
  });

  describe('loadKnowledgeBase', () => {
    beforeEach(() => {
      knowledgeManager = new KnowledgeManager();
    });

    it('should load all markdown files from knowledge directory', () => {
      fs.readdirSync.mockReturnValue(['personal.md', 'work.md', 'interests.md', 'readme.txt']);
      fs.readFileSync
        .mockReturnValueOnce('Personal info about user')
        .mockReturnValueOnce('Work history and career details')
        .mockReturnValueOnce('Hobbies and interests');

      const result = knowledgeManager.loadKnowledgeBase();

      expect(fs.readdirSync).toHaveBeenCalledWith(knowledgeManager.knowledgeDir);
      expect(fs.readFileSync).toHaveBeenCalledTimes(3); // Only .md files
      expect(result).toEqual({
        personal: 'Personal info about user',
        work: 'Work history and career details',  
        interests: 'Hobbies and interests'
      });
    });

    it('should ignore non-markdown files', () => {
      fs.readdirSync.mockReturnValue(['personal.md', 'config.json', 'readme.txt', 'work.md']);
      fs.readFileSync
        .mockReturnValueOnce('Personal content')
        .mockReturnValueOnce('Work content');

      const result = knowledgeManager.loadKnowledgeBase();

      expect(fs.readFileSync).toHaveBeenCalledTimes(2);
      expect(result).toEqual({
        personal: 'Personal content',
        work: 'Work content'
      });
    });

    it('should handle file read errors gracefully', () => {
      fs.readdirSync.mockReturnValue(['personal.md', 'work.md']);
      fs.readFileSync
        .mockReturnValueOnce('Personal content')
        .mockImplementationOnce(() => { throw new Error('File read error'); });

      const result = knowledgeManager.loadKnowledgeBase();

      // Should still load the successful file
      expect(result).toEqual({
        personal: 'Personal content'
      });
    });

    it('should handle directory read errors gracefully', () => {
      fs.readdirSync.mockImplementation(() => {
        throw new Error('Directory not accessible');
      });

      const result = knowledgeManager.loadKnowledgeBase();

      expect(result).toEqual({});
      expect(knowledgeManager.getKnowledgeBase()).toEqual({});
    });
  });

  describe('buildSystemPrompt', () => {
    beforeEach(() => {
      knowledgeManager = new KnowledgeManager();
    });

    it('should return base prompt when no context provided', () => {
      const basePrompt = 'You are a helpful assistant.';
      const result = knowledgeManager.buildSystemPrompt(basePrompt, []);
      
      expect(result).toBe(basePrompt);
    });

    it('should build enhanced prompt with single context', () => {
      const basePrompt = 'You are a helpful assistant.';
      const context = [
        { source: 'personal', content: 'User is a software engineer living in London.' }
      ];
      
      const result = knowledgeManager.buildSystemPrompt(basePrompt, context);
      
      expect(result).toContain(basePrompt);
      expect(result).toContain('## Relevant personal context of the user you are talking to');
      expect(result).toContain('### From PERSONAL');
      expect(result).toContain('User is a software engineer living in London.');
    });

    it('should build enhanced prompt with multiple contexts', () => {
      const basePrompt = 'You are a helpful assistant.';
      const contexts = [
        { source: 'personal', content: 'Lives in London, age 35.' },
        { source: 'work', content: 'Software engineer at Meta.' },
        { source: 'interests', content: 'Enjoys basketball and philosophy.' }
      ];
      
      const result = knowledgeManager.buildSystemPrompt(basePrompt, contexts);
      
      expect(result).toContain('### From PERSONAL');
      expect(result).toContain('### From WORK');
      expect(result).toContain('### From INTERESTS');
      expect(result).toContain('Lives in London, age 35.');
      expect(result).toContain('Software engineer at Meta.');
      expect(result).toContain('Enjoys basketball and philosophy.');
    });

    it('should handle context source names with underscores', () => {
      const basePrompt = 'You are a helpful assistant.';
      const context = [
        { source: 'work_history', content: 'Previous job details.' }
      ];
      
      const result = knowledgeManager.buildSystemPrompt(basePrompt, context);
      
      expect(result).toContain('### From WORK HISTORY');
    });
  });

  describe('getKnowledgeBase', () => {
    it('should return the current knowledge base', () => {
      fs.readdirSync.mockReturnValue(['personal.md']);
      fs.readFileSync.mockReturnValue('Personal data');
      
      knowledgeManager = new KnowledgeManager();
      const result = knowledgeManager.getKnowledgeBase();
      
      expect(result).toEqual({
        personal: 'Personal data'
      });
    });
  });

  describe('reload', () => {
    beforeEach(() => {
      fs.readdirSync.mockReturnValue(['initial.md']);
      fs.readFileSync.mockReturnValue('Initial content');
      knowledgeManager = new KnowledgeManager();
    });

    it('should reload knowledge base from files', () => {
      // Change the mock to return different data
      fs.readdirSync.mockReturnValue(['updated.md', 'new.md']);
      fs.readFileSync
        .mockReturnValueOnce('Updated content')
        .mockReturnValueOnce('New content');
      
      knowledgeManager.reload();
      
      expect(knowledgeManager.getKnowledgeBase()).toEqual({
        updated: 'Updated content',
        new: 'New content'
      });
    });
  });
});