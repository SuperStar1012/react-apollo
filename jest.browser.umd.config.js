const { jest } = require('./package.json');

jest.moduleNameMapper = {
  '\\.\\./src$': '<rootDir>/lib/react-apollo.browser.umd.js',
  '\\.\\./src/test-utils': '<rootDir>/lib/test-utils.js',
  '\\.\\./src/walkTree': '<rootDir>/lib/walkTree.js',
  // Force other imports to /src/whatever to fail
  '\\.\\./src': '<rootDir>/test/fail-no-entry-point.js',
};

// Ignore server tests for browser bundle
jest.modulePathIgnorePatterns.push('<rootDir>/test/server');

// Ignore tests that don't go against the public API
jest.modulePathIgnorePatterns.push('<rootDir>/test/internal-api');

module.exports = jest;
