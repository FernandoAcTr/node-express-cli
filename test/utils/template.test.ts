import path from 'path'
import { describe, expect, it } from 'vitest'
import { renderTemplate, renderTemplateString } from '../../src/utils/template'
import { CliError } from '../../src/errors'

const fixture = path.join(process.cwd(), 'test', 'fixtures', 'greeting.tpl.txt')

describe('renderTemplateString', () => {
  it('replaces every occurrence of a placeholder', () => {
    expect(renderTemplateString('__Name__ and __Name__', { Name: 'Ada' })).toBe('Ada and Ada')
  })

  it('does not re-process placeholders injected by a value', () => {
    expect(renderTemplateString('__A__', { A: '__B__' })).toBe('__B__')
  })

  it('throws a CliError when a placeholder has no value', () => {
    expect(() => renderTemplateString('Hello __Name__', {})).toThrow(CliError)
    expect(() => renderTemplateString('Hello __Name__', {})).toThrow(/Missing template variable "Name"/)
  })
})

describe('renderTemplate', () => {
  it('reads a template file and renders it', () => {
    expect(renderTemplate(fixture, { Name: 'World' })).toBe('Hello World!\n')
  })

  it('throws when the template file uses a placeholder without a value', () => {
    expect(() => renderTemplate(fixture, {})).toThrow(/Missing template variable "Name"/)
  })
})
