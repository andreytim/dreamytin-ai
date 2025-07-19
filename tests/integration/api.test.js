const request = require('supertest');
const express = require('express');
const cors = require('cors');

jest.mock('@ai-sdk/openai');
jest.mock('ai');

const { openai } = require('@ai-sdk/openai');
const { streamText } = require('ai');

describe('Chat API', () => {
  let app;

  beforeEach(() => {
    jest.clearAllMocks();
    app = express();
    app.use(cors());
    app.use(express.json());
  });

  const createChatEndpoint = () => {
    app.post('/api/chat', async (req, res) => {
      try {
        const { message, model = 'gpt-3.5-turbo' } = req.body;
        
        if (!process.env.OPENAI_API_KEY) {
          return res.status(500).json({ error: 'OpenAI API key not configured' });
        }

        res.setHeader('Content-Type', 'text/plain');
        res.setHeader('Access-Control-Allow-Origin', '*');
        res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

        const result = streamText({
          model: openai(model),
          prompt: message,
        });

        for await (const textPart of result.textStream) {
          res.write(textPart);
        }
        res.end();
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
  };

  test('should handle missing API key', async () => {
    delete process.env.OPENAI_API_KEY;
    createChatEndpoint();

    const response = await request(app)
      .post('/api/chat')
      .send({ message: 'Hello' });

    expect(response.status).toBe(500);
    expect(response.body.error).toBe('OpenAI API key not configured');
  });

  test('should handle valid message with mocked streaming', async () => {
    process.env.OPENAI_API_KEY = 'test-key';
    
    // Mock openai function to return a model
    openai.mockReturnValue({ model: 'mocked-model' });
    
    // Mock the async iterator properly
    const mockTextStream = {
      [Symbol.asyncIterator]: async function* () {
        yield 'Hello ';
        yield 'there!';
      }
    };
    
    streamText.mockReturnValue({
      textStream: mockTextStream
    });
    
    createChatEndpoint();

    const response = await request(app)
      .post('/api/chat')
      .send({ message: 'Hello' });

    expect(response.status).toBe(200);
    expect(response.text).toBe('Hello there!');
    expect(streamText).toHaveBeenCalledWith({
      model: { model: 'mocked-model' },
      prompt: 'Hello'
    });
  });
});