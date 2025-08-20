// Using Jest globals

// Mock file utilities
const mockFileUtils = {
  getFileExtension: (filename: string): string => {
    return filename.split('.').pop() || ''
  },
  
  formatFileSize: (bytes: number): string => {
    if (bytes === 0) return '0 Bytes'
    const k = 1024
    const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB']
    const i = Math.floor(Math.log(bytes) / Math.log(k))
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i]
  },
  
  isValidFileType: (filename: string, allowedTypes: string[]): boolean => {
    const extension = filename.split('.').pop()?.toLowerCase() || ''
    return allowedTypes.includes(extension)
  },
  
  sanitizeFileName: (filename: string): string => {
    return filename.replace(/[^a-zA-Z0-9.-]/g, '_')
  }
}

describe('File Utils', () => {
  describe('getFileExtension', () => {
    it('should return correct file extension', () => {
      expect(mockFileUtils.getFileExtension('document.pdf')).toBe('pdf')
      expect(mockFileUtils.getFileExtension('image.jpg')).toBe('jpg')
      expect(mockFileUtils.getFileExtension('script.js')).toBe('js')
    })

    it('should return empty string for files without extension', () => {
      expect(mockFileUtils.getFileExtension('README')).toBe('')
      expect(mockFileUtils.getFileExtension('.gitignore')).toBe('')
    })

    it('should handle files with multiple dots', () => {
      expect(mockFileUtils.getFileExtension('file.backup.txt')).toBe('txt')
      expect(mockFileUtils.getFileExtension('archive.tar.gz')).toBe('gz')
    })
  })

  describe('formatFileSize', () => {
    it('should format bytes correctly', () => {
      expect(mockFileUtils.formatFileSize(0)).toBe('0 Bytes')
      expect(mockFileUtils.formatFileSize(1024)).toBe('1 KB')
      expect(mockFileUtils.formatFileSize(1048576)).toBe('1 MB')
      expect(mockFileUtils.formatFileSize(1073741824)).toBe('1 GB')
    })

    it('should handle decimal sizes', () => {
      expect(mockFileUtils.formatFileSize(1536)).toBe('1.5 KB')
      expect(mockFileUtils.formatFileSize(1572864)).toBe('1.5 MB')
    })
  })

  describe('isValidFileType', () => {
    const allowedTypes = ['pdf', 'docx', 'txt', 'jpg', 'png']

    it('should return true for valid file types', () => {
      expect(mockFileUtils.isValidFileType('document.pdf', allowedTypes)).toBe(true)
      expect(mockFileUtils.isValidFileType('image.JPG', allowedTypes)).toBe(true)
      expect(mockFileUtils.isValidFileType('note.txt', allowedTypes)).toBe(true)
    })

    it('should return false for invalid file types', () => {
      expect(mockFileUtils.isValidFileType('script.js', allowedTypes)).toBe(false)
      expect(mockFileUtils.isValidFileType('data.csv', allowedTypes)).toBe(false)
      expect(mockFileUtils.isValidFileType('archive.zip', allowedTypes)).toBe(false)
    })

    it('should handle case insensitive comparison', () => {
      expect(mockFileUtils.isValidFileType('document.PDF', allowedTypes)).toBe(true)
      expect(mockFileUtils.isValidFileType('image.jpg', allowedTypes)).toBe(true)
    })
  })

  describe('sanitizeFileName', () => {
    it('should remove invalid characters', () => {
      expect(mockFileUtils.sanitizeFileName('file name with spaces.txt')).toBe('file_name_with_spaces.txt')
      expect(mockFileUtils.sanitizeFileName('file@#$%^&*().txt')).toBe('file_______.txt')
      expect(mockFileUtils.sanitizeFileName('file/with\\path.txt')).toBe('file_with_path.txt')
    })

    it('should preserve valid characters', () => {
      expect(mockFileUtils.sanitizeFileName('valid-file-name.txt')).toBe('valid-file-name.txt')
      expect(mockFileUtils.sanitizeFileName('file123.txt')).toBe('file123.txt')
      expect(mockFileUtils.sanitizeFileName('file.name.txt')).toBe('file.name.txt')
    })

    it('should handle empty string', () => {
      expect(mockFileUtils.sanitizeFileName('')).toBe('')
    })
  })
})
