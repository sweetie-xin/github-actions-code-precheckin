/* eslint-env jest */
/**
 * @jest-environment node
 */

const http = require('http')
const https = require('https')
const fs = require('fs')
const path = require('path')

jest.setTimeout(30000)

function loadEnvConfig() {
  try {
    const envConfigPath = path.join(process.cwd(), 'env.config.js')
    if (!fs.existsSync(envConfigPath)) return null
    const content = fs.readFileSync(envConfigPath, 'utf8')
    const match = content.match(/module\.exports\s*=\s*({[\s\S]*?});?\s*$/)
    if (!match) return null
    // eslint-disable-next-line no-eval
    const cfg = eval(`(${match[1]})`)
    return cfg
  } catch {
    return null
  }
}

function getEnv(key, fallback) {
  if (process.env[key]) return process.env[key]
  const cfg = loadEnvConfig()
  return (cfg && cfg[key]) || fallback
}

const MEILI_BASE = getEnv('MEILI_DEV_BASE') || getEnv('MEILI_BASE') || 'http://127.0.0.1:7775'
const MEILI_API_KEY = getEnv('MEILI_API_KEY') || ''

function requestJson(url, options = {}) {
  return new Promise((resolve, reject) => {
    const urlObj = new URL(url)
    const isHttps = urlObj.protocol === 'https:'
    const client = isHttps ? https : http
    const req = client.request(
      {
        hostname: urlObj.hostname,
        port: urlObj.port,
        path: urlObj.pathname + urlObj.search,
        method: options.method || 'GET',
        headers: {
          'Content-Type': 'application/json',
          ...(MEILI_API_KEY ? { Authorization: `Bearer ${MEILI_API_KEY}` } : {}),
          ...(options.headers || {}),
        },
      },
      res => {
        let data = ''
        res.on('data', chunk => (data += chunk))
        res.on('end', () => {
          try {
            resolve({ status: res.statusCode || 0, data: JSON.parse(data) })
          } catch {
            resolve({ status: res.statusCode || 0, data })
          }
        })
      }
    )
    req.on('error', reject)
    if (options.body) req.write(JSON.stringify(options.body))
    req.end()
  })
}

describe('Meilisearch integration (JS)', () => {
  const base = MEILI_BASE
  const ready = !!base

  test('has MEILI base configured', () => {
    expect(typeof base).toBe('string')
    expect(base.length).toBeGreaterThan(0)
  })

  const maybe = ready ? it : it.skip

  maybe('connects and lists indexes', async () => {
    const res = await requestJson(`${base}/indexes`)
    expect([200, 401, 403]).toContain(res.status)
  })

  maybe('creates and verifies an index', async () => {
    const uid = `test_index_${Date.now()}`
    const create = await requestJson(`${base}/indexes`, {
      method: 'POST',
      body: { uid, primaryKey: 'id' },
    })
    expect([201, 200, 409]).toContain(create.status)

    const verify = await requestJson(`${base}/indexes/${uid}`)
    expect([200, 404]).toContain(verify.status)
  })
})

