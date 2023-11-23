/** @type {import('ts-jest').JestConfigWithTsJest} */
module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  moduleNameMapper: {
    '^@/(.*)$': '<rootDir>/src/$1',
  },
  testPathIgnorePatterns: ['.d.ts', '.js'],
  roots: ['<rootDir>/src'],
  verbose: true,
  forceExit: true,
  maxWorkers: 1,
}
