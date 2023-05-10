/** @type {import('ts-jest').JestConfigWithTsJest} */
module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  moduleNameMapper: {
    '^@src/(.*)$': '<rootDir>/src/$1',
    '^@database/(.*)$': '<rootDir>/src/database/$1',
    '^@entities/(.*)$': '<rootDir>/src/entities/$1',
    '^@models/(.*)$': '<rootDir>/src/models/$1',
    '^@middlewares/(.*)$': '<rootDir>/src/middlewares/$1',
    '^@helpers/(.*)$': '<rootDir>/src/helpers/$1',
    '^@config/(.*)$': '<rootDir>/src/config/$1',
    '^@modules/(.*)$': '<rootDir>/src/modules/$1',
  },
}
