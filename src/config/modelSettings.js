module.exports = {
  // Default AI model configuration
  defaultModel: 'gpt-4.1',
  
  // Available models by provider
  models: {
    // OpenAI models
    'gpt-4.1': { provider: 'openai', name: 'gpt-4.1' },
    'gpt-4.1-mini': { provider: 'openai', name: 'gpt-4.1-mini' },
    'gpt-4.1-nano': { provider: 'openai', name: 'gpt-4.1-nano' },
    'gpt-4o': { provider: 'openai', name: 'gpt-4o' },
    'gpt-3.5-turbo': { provider: 'openai', name: 'gpt-3.5-turbo' },
    
    // Anthropic models
    'claude-3.5-sonnet': { provider: 'anthropic', name: 'claude-3-5-sonnet-20241022' },
    'claude-3-sonnet': { provider: 'anthropic', name: 'claude-3-sonnet-20240229' },
    'claude-3-haiku': { provider: 'anthropic', name: 'claude-3-haiku-20240307' },
    
    // Google models
    'gemini-2.0-flash': { provider: 'google', name: 'gemini-2.0-flash-exp' },
    'gemini-1.5-pro': { provider: 'google', name: 'gemini-1.5-pro' },
    'gemini-1.5-flash': { provider: 'google', name: 'gemini-1.5-flash' }
  }
};