// Using Jest globals; no import

// 模拟的异步工具函数
const asyncUtils = {
  // 延迟函数
  delay: (ms: number): Promise<void> => {
    return new Promise(resolve => setTimeout(resolve, ms))
  },

  // 模拟API调用
  fetchData: async (id: number): Promise<any> => {
    // 模拟网络延迟
    await new Promise(resolve => setTimeout(resolve, 100))
    
    if (id === 0) {
      throw new Error('Invalid ID')
    }
    
    return {
      id,
      name: `User ${id}`,
      email: `user${id}@example.com`,
      createdAt: new Date().toISOString()
    }
  },

  // 批量处理数据
  processBatch: async (items: any[], processor: (item: any) => Promise<any>): Promise<any[]> => {
    const results = []
    for (const item of items) {
      try {
        const result = await processor(item)
        results.push(result)
      } catch (error) {
        results.push({ error: error.message })
      }
    }
    return results
  },

  // 重试机制
  retryOperation: async <T>(
    operation: () => Promise<T>,
    maxRetries: number = 3,
    delay: number = 1000
  ): Promise<T> => {
    let lastError: Error
    
    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        return await operation()
      } catch (error) {
        lastError = error as Error
        
        if (attempt === maxRetries) {
          throw lastError
        }
        
        // 等待后重试
        await new Promise(resolve => setTimeout(resolve, delay))
      }
    }
    
    throw lastError!
  },

  // 超时控制
  withTimeout: async <T>(
    promise: Promise<T>,
    timeoutMs: number
  ): Promise<T> => {
    const timeoutPromise = new Promise<never>((_, reject) => {
      setTimeout(() => reject(new Error('Operation timed out')), timeoutMs)
    })
    
    return Promise.race([promise, timeoutPromise])
  }
}

describe('Async Utils', () => {
  beforeEach(() => {
    // 重置所有定时器
    jest.useFakeTimers()
  })

  afterEach(() => {
    // 恢复真实定时器
    jest.useRealTimers()
    // 清理所有模拟
    jest.clearAllMocks()
  })

  describe('delay', () => {
    it('应该正确延迟指定时间', async () => {
      const startTime = Date.now()
      const delayPromise = asyncUtils.delay(1000)
      
      // 快进时间
      jest.advanceTimersByTime(1000)
      
      await delayPromise
      const endTime = Date.now()
      
      // 由于使用了假定时器，实际时间应该很短
      expect(endTime - startTime).toBeLessThan(100)
    })

    it('应该处理0毫秒延迟', async () => {
      const startTime = Date.now()
      await asyncUtils.delay(0)
      const endTime = Date.now()
      
      expect(endTime - startTime).toBeLessThan(100)
    })
  })

  describe('fetchData', () => {
    it('应该成功获取数据', async () => {
      const data = await asyncUtils.fetchData(1)
      
      expect(data).toEqual({
        id: 1,
        name: 'User 1',
        email: 'user1@example.com',
        createdAt: expect.any(String)
      })
    })

    it('应该抛出错误当ID为0', async () => {
      await expect(asyncUtils.fetchData(0)).rejects.toThrow('Invalid ID')
    })

    it('应该处理多个并发请求', async () => {
      const promises = [
        asyncUtils.fetchData(1),
        asyncUtils.fetchData(2),
        asyncUtils.fetchData(3)
      ]
      
      const results = await Promise.all(promises)
      
      expect(results).toHaveLength(3)
      expect(results[0].id).toBe(1)
      expect(results[1].id).toBe(2)
      expect(results[2].id).toBe(3)
    })
  })

  describe('processBatch', () => {
    it('应该处理批量数据', async () => {
      const items = [1, 2, 3, 4, 5]
      const processor = async (item: number) => item * 2
      
      const results = await asyncUtils.processBatch(items, processor)
      
      expect(results).toEqual([2, 4, 6, 8, 10])
    })

    it('应该处理处理器中的错误', async () => {
      const items = [1, 2, 3]
      const processor = async (item: number) => {
        if (item === 2) {
          throw new Error('Processing failed')
        }
        return item * 2
      }
      
      const results = await asyncUtils.processBatch(items, processor)
      
      expect(results).toEqual([2, { error: 'Processing failed' }, 6])
    })

    it('应该处理空数组', async () => {
      const results = await asyncUtils.processBatch([], async (item: any) => item)
      expect(results).toEqual([])
    })
  })

  describe('retryOperation', () => {
    it('应该成功执行操作', async () => {
      const operation = jest.fn().mockResolvedValue('success')
      
      const result = await asyncUtils.retryOperation(operation)
      
      expect(result).toBe('success')
      expect(operation).toHaveBeenCalledTimes(1)
    })

    it('应该重试失败的操作', async () => {
      const operation = jest.fn()
        .mockRejectedValueOnce(new Error('First attempt failed'))
        .mockRejectedValueOnce(new Error('Second attempt failed'))
        .mockResolvedValue('success')
      
      const result = await asyncUtils.retryOperation(operation, 3, 100)
      
      expect(result).toBe('success')
      expect(operation).toHaveBeenCalledTimes(3)
    })

    it('应该在最大重试次数后失败', async () => {
      const operation = jest.fn().mockRejectedValue(new Error('Always fails'))
      
      await expect(asyncUtils.retryOperation(operation, 2)).rejects.toThrow('Always fails')
      expect(operation).toHaveBeenCalledTimes(2)
    })

    it('应该使用默认重试参数', async () => {
      const operation = jest.fn().mockRejectedValue(new Error('Fails'))
      
      await expect(asyncUtils.retryOperation(operation)).rejects.toThrow('Fails')
      expect(operation).toHaveBeenCalledTimes(3) // 默认3次
    })
  })

  describe('withTimeout', () => {
    it('应该在超时前完成操作', async () => {
      const fastOperation = Promise.resolve('success')
      
      const result = await asyncUtils.withTimeout(fastOperation, 1000)
      
      expect(result).toBe('success')
    })

    it('应该在超时时抛出错误', async () => {
      const slowOperation = new Promise(resolve => {
        setTimeout(() => resolve('success'), 2000)
      })
      
      await expect(asyncUtils.withTimeout(slowOperation, 1000)).rejects.toThrow('Operation timed out')
    })

    it('应该处理立即失败的操作', async () => {
      const failingOperation = Promise.reject(new Error('Operation failed'))
      
      await expect(asyncUtils.withTimeout(failingOperation, 1000)).rejects.toThrow('Operation failed')
    })
  })

  // 集成测试
  describe('集成测试', () => {
    it('应该组合多个异步操作', async () => {
      // 模拟一个复杂的异步工作流
      const workflow = async () => {
        // 1. 获取数据
        const data = await asyncUtils.fetchData(1)
        
        // 2. 处理数据
        const processedData = await asyncUtils.processBatch([data], async (item) => ({
          ...item,
          processed: true,
          timestamp: Date.now()
        }))
        
        // 3. 验证结果
        return processedData[0]
      }
      
      const result = await asyncUtils.withTimeout(workflow(), 5000)
      
      expect(result).toHaveProperty('id', 1)
      expect(result).toHaveProperty('processed', true)
      expect(result).toHaveProperty('timestamp')
    })
  })

  // 性能测试
  describe('性能测试', () => {
    it('应该高效处理大量并发请求', async () => {
      const startTime = Date.now()
      
      const promises = Array.from({ length: 100 }, (_, i) => 
        asyncUtils.fetchData(i + 1)
      )
      
      const results = await Promise.all(promises)
      const endTime = Date.now()
      
      expect(results).toHaveLength(100)
      expect(endTime - startTime).toBeLessThan(1000) // 期望在1秒内完成
    })
  })

  // 错误处理测试
  describe('错误处理', () => {
    it('应该正确处理各种类型的错误', async () => {
      const errorTypes = [
        new Error('Standard error'),
        new TypeError('Type error'),
        new RangeError('Range error'),
        'String error',
        123
      ]
      
      for (const error of errorTypes) {
        const operation = jest.fn().mockRejectedValue(error)
        
        if (error instanceof Error) {
          await expect(asyncUtils.retryOperation(operation, 1)).rejects.toThrow(error.message)
        } else {
          await expect(asyncUtils.retryOperation(operation, 1)).rejects.toBe(error)
        }
      }
    })
  })
})
