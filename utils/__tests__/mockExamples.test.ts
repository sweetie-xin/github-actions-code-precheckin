// Using Jest globals provided by the environment (no import)

// 模拟的外部依赖
interface DatabaseService {
  connect(): Promise<void>
  disconnect(): Promise<void>
  query(sql: string, params?: any[]): Promise<any[]>
  transaction<T>(callback: () => Promise<T>): Promise<T>
}

interface LoggerService {
  info(message: string, meta?: any): void
  error(message: string, error?: Error): void
  warn(message: string, meta?: any): void
}

interface EmailService {
  send(to: string, subject: string, body: string): Promise<void>
  sendTemplate(to: string, template: string, data: any): Promise<void>
}

// 被测试的业务逻辑类
class UserService {
  constructor(
    private db: DatabaseService,
    private logger: LoggerService,
    private emailService: EmailService
  ) {}

  async createUser(userData: { name: string; email: string; password: string }): Promise<any> {
    try {
      this.logger.info('Creating new user', { email: userData.email })
      
      if (!userData.email || !userData.name) {
        throw new Error('Invalid user data')
      }

      const existingUsers = await this.db.query(
        'SELECT id FROM users WHERE email = ?',
        [userData.email]
      )
      
      if (existingUsers.length > 0) {
        throw new Error('User with this email already exists')
      }

      const result = await this.db.transaction(async () => {
        const insertResult = await this.db.query(
          'INSERT INTO users (name, email, password_hash, created_at) VALUES (?, ?, ?, ?)',
          [userData.name, userData.email, 'hashed_password', new Date()]
        )
        
        const userId = (insertResult as any).insertId
        
        await this.emailService.sendTemplate(
          userData.email,
          'welcome',
          { name: userData.name, userId }
        )
        
        return { id: userId, name: userData.name, email: userData.email }
      })

      this.logger.info('User created successfully', { userId: result.id })
      return result
      
    } catch (error) {
      this.logger.error('Failed to create user', error as Error)
      throw error
    }
  }

  async getUserById(id: number): Promise<any> {
    try {
      this.logger.info('Fetching user by ID', { userId: id })
      
      const users = await this.db.query('SELECT * FROM users WHERE id = ?', [id])
      
      if (users.length === 0) {
        throw new Error('User not found')
      }
      
      return users[0]
    } catch (error) {
      this.logger.error('Failed to fetch user', error as Error)
      throw error
    }
  }
}

describe('UserService with Mocks', () => {
  let userService: UserService
  let mockDb: jest.Mocked<DatabaseService>
  let mockLogger: jest.Mocked<LoggerService>
  let mockEmailService: jest.Mocked<EmailService>

  beforeEach(() => {
    mockDb = {
      connect: jest.fn(),
      disconnect: jest.fn(),
      query: jest.fn(),
      transaction: jest.fn(),
    } as jest.Mocked<DatabaseService>

    mockLogger = {
      info: jest.fn(),
      error: jest.fn(),
      warn: jest.fn(),
    } as jest.Mocked<LoggerService>

    mockEmailService = {
      send: jest.fn(),
      sendTemplate: jest.fn(),
    } as jest.Mocked<EmailService>

    userService = new UserService(mockDb, mockLogger, mockEmailService)
  })

  afterEach(() => {
    jest.clearAllMocks()
  })

  describe('createUser', () => {
    const validUserData = {
      name: 'John Doe',
      email: 'john@example.com',
      password: 'password123'
    }

    beforeEach(() => {
      mockDb.query.mockResolvedValue([])
      mockDb.transaction.mockImplementation(async (callback: () => Promise<any>) => {
        const result = await callback()
        return result
      })
      mockEmailService.sendTemplate.mockResolvedValue()
    })

    it('应该成功创建用户', async () => {
      mockDb.query
        .mockResolvedValueOnce([])
        .mockResolvedValueOnce({ insertId: 123 })

      const result = await userService.createUser(validUserData)

      expect(result).toEqual({
        id: 123,
        name: 'John Doe',
        email: 'john@example.com'
      })

      expect(mockDb.query).toHaveBeenCalledWith(
        'SELECT id FROM users WHERE email = ?',
        ['john@example.com']
      )

      expect(mockDb.transaction).toHaveBeenCalledTimes(1)
      expect(mockLogger.info).toHaveBeenCalledWith('Creating new user', {
        email: 'john@example.com'
      })
    })

    it('应该拒绝无效的用户数据', async () => {
      const invalidData = { name: '', email: '', password: '123' }

      await expect(userService.createUser(invalidData)).rejects.toThrow('Invalid user data')

      expect(mockDb.query).not.toHaveBeenCalled()
      expect(mockDb.transaction).not.toHaveBeenCalled()
    })

    it('应该拒绝重复的邮箱', async () => {
      mockDb.query.mockResolvedValueOnce([{ id: 1 }])

      await expect(userService.createUser(validUserData)).rejects.toThrow(
        'User with this email already exists'
      )

      expect(mockDb.transaction).not.toHaveBeenCalled()
    })
  })

  describe('getUserById', () => {
    it('应该成功获取用户', async () => {
      const mockUser = {
        id: 123,
        name: 'John Doe',
        email: 'john@example.com',
        created_at: new Date()
      }

      mockDb.query.mockResolvedValue([mockUser])

      const result = await userService.getUserById(123)

      expect(result).toEqual(mockUser)
      expect(mockDb.query).toHaveBeenCalledWith('SELECT * FROM users WHERE id = ?', [123])
    })

    it('应该处理用户不存在的情况', async () => {
      mockDb.query.mockResolvedValue([])

      await expect(userService.getUserById(999)).rejects.toThrow('User not found')
    })
  })

  describe('Mock验证', () => {
    it('应该验证模拟函数的调用次数', async () => {
      mockDb.query.mockResolvedValue([])
      mockDb.transaction.mockImplementation(async (callback: () => Promise<any>) => {
        const result = await callback()
        return result
      })

      await userService.createUser({
        name: 'John Doe',
        email: 'john@example.com',
        password: 'password123'
      })

      expect(mockDb.query).toHaveBeenCalledTimes(2)
      expect(mockDb.transaction).toHaveBeenCalledTimes(1)
      expect(mockLogger.info).toHaveBeenCalledTimes(2)
    })

    it('应该验证模拟函数的调用参数', async () => {
      mockDb.query.mockResolvedValue([])
      mockDb.transaction.mockImplementation(async (callback: () => Promise<any>) => {
        const result = await callback()
        return result
      })

      await userService.createUser({
        name: 'John Doe',
        email: 'john@example.com',
        password: 'password123'
      })

      expect(mockDb.query).toHaveBeenNthCalledWith(
        1,
        'SELECT id FROM users WHERE email = ?',
        ['john@example.com']
      )
    })
  })
})
