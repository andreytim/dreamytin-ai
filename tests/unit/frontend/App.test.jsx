import { render, screen, fireEvent, waitFor, act } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import App from '../../../src/renderer/App';
import '@testing-library/jest-dom';

// Mock scrollIntoView which is not available in jsdom
Object.defineProperty(HTMLElement.prototype, 'scrollIntoView', {
  configurable: true,
  value: jest.fn(),
});

// Mock fetch for API calls
global.fetch = jest.fn();

// Mock TextEncoder and TextDecoder for streaming tests
global.TextEncoder = class {
  encode(input) {
    return new Uint8Array([...input].map(c => c.charCodeAt(0)));
  }
};

global.TextDecoder = class {
  decode(input) {
    return String.fromCharCode(...input);
  }
};

describe('App Component', () => {
  beforeEach(() => {
    fetch.mockClear();
    
    // Default mock for usage API calls
    fetch.mockImplementation((url) => {
      if (url.includes('/api/usage')) {
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve({
            totalCost: 0,
            requests: 0,
            startTime: new Date().toISOString()
          })
        });
      }
      
      // Default fallback
      return Promise.resolve({
        ok: true,
        json: () => Promise.resolve({})
      });
    });
  });

  test('renders without crashing', async () => {
    await act(async () => {
      render(<App />);
    });
  });

  test('renders chat header', async () => {
    await act(async () => {
      render(<App />);
    });
    expect(screen.getByRole('heading', { name: /dreamy tin/i })).toBeInTheDocument();
  });

  test('renders input field and send button', async () => {
    await act(async () => {
      render(<App />);
    });
    expect(screen.getByPlaceholderText('Type your message here...')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /send/i })).toBeInTheDocument();
  });

  test('renders model selector dropdown', async () => {
    await act(async () => {
      render(<App />);
    });
    expect(screen.getByRole('combobox')).toBeInTheDocument();
  });

  test('clears chat history when switching models', async () => {
    const user = userEvent.setup();
    
    // Mock fetch to handle both usage and chat API calls
    fetch.mockImplementation((url) => {
      if (url.includes('/api/usage')) {
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve({
            totalCost: 0,
            requests: 0,
            startTime: new Date().toISOString()
          })
        });
      }
      
      if (url.includes('/api/chat')) {
        // Mock streaming response for chat
        return Promise.resolve({
          ok: true,
          body: {
            getReader: () => ({
              read: jest.fn()
                .mockResolvedValueOnce({ done: false, value: new TextEncoder().encode('Hello') })
                .mockResolvedValueOnce({ done: true })
            })
          }
        });
      }
      
      return Promise.resolve({
        ok: true,
        json: () => Promise.resolve({})
      });
    });

    await act(async () => {
      render(<App />);
    });
    
    // Send a message to create chat history
    const input = screen.getByPlaceholderText('Type your message here...');
    const sendButton = screen.getByRole('button', { name: /send/i });
    
    await user.type(input, 'Test message');
    await user.click(sendButton);
    
    // Wait for the message to appear in the UI
    await waitFor(() => {
      expect(screen.getByText('Test message')).toBeInTheDocument();
    });
    
    // Switch model using the dropdown
    const modelSelect = screen.getByRole('combobox');
    await user.selectOptions(modelSelect, 'gpt-4.1-mini'); // Assuming this model exists
    
    // Verify chat history is cleared (user message should be gone)
    expect(screen.queryByText('Test message')).not.toBeInTheDocument();
  });
});