import { describe, expect, it } from 'vitest'
import { camelCase, kebabCase, pascalCase } from '../../src/utils/naming'

describe('pascalCase', () => {
  it.each([
    ['user', 'User'],
    ['user_profile', 'UserProfile'],
    ['user-profile', 'UserProfile'],
    ['user profile', 'UserProfile'],
    ['UserProfile', 'UserProfile'],
    ['USER_PROFILE', 'UserProfile'],
    ['', ''],
  ])('pascalCase(%j) === %j', (input, expected) => {
    expect(pascalCase(input)).toBe(expected)
  })
})

describe('camelCase', () => {
  it.each([
    ['user', 'user'],
    ['user_profile', 'userProfile'],
    ['UserProfile', 'userProfile'],
    ['user profile', 'userProfile'],
    ['', ''],
  ])('camelCase(%j) === %j', (input, expected) => {
    expect(camelCase(input)).toBe(expected)
  })
})

describe('kebabCase', () => {
  it.each([
    ['user', 'user'],
    ['user_profile', 'user-profile'],
    ['UserProfile', 'user-profile'],
    ['user profile', 'user-profile'],
    ['APIKey', 'api-key'],
    ['', ''],
  ])('kebabCase(%j) === %j', (input, expected) => {
    expect(kebabCase(input)).toBe(expected)
  })
})
