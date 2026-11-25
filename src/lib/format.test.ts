import { describe, expect, it } from 'vitest'
import {
  formatAmount,
  formatKcal,
  formatMacro,
  matchesSearch,
  normalizeForSearch,
  normalizeRecipeUrl,
  parseDecimal,
} from './format'

describe('formatKcal', () => {
  it('rounds to integers', () => {
    expect(formatKcal(85.8)).toBe('86')
    expect(formatKcal(0.4)).toBe('0')
    expect(formatKcal(-0.4)).toBe('0')
  })
  it('follows Polish grouping (4-digit numbers are not grouped)', () => {
    expect(formatKcal(2234.6)).toBe('2235')
    expect(formatKcal(12345)).toBe('12 345')
  })
})

describe('formatMacro', () => {
  it('rounds to one decimal with comma', () => {
    expect(formatMacro(12.345)).toBe('12,3')
    expect(formatMacro(7.56)).toBe('7,6')
  })
  it('drops trailing zero', () => {
    expect(formatMacro(10)).toBe('10')
    expect(formatMacro(0.04)).toBe('0')
  })
})

describe('formatAmount', () => {
  it('formats up to two decimals', () => {
    expect(formatAmount(1.5)).toBe('1,5')
    expect(formatAmount(120)).toBe('120')
    expect(formatAmount(0.333)).toBe('0,33')
  })
})

describe('parseDecimal', () => {
  it('accepts comma and dot', () => {
    expect(parseDecimal('12,5')).toBe(12.5)
    expect(parseDecimal('12.5')).toBe(12.5)
  })
  it('accepts integers, spaces and leading separator', () => {
    expect(parseDecimal(' 200 ')).toBe(200)
    expect(parseDecimal('1 200')).toBe(1200)
    expect(parseDecimal(',5')).toBe(0.5)
    expect(parseDecimal('5,')).toBe(5)
  })
  it('accepts negative numbers (validation is up to the caller)', () => {
    expect(parseDecimal('-3')).toBe(-3)
  })
  it('returns null for empty or invalid input', () => {
    expect(parseDecimal('')).toBeNull()
    expect(parseDecimal('   ')).toBeNull()
    expect(parseDecimal('abc')).toBeNull()
    expect(parseDecimal('1,2,3')).toBeNull()
    expect(parseDecimal('12g')).toBeNull()
  })
})

describe('normalizeForSearch', () => {
  it('handles dictation output', () => {
    expect(normalizeForSearch('Żółty ser.')).toBe('zolty ser')
    expect(normalizeForSearch('  Banan. ')).toBe('banan')
  })
  it('strips all Polish diacritics', () => {
    expect(normalizeForSearch('ĄĆĘŁŃÓŚŹŻ ąćęłńóśźż')).toBe('acelnoszz acelnoszz')
  })
  it('collapses whitespace and punctuation', () => {
    expect(normalizeForSearch('Pierś  z kurczaka, gotowana!')).toBe('piers z kurczaka gotowana')
  })
})

describe('normalizeRecipeUrl', () => {
  it('keeps valid https links', () => {
    expect(normalizeRecipeUrl(' https://www.youtube.com/watch?v=abc ')).toBe('https://www.youtube.com/watch?v=abc')
  })
  it('adds https:// when missing', () => {
    expect(normalizeRecipeUrl('youtube.com/shorts/xyz')).toBe('https://youtube.com/shorts/xyz')
  })
  it('returns null for empty and unsafe links', () => {
    expect(normalizeRecipeUrl('   ')).toBeNull()
    expect(normalizeRecipeUrl('javascript:alert(1)')).toBeNull()
    expect(normalizeRecipeUrl('ftp://example.com')).toBeNull()
  })
})

describe('matchesSearch', () => {
  it('matches without diacritics and case', () => {
    expect(matchesSearch('Żółty ser gouda', 'zolty')).toBe(true)
    expect(matchesSearch('Pierś z kurczaka', 'PIERS')).toBe(true)
  })
  it('matches words in any order', () => {
    expect(matchesSearch('Pierś z kurczaka', 'kurczak pierś')).toBe(true)
  })
  it('does not match missing words', () => {
    expect(matchesSearch('Pierś z kurczaka', 'indyk')).toBe(false)
  })
  it('empty query matches everything', () => {
    expect(matchesSearch('Cokolwiek', '  ')).toBe(true)
  })
})
