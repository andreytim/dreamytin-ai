module.exports = {
  testEnvironment: 'node',
  testMatch: [
    'tests/**/*.test.js',
    'tests/**/*.test.jsx'
  ],
  collectCoverageFrom: [
    'src/**/*.js',
    'src/**/*.jsx',
    '!src/**/*.test.js',
    '!src/**/*.spec.js'
  ],
  setupFilesAfterEnv: ['<rootDir>/tests/setupTests.js'],
  projects: [
    {
      displayName: 'unit-frontend',
      testEnvironment: 'jsdom',
      testMatch: ['<rootDir>/tests/unit/frontend/**/*.test.jsx'],
      collectCoverageFrom: ['<rootDir>/src/renderer/**/*.jsx'],
      transform: {
        '^.+\\.(js|jsx)$': 'babel-jest'
      },
      moduleNameMapper: {
        '^react-markdown$': '<rootDir>/tests/__mocks__/react-markdown.js'
      },
      setupFilesAfterEnv: ['<rootDir>/tests/setupTests.js']
    },
    {
      displayName: 'unit-backend',
      testEnvironment: 'node',
      testMatch: ['<rootDir>/tests/unit/backend/**/*.test.js'],
      collectCoverageFrom: ['<rootDir>/src/backend/**/*.js']
    },
    {
      displayName: 'integration',
      testEnvironment: 'node',
      testMatch: ['<rootDir>/tests/integration/**/*.test.js'],
      collectCoverageFrom: ['<rootDir>/src/**/*.js']
    }
  ]
};