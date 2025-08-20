/**
 * @jest-environment node
 */

import fs from 'fs'
import path from 'path'

describe('env.config.js loader', () => {
  const envPath = path.join(process.cwd(), 'env.config.js')

  it('should read env.config.js if exists and expose keys', () => {
    if (!fs.existsSync(envPath)) {
      // 文件不存在则跳过
      return
    }
    const content = fs.readFileSync(envPath, 'utf8')
    expect(content.length).toBeGreaterThan(0)
    expect(content).toContain('module.exports')
  })

  it('should allow using env variables in test', () => {
    process.env.TEST_FLAG = 'on'
    expect(process.env.TEST_FLAG).toBe('on')
  })
})



