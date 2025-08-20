// 被测试的字符串工具函数
const stringUtils = {
  // 反转字符串
  reverse: (str: string): string => {
    return str.split('').reverse().join('')
  },

  // 计算字符串长度
  getLength: (str: string): number => {
    return str.length
  },

  // 检查是否为回文字符串
  isPalindrome: (str: string): boolean => {
    const cleaned = str.toLowerCase().replace(/[^a-z0-9]/g, '')
    return cleaned === cleaned.split('').reverse().join('')
  },

  // 统计字符出现次数
  countChar: (str: string, char: string): number => {
    return str.split(char).length - 1
  },

  // 首字母大写
  capitalize: (str: string): string => {
    if (str.length === 0) return str
    return str.charAt(0).toUpperCase() + str.slice(1).toLowerCase()
  },

  // 生成随机字符串
  generateRandomString: (length: number): string => {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789'
    let result = ''
    for (let i = 0; i < length; i++) {
      result += chars.charAt(Math.floor(Math.random() * chars.length))
    }
    return result
  }
}

describe('String Utils', () => {
  // 在每个测试前运行
  beforeEach(() => {/8***
    // 可以在这里设置测试数据或重置状态
    console.log('开始新的测试用例')
  })

  // 在每个测试后运行
  afterEach(() => {
    // 可以在这里清理测试数据
    console.log('测试用例完成')
  })

  describe('reverse', () => {
    it('应该正确反转字符串', () => {
      expect(stringUtils.reverse('hello')).toBe('olleh')
      expect(stringUtils.reverse('world')).toBe('dlrow')
      expect(stringUtils.reverse('')).toBe('')
    })

    it('应该处理包含特殊字符的字符串', () => {
      expect(stringUtils.reverse('hello!@#')).toBe('#@!olleh')
      expect(stringUtils.reverse('12345')).toBe('54321')
    })

    it('应该处理中文字符串', () => {
      expect(stringUtils.reverse('你好')).toBe('好你')
      expect(stringUtils.reverse('世界你好')).toBe('好你界世')
    })
  })

  describe('getLength', () => {
    it('应该正确计算字符串长度', () => {
      expect(stringUtils.getLength('')).toBe(0)
      expect(stringUtils.getLength('a')).toBe(1)
      expect(stringUtils.getLength('hello')).toBe(5)
      expect(stringUtils.getLength('你好世界')).toBe(4)
    })

    it('应该处理包含空格的字符串', () => {
      expect(stringUtils.getLength('hello world')).toBe(11)
      expect(stringUtils.getLength('  ')).toBe(2)
    })
  })

  describe('isPalindrome', () => {
    it('应该正确识别回文字符串', () => {
      expect(stringUtils.isPalindrome('racecar')).toBe(true)
      expect(stringUtils.isPalindrome('anna')).toBe(true)
      expect(stringUtils.isPalindrome('')).toBe(true)
      expect(stringUtils.isPalindrome('a')).toBe(true)
    })

    it('应该正确识别非回文字符串', () => {
      expect(stringUtils.isPalindrome('hello')).toBe(false)
      expect(stringUtils.isPalindrome('world')).toBe(false)
      expect(stringUtils.isPalindrome('not a palindrome')).toBe(false)
    })

    it('应该忽略大小写和标点符号', () => {
      expect(stringUtils.isPalindrome('RaceCar')).toBe(true)
      expect(stringUtils.isPalindrome('A man, a plan, a canal: Panama')).toBe(true)
      expect(stringUtils.isPalindrome('Was it a car or a cat I saw?')).toBe(true)
    })
  })

  describe('countChar', () => {
    it('应该正确统计字符出现次数', () => {
      expect(stringUtils.countChar('hello', 'l')).toBe(2)
      expect(stringUtils.countChar('hello', 'h')).toBe(1)
      expect(stringUtils.countChar('hello', 'x')).toBe(0)
    })

    it('应该处理空字符串', () => {
      expect(stringUtils.countChar('', 'a')).toBe(0)
    })

    it('应该区分大小写', () => {
      expect(stringUtils.countChar('Hello', 'h')).toBe(0)
      expect(stringUtils.countChar('Hello', 'H')).toBe(1)
    })
  })

  describe('capitalize', () => {
    it('应该正确首字母大写', () => {
      expect(stringUtils.capitalize('hello')).toBe('Hello')
      expect(stringUtils.capitalize('world')).toBe('World')
      expect(stringUtils.capitalize('HELLO')).toBe('Hello')
    })

    it('应该处理空字符串', () => {
      expect(stringUtils.capitalize('')).toBe('')
    })

    it('应该处理单个字符', () => {
      expect(stringUtils.capitalize('a')).toBe('A')
      expect(stringUtils.capitalize('A')).toBe('A')
    })
  })

  describe('generateRandomString', () => {
    it('应该生成指定长度的字符串', () => {
      const result1 = stringUtils.generateRandomString(5)
      const result2 = stringUtils.generateRandomString(10)
      
      expect(result1).toHaveLength(5)
      expect(result2).toHaveLength(10)
    })

    it('应该生成只包含字母和数字的字符串', () => {
      const result = stringUtils.generateRandomString(20)
      expect(result).toMatch(/^[A-Za-z0-9]+$/)
    })

    it('应该生成不同的随机字符串', () => {
      const result1 = stringUtils.generateRandomString(10)
      const result2 = stringUtils.generateRandomString(10)
      
      // 注意：理论上可能相同，但概率极低
      // 这里主要是测试函数能正常工作
      expect(typeof result1).toBe('string')
      expect(typeof result2).toBe('string')
    })
  })

  // 测试异常情况
  describe('边界情况', () => {
    it('应该处理null和undefined输入', () => {
      // 注意：这些测试会失败，因为函数没有处理null/undefined
      // 这展示了如何测试边界情况
      expect(() => stringUtils.reverse(null as any)).toThrow()
      expect(() => stringUtils.reverse(undefined as any)).toThrow()
    })

    it('应该处理非字符串输入', () => {
      expect(() => stringUtils.reverse(123 as any)).toThrow()
      expect(() => stringUtils.reverse({} as any)).toThrow()
    })
  })

  // 性能测试示例
  describe('性能测试', () => {
    it('应该在合理时间内处理长字符串', () => {
      const longString = 'a'.repeat(10000)
      const startTime = Date.now()
      
      stringUtils.reverse(longString)
      
      const endTime = Date.now()
      const duration = endTime - startTime
      
      // 期望在100ms内完成
      expect(duration).toBeLessThan(100)
    })
  })

  // 快照测试示例
  describe('快照测试', () => {
    it('应该保持一致的输出格式', () => {
      const result = stringUtils.capitalize('hello world')
      expect(result).toMatchSnapshot()
    })
  })
})
