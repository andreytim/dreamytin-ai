import { render, screen } from '@testing-library/react';
import App from '../../../src/renderer/App';
import '@testing-library/jest-dom';

// Mock scrollIntoView which is not available in jsdom
Object.defineProperty(HTMLElement.prototype, 'scrollIntoView', {
  configurable: true,
  value: jest.fn(),
});

// Mock fetch for API calls
global.fetch = jest.fn();

describe('App Component', () => {
  beforeEach(() => {
    fetch.mockClear();
  });

  test('renders without crashing', () => {
    render(<App />);
  });

  test('renders chat header', () => {
    render(<App />);
    expect(screen.getByRole('heading', { name: /dreamy tin/i })).toBeInTheDocument();
  });

  test('renders input field and send button', () => {
    render(<App />);
    expect(screen.getByPlaceholderText('Type your message here...')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /send/i })).toBeInTheDocument();
  });
});