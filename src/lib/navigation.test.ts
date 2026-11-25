import { describe, expect, it } from 'vitest'
import { safeReturnTo } from './navigation'

describe('safeReturnTo', () => {
  it('accepts in-app paths', () => {
    expect(safeReturnTo('/entry/add?date=2026-11-25&meal=lunch')).toBe('/entry/add?date=2026-11-25&meal=lunch')
  })
  it('rejects external and protocol-relative URLs', () => {
    expect(safeReturnTo('https://evil.com')).toBeNull()
    expect(safeReturnTo('//evil.com')).toBeNull()
    expect(safeReturnTo('/\\evil.com')).toBeNull()
    expect(safeReturnTo('foods')).toBeNull()
    expect(safeReturnTo(null)).toBeNull()
  })
})
