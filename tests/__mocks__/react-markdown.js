import React from 'react';

// Mock ReactMarkdown component for tests
const ReactMarkdown = ({ children }) => {
  return React.createElement('div', { 'data-testid': 'markdown' }, children);
};

export default ReactMarkdown;