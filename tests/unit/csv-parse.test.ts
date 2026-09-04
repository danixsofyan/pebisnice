import { describe, expect, it } from 'vitest'
import { parseCsv } from '@/lib/import/csv-parse'

describe('parseCsv', () => {
  it('parses simple rows', () => {
    expect(parseCsv('a,b,c\n1,2,3')).toEqual([
      ['a', 'b', 'c'],
      ['1', '2', '3'],
    ])
  })
  it('handles quotes, escaped quotes, and commas inside quotes', () => {
    expect(parseCsv('name,note\n"Kopi, Susu","dia ""bilang"""')).toEqual([
      ['name', 'note'],
      ['Kopi, Susu', 'dia "bilang"'],
    ])
  })
  it('handles newlines inside quotes and a BOM', () => {
    expect(parseCsv('﻿a\n"line1\nline2"')).toEqual([['a'], ['line1\nline2']])
  })
  it('drops fully blank lines', () => {
    expect(parseCsv('a\n\n\nb')).toEqual([['a'], ['b']])
  })
})
