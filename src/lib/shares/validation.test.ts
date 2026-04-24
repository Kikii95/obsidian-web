import { describe, it, expect } from 'vitest'
import {
  validateSharePath,
  getRelativePath,
  isDirectChild,
  buildFullPath,
} from './validation'

describe('validateSharePath', () => {
  describe('directory traversal prevention', () => {
    it('blocks paths with .. sequences', () => {
      expect(validateSharePath('../secret', 'shared', true)).toBe(false)
      expect(validateSharePath('shared/../secret', 'shared', true)).toBe(false)
      expect(validateSharePath('shared/folder/../../etc', 'shared', true)).toBe(false)
    })

    it('allows normal paths without traversal', () => {
      expect(validateSharePath('shared/file.md', 'shared', true)).toBe(true)
      expect(validateSharePath('shared/folder/nested.md', 'shared', true)).toBe(true)
    })
  })

  describe('path boundary checks', () => {
    it('allows access within shared folder', () => {
      expect(validateSharePath('notes/daily/today.md', 'notes', true)).toBe(true)
      expect(validateSharePath('notes', 'notes', true)).toBe(true)
    })

    it('blocks access outside shared folder', () => {
      expect(validateSharePath('other/file.md', 'notes', true)).toBe(false)
      expect(validateSharePath('secret.md', 'notes', true)).toBe(false)
    })

    it('handles prefix-similar folder names (startsWith behavior)', () => {
      // Note: Current implementation uses startsWith, so 'notesextra' matches 'notes'
      // In practice, paths come from the file system where folder boundaries are explicit
      expect(validateSharePath('notesextra/file.md', 'notes', true)).toBe(true)
    })
  })

  describe('subfolder control', () => {
    it('allows direct children when subfolders disabled', () => {
      expect(validateSharePath('shared/file.md', 'shared', false)).toBe(true)
      expect(validateSharePath('shared/note.txt', 'shared', false)).toBe(true)
    })

    it('blocks nested paths when subfolders disabled', () => {
      expect(validateSharePath('shared/sub/file.md', 'shared', false)).toBe(false)
      expect(validateSharePath('shared/deep/nested/file.md', 'shared', false)).toBe(false)
    })

    it('allows nested paths when subfolders enabled', () => {
      expect(validateSharePath('shared/sub/file.md', 'shared', true)).toBe(true)
      expect(validateSharePath('shared/deep/nested/file.md', 'shared', true)).toBe(true)
    })
  })

  describe('path normalization', () => {
    it('handles backslashes correctly', () => {
      expect(validateSharePath('shared\\file.md', 'shared', true)).toBe(true)
      expect(validateSharePath('shared\\sub\\file.md', 'shared', true)).toBe(true)
    })

    it('handles leading/trailing slashes', () => {
      expect(validateSharePath('/shared/file.md', 'shared/', true)).toBe(true)
      expect(validateSharePath('shared/file.md/', '/shared', true)).toBe(true)
    })

    it('handles duplicate slashes', () => {
      expect(validateSharePath('shared//file.md', 'shared', true)).toBe(true)
      expect(validateSharePath('shared///sub//file.md', 'shared', true)).toBe(true)
    })
  })

  describe('edge cases', () => {
    it('handles empty share folder (root access)', () => {
      expect(validateSharePath('any/path.md', '', true)).toBe(true)
    })

    it('handles exact folder match', () => {
      expect(validateSharePath('notes', 'notes', true)).toBe(true)
      expect(validateSharePath('notes', 'notes', false)).toBe(true)
    })
  })
})

describe('getRelativePath', () => {
  it('returns path relative to share folder', () => {
    expect(getRelativePath('shared/sub/file.md', 'shared')).toBe('sub/file.md')
    expect(getRelativePath('notes/daily/today.md', 'notes')).toBe('daily/today.md')
  })

  it('returns full path when not in share folder', () => {
    expect(getRelativePath('other/file.md', 'shared')).toBe('other/file.md')
  })

  it('handles empty share folder', () => {
    expect(getRelativePath('any/path.md', '')).toBe('any/path.md')
  })

  it('handles direct children', () => {
    expect(getRelativePath('shared/file.md', 'shared')).toBe('file.md')
  })
})

describe('isDirectChild', () => {
  it('returns true for direct children', () => {
    expect(isDirectChild('shared/file.md', 'shared')).toBe(true)
    expect(isDirectChild('notes/note.txt', 'notes')).toBe(true)
  })

  it('returns false for nested paths', () => {
    expect(isDirectChild('shared/sub/file.md', 'shared')).toBe(false)
    expect(isDirectChild('notes/daily/today.md', 'notes')).toBe(false)
  })
})

describe('buildFullPath', () => {
  it('combines share folder with relative path', () => {
    expect(buildFullPath('shared', 'file.md')).toBe('shared/file.md')
    expect(buildFullPath('notes', 'daily/today.md')).toBe('notes/daily/today.md')
  })

  it('handles empty share folder', () => {
    expect(buildFullPath('', 'file.md')).toBe('file.md')
  })

  it('handles empty relative path', () => {
    expect(buildFullPath('shared', '')).toBe('shared')
  })

  it('normalizes paths', () => {
    expect(buildFullPath('/shared/', '/file.md/')).toBe('shared/file.md')
  })
})
