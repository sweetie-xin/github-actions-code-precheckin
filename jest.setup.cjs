require('@testing-library/jest-dom')

// Ensure fetch/Request/Response/Headers exist in Node test env
try {
  const { fetch: undiciFetch, Request: UndiciRequest, Response: UndiciResponse, Headers: UndiciHeaders } = require('undici')
  if (typeof global.fetch === 'undefined') global.fetch = undiciFetch
  if (typeof global.Request === 'undefined') global.Request = UndiciRequest
  if (typeof global.Response === 'undefined') global.Response = UndiciResponse
  if (typeof global.Headers === 'undefined') global.Headers = UndiciHeaders
} catch {}

// Fallback minimal polyfills if undici isn't available
class MinimalHeaders {
  constructor(init = {}) {
    this._map = new Map()
    if (init && typeof init === 'object') {
      Object.entries(init).forEach(([k, v]) => {
        this._map.set(String(k).toLowerCase(), String(v))
      })
    }
  }
  get(name) {
    return this._map.get(String(name).toLowerCase()) || null
  }
  set(name, value) {
    this._map.set(String(name).toLowerCase(), String(value))
  }
  append(name, value) {
    const key = String(name).toLowerCase()
    const cur = this._map.get(key)
    this._map.set(key, cur ? `${cur}, ${value}` : String(value))
  }
  has(name) {
    return this._map.has(String(name).toLowerCase())
  }
  [Symbol.iterator]() {
    return this._map[Symbol.iterator]()
  }
}

class MinimalResponse {
  constructor(body = null, init = {}) {
    this._body = typeof body === 'string' ? body : body == null ? null : JSON.stringify(body)
    this.status = init.status || 200
    this.ok = this.status >= 200 && this.status < 300
    this.headers = init.headers instanceof MinimalHeaders ? init.headers : new MinimalHeaders(init.headers)
  }
  static json(data, init = {}) {
    const headers = init.headers instanceof MinimalHeaders ? init.headers : new MinimalHeaders(init.headers)
    if (!headers.get('content-type')) headers.set('content-type', 'application/json; charset=utf-8')
    return new MinimalResponse(JSON.stringify(data), { ...init, headers })
  }
  async json() {
    try {
      return this._body ? JSON.parse(this._body) : null
    } catch {
      return null
    }
  }
  async text() {
    return this._body ?? ''
  }
}

class MinimalRequest {
  constructor(input, init = {}) {
    this.url = typeof input === 'string' ? input : (input && input.url) || ''
    this.method = init.method || 'GET'
    this.headers = init.headers instanceof MinimalHeaders ? init.headers : new MinimalHeaders(init.headers)
    this._body = init.body
  }
  async json() {
    if (typeof this._body === 'string') {
      try {
        return JSON.parse(this._body)
      } catch {
        return this._body
      }
    }
    return this._body
  }
}

if (typeof global.Headers === 'undefined') {
  global.Headers = MinimalHeaders
}
if (typeof global.Response === 'undefined') {
  global.Response = MinimalResponse
}
if (typeof global.Request === 'undefined') {
  global.Request = MinimalRequest
}

// Ensure static Response.json exists (some environments provide Response but lack this helper)
if (typeof global.Response !== 'undefined' && typeof global.Response.json !== 'function') {
  global.Response.json = (data, init = {}) => {
    const headers = init.headers instanceof global.Headers ? init.headers : new global.Headers(init.headers)
    if (!headers.get('content-type')) headers.set('content-type', 'application/json; charset=utf-8')
    return new global.Response(JSON.stringify(data), { ...init, headers })
  }
}

// Mock Next.js router
jest.mock('next/router', () => ({
  useRouter() {
    return {
      route: '/',
      pathname: '/',
      query: {},
      asPath: '/',
      push: jest.fn(),
      pop: jest.fn(),
      reload: jest.fn(),
      back: jest.fn(),
      prefetch: jest.fn().mockResolvedValue(undefined),
      beforePopState: jest.fn(),
      events: {
        on: jest.fn(),
        off: jest.fn(),
        emit: jest.fn(),
      },
      isFallback: false,
    }
  },
}))

// Mock Next.js navigation
jest.mock('next/navigation', () => ({
  useRouter() {
    return {
      push: jest.fn(),
      replace: jest.fn(),
      prefetch: jest.fn(),
      back: jest.fn(),
      forward: jest.fn(),
      refresh: jest.fn(),
    }
  },
  useSearchParams() {
    return new URLSearchParams()
  },
  usePathname() {
    return '/'
  },
}))

// Mock Next.js server Response helpers for API routes
jest.mock('next/server', () => {
  const NextResponse = {
    json(body, init = {}) {
      const status = typeof init.status === 'number' ? init.status : 200
      return {
        status,
        ok: status >= 200 && status < 300,
        json: async () => body,
        text: async () => (typeof body === 'string' ? body : JSON.stringify(body)),
      }
    },
  }
  class NextRequest {}
  return { NextResponse, NextRequest }
})

// Mock window.matchMedia (only in browser-like env)
if (typeof window !== 'undefined') {
  Object.defineProperty(window, 'matchMedia', {
    writable: true,
    value: jest.fn().mockImplementation(query => ({
      matches: false,
      media: query,
      onchange: null,
      addListener: jest.fn(), // deprecated
      removeListener: jest.fn(), // deprecated
      addEventListener: jest.fn(),
      removeEventListener: jest.fn(),
      dispatchEvent: jest.fn(),
    })),
  })
}

// Mock ResizeObserver (guard for node env)
if (typeof global !== 'undefined') {
  global.ResizeObserver = jest.fn().mockImplementation(() => ({
    observe: jest.fn(),
    unobserve: jest.fn(),
    disconnect: jest.fn(),
  }))
}

// Mock IntersectionObserver (guard for node env)
if (typeof global !== 'undefined') {
  global.IntersectionObserver = jest.fn().mockImplementation(() => ({
    observe: jest.fn(),
    unobserve: jest.fn(),
    disconnect: jest.fn(),
  }))
}

// Mock fetch
global.fetch = jest.fn()

// Mock console methods to reduce noise in tests
const originalError = console.error
const originalWarn = console.warn

beforeAll(() => {
  console.error = (...args) => {
    if (
      typeof args[0] === 'string' &&
      args[0].includes('Warning: ReactDOM.render is no longer supported')
    ) {
      return
    }
    originalError.call(console, ...args)
  }
  console.warn = (...args) => {
    if (
      typeof args[0] === 'string' &&
      args[0].includes('Warning: componentWillReceiveProps has been renamed')
    ) {
      return
    }
    originalWarn.call(console, ...args)
  }
})

afterAll(() => {
  console.error = originalError
  console.warn = originalWarn
})

// Mock Electron APIs
if (typeof window !== 'undefined') {
  window.electronAPI = {
    send: jest.fn(),
    receive: jest.fn(),
    invoke: jest.fn(),
  }
}

// Mock File API (guard for node env)
global.File = class MockFile {
  constructor(bits, name, options = {}) {
    this._bits = Array.isArray(bits) ? bits : [bits]
    this.name = name
    this.size = this._bits.reduce((sum, b) => sum + (typeof b === 'string' ? b.length : (b?.byteLength || 0)), 0)
    this.type = options.type || ''
    this.lastModified = options.lastModified || Date.now()
  }
  async arrayBuffer() {
    const combined = this._bits.map(b => {
      if (typeof b === 'string') return Buffer.from(b, 'utf8')
      if (b instanceof ArrayBuffer) return Buffer.from(b)
      if (ArrayBuffer.isView(b)) return Buffer.from(b.buffer)
      return Buffer.from([])
    })
    return Buffer.concat(combined).buffer
  }
}

global.FileReader = class MockFileReader {
  constructor() {
    this.readyState = 0
    this.result = null
    this.error = null
    this.onload = null
    this.onerror = null
    this.onloadend = null
  }

  readAsText(file) {
    setTimeout(() => {
      this.readyState = 2
      this.result = 'mock file content'
      if (this.onload) this.onload()
      if (this.onloadend) this.onloadend()
    }, 0)
  }

  readAsDataURL(file) {
    setTimeout(() => {
      this.readyState = 2
      this.result = 'data:text/plain;base64,bW9jayBmaWxlIGNvbnRlbnQ='
      if (this.onload) this.onload()
      if (this.onloadend) this.onloadend()
    }, 0)
  }
}


