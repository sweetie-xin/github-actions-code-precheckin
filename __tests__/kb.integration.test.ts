/* eslint-env jest */
/**
 * @jest-environment node
 */

 

// In-memory notebooks store to mock config file operations
let memoryNotebooks: any[] = []

jest.mock('@/app/lib/configUtils', () => ({
  readConfig: jest.fn((filename: string) => memoryNotebooks),
  writeConfig: jest.fn((config: any, filename: string) => {
    memoryNotebooks = config
    return { success: true }
  }),
  readConfigAsync: jest.fn(async (filename: string) => memoryNotebooks),
  writeConfigAsync: jest.fn(async (config: any, filename: string) => {
    memoryNotebooks = config
    return { success: true }
  }),
}))

jest.mock('@/app/server-lib/meili.setup', () => {
  const createMeiliIndex = jest.fn(async (_indexName: string) => ({ uid: _indexName }))
  const deleteMeiliIndex = jest.fn(async (_indexName: string) => ({ success: true }))
  const indexExists = jest.fn(async (_indexName: string) => true)
  let simulatedCapacityBytes = 0
  const meiliClient = {
    getIndex: jest.fn(async (_indexName: string) => ({
      addDocuments: jest.fn(async (docs: any[]) => {
        // 简单统计容量：累加 content 的总字节数，附加一点开销
        const bytes = docs.reduce((acc, d) => acc + (typeof d.content === 'string' ? Buffer.byteLength(d.content, 'utf8') : 0), 0)
        simulatedCapacityBytes += bytes + Math.ceil(bytes * 0.05)
        return { taskUid: 1 }
      }),
    })),
  }
  // 暴露一个只读 getter 供测试断言容量
  Object.defineProperty(meiliClient, '__simulatedCapacityBytes', {
    get() { return simulatedCapacityBytes },
  })
  return { createMeiliIndex, deleteMeiliIndex, indexExists, meiliClient }
})

describe('Knowledge Base creation and attachments', () => {
  beforeEach(() => {
    memoryNotebooks = []
    jest.clearAllMocks()
  })

  it('returns 400 when all uploaded files exceed 50MB', async () => {
    const { POST: uploadFiles } = require('@/app/api/files/upload/route')

    // Mock a large file object that exceeds 50MB; arrayBuffer won't be called due to size pre-check
    const largeFile = {
      name: 'huge.pdf',
      size: 60 * 1024 * 1024,
      arrayBuffer: async () => new ArrayBuffer(0),
    }

    const formDataMock = {
      getAll: (key: string) => (key === 'file' ? [largeFile] : []),
      get: (key: string) => (key === 'knowledgeLabel' ? '1' : null),
    }

    const req: any = {
      formData: async () => formDataMock,
    }

    const res: any = await uploadFiles(req)
    expect(res.status).toBe(400)
    const body = await res.json()
    expect(body).toHaveProperty('error')
  })

  it('creates a new knowledge base and initializes Meili index', async () => {
    const { POST: createKB } = require('@/app/api/kb/route')

    const payload = {
      title: '知识库1',
      date: '2025-01-01 10:00:00',
      creator: 'tester',
      icon: '📘',
      bgColor: 'bg-gray-100',
    }

    const req: any = { json: async () => payload }
    const res: any = await createKB(req)
    const created = await res.json()

    expect(created).toMatchObject({
      id: 1,
      title: payload.title,
      sources: 0,
      creator: payload.creator,
    })

    // write should be called with the new notebook at the front
    expect(memoryNotebooks).toHaveLength(1)
    expect(memoryNotebooks[0].id).toBe(1)

    // index creation called with kb_<id>
    const { createMeiliIndex } = require('@/app/server-lib/meili.setup')
    expect(createMeiliIndex).toHaveBeenCalledWith('kb_1')
  })

  it('adds attachments metadata of multiple formats to an existing KB', async () => {
    // Seed a KB
    memoryNotebooks = [
      { id: 1, title: '知识库1', date: '2025-01-01', creator: 'tester', sources: 0, icon: '📘', bgColor: 'bg-gray-100', files: [] },
    ]

    const { POST: addFileMeta } = require('@/app/api/kb/[id]/route')

    const attachments = [
      { name: 'doc.pdf', type: 'pdf' },
      { name: 'slides.pptx', type: 'pptx' },
      { name: 'sheet.xlsx', type: 'xlsx' },
      { name: 'note.txt', type: 'txt' },
      { name: 'README.md', type: 'md' },
      { name: 'image.jpg', type: 'jpg' },
      { name: 'data.csv', type: 'csv' },
      { name: 'report.docx', type: 'docx' },
    ]

    for (const fileMeta of attachments) {
      const req: any = {
        url: 'http://localhost/api/kb/1',
        json: async () => ({ fileMeta }),
      }
      const res: any = await addFileMeta(req)
      const body = await res.json()
      expect(body).toEqual({ success: true })
    }

    expect(memoryNotebooks[0].files).toHaveLength(attachments.length)
    expect(memoryNotebooks[0].sources).toBe(attachments.length)

    // Add duplicate (same name + type) should be skipped
    const dupReq: any = {
      url: 'http://localhost/api/kb/1',
      json: async () => ({ fileMeta: { name: 'doc.pdf', type: 'pdf' } }),
    }
    const dupRes: any = await addFileMeta(dupReq)
    await dupRes.json()
    expect(memoryNotebooks[0].files).toHaveLength(attachments.length)
  })

  it('returns 200 when adding attachment to an existing KB (seeded)', async () => {
    // Seed KB with id 999 to ensure success
    memoryNotebooks = [
      { id: 999, title: '知识库999', date: '2025-01-01', creator: 'tester', sources: 0, icon: '📘', bgColor: 'bg-gray-100', files: [] },
    ]
    const { POST: addFileMeta } = require('@/app/api/kb/[id]/route')

    const req: any = {
      url: 'http://localhost/api/kb/999',
      json: async () => ({ fileMeta: { name: 'x.txt', type: 'txt' } }),
    }
    const res: any = await addFileMeta(req)
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body).toEqual({ success: true })
    // Confirm file appended
    expect(memoryNotebooks[0].files).toEqual(expect.arrayContaining([{ name: 'x.txt', type: 'txt' }]))
  })

  it('stress: creates many knowledge bases in a loop and triggers index creation', async () => {
    const { POST: createKB } = require('@/app/api/kb/route')

    const N = Number(process.env.KB_STRESS_N || 200)

    for (let i = 0; i < N; i++) {
      const payload = {
        title: `KB_${i + 1}`,
        date: '2025-01-01 10:00:00',
        creator: 'tester',
        icon: '📘',
        bgColor: 'bg-gray-100',
      }
      const req: any = { json: async () => payload }
      const res: any = await createKB(req)
      expect(res.status).toBe(200)
      const created = await res.json()
      expect(created).toHaveProperty('id')
    }

    // Should have N notebooks in memory
    expect(memoryNotebooks.length).toBe(N)

    // With mocked meili, ensure called N times
    const { createMeiliIndex } = require('@/app/server-lib/meili.setup')
    expect(createMeiliIndex).toHaveBeenCalledTimes(N)
  })

  it('stress: for each KB, uploads multiple files of varying sizes and checks capacity limits', async () => {
    const { POST: createKB } = require('@/app/api/kb/route')
    const { POST: uploadFiles } = require('@/app/api/files/upload/route')

    // Prepare two KBs to simulate concurrent-like usage in sequence
    const makeKB = async (title: string) => {
      const req: any = { json: async () => ({ title, date: '2025-01-01 10:00:00', creator: 'tester', icon: '📘', bgColor: 'bg' }) }
      const res: any = await createKB(req)
      const kb = await res.json()
      return kb.id
    }

    const kbCount = 5
    const kbIds: number[] = []
    for (let i = 0; i < kbCount; i++) {
      kbIds.push(await makeKB(`KB_Upload_${i + 1}`))
    }

    // Helper to generate mock file of given size in MB
    const genFile = (name: string, mb: number, mime = 'application/octet-stream') => {
      const size = Math.max(0, Math.floor(mb * 1024 * 1024))
      // 仅用很小的 buffer，但通过 __forceSizeBytes 注入 size，避免真实大内存分配
      const tiny = Buffer.alloc(Math.min(size, 1024), 0x61)
      return new File([tiny], name, { type: mime, __forceSizeBytes: size })
    }

    // For each KB, attempt uploads of multiple files and assert behavior
    for (const id of kbIds) {
      // Case A: all small files (<50MB) should succeed with 200
      {
        const formDataMockA = {
          getAll: (key: string) => (key === 'file' ? [
            genFile('a1.pdf', 1, 'application/pdf'),
            genFile('a2.txt', 0.5, 'text/plain'),
            genFile('a3.csv', 2, 'text/csv'),
          ] : []),
          get: (key: string) => (key === 'knowledgeLabel' ? String(id) : null),
        }
        const reqA: any = { formData: async () => formDataMockA }
        const resA: any = await uploadFiles(reqA)
        const bodyA = await resA.json()
        if (resA.status !== 200) {
          const { meiliClient } = require('@/app/server-lib/meili.setup')
          throw new Error(`Case A failed with status ${resA.status}. Meili simulated capacity bytes=${meiliClient.__simulatedCapacityBytes}`)
        }
        expect(bodyA).toHaveProperty('files')
      }

      // Case B: mix of small and large files; should still succeed (200) because at least one file processed
      {
        const formDataMockB = {
          getAll: (key: string) => (key === 'file' ? [
            genFile('b1.pdf', 60, 'application/pdf'), // >50MB should fail internally
            genFile('b2.txt', 1, 'text/plain'),      // small should succeed
          ] : []),
          get: (key: string) => (key === 'knowledgeLabel' ? String(id) : null),
        }
        const reqB: any = { formData: async () => formDataMockB }
        const resB: any = await uploadFiles(reqB)
        const bodyB = await resB.json()
        if (resB.status !== 200) {
          const { meiliClient } = require('@/app/server-lib/meili.setup')
          throw new Error(`Case B failed with status ${resB.status}. Meili simulated capacity bytes=${meiliClient.__simulatedCapacityBytes}`)
        }
        expect(bodyB).toHaveProperty('files')
      }

      // Case C: all large files (>50MB); should return 400
      {
        const formDataMockC = {
          getAll: (key: string) => (key === 'file' ? [
            genFile('c1.pdf', 80, 'application/pdf'),
            genFile('c2.docx', 120, 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'),
          ] : []),
          get: (key: string) => (key === 'knowledgeLabel' ? String(id) : null),
        }
        const reqC: any = { formData: async () => formDataMockC }
        const resC: any = await uploadFiles(reqC)
        const bodyC = await resC.json()
        if (resC.status !== 400) {
          const { meiliClient } = require('@/app/server-lib/meili.setup')
          throw new Error(`Case C expected 400 but got ${resC.status}. Meili simulated capacity bytes=${meiliClient.__simulatedCapacityBytes}`)
        }
        expect(bodyC).toHaveProperty('error')
      }
    }
  })

  it('complete workflow: creates KB, uploads files, then deletes KB', async () => {
    // Step 1: Create a new knowledge base
    const { POST: createKB } = require('@/app/api/kb/route')
    
    const kbPayload = {
      title: '测试知识库',
      date: '2025-01-01 10:00:00',
      creator: 'tester',
      icon: '📚',
      bgColor: 'bg-blue-100',
    }

    const createReq: any = { json: async () => kbPayload }
    const createRes: any = await createKB(createReq)
    const createdKB = await createRes.json()

    expect(createdKB).toMatchObject({
      id: expect.any(Number),
      title: kbPayload.title,
      sources: 0,
      creator: kbPayload.creator,
      icon: kbPayload.icon,
      bgColor: kbPayload.bgColor,
    })

    const kbId = createdKB.id
    expect(memoryNotebooks).toHaveLength(1)
    expect(memoryNotebooks[0].id).toBe(kbId)

    // Verify Meili index was created
    const { createMeiliIndex } = require('@/app/server-lib/meili.setup')
    expect(createMeiliIndex).toHaveBeenCalledWith(`kb_${kbId}`)

    // Step 2: Upload multiple files to the knowledge base
    const { POST: uploadFiles } = require('@/app/api/files/upload/route')
    
    // Create mock files of different types and sizes
    const mockFiles = [
      {
        name: 'document.pdf',
        size: 2 * 1024 * 1024, // 2MB
        type: 'application/pdf',
        arrayBuffer: async () => new ArrayBuffer(2 * 1024 * 1024),
      },
      {
        name: 'presentation.pptx',
        size: 5 * 1024 * 1024, // 5MB
        type: 'application/vnd.openxmlformats-officedocument.presentationml.presentation',
        arrayBuffer: async () => new ArrayBuffer(5 * 1024 * 1024),
      },
      {
        name: 'spreadsheet.xlsx',
        size: 1 * 1024 * 1024, // 1MB
        type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        arrayBuffer: async () => new ArrayBuffer(1 * 1024 * 1024),
      },
      {
        name: 'text.txt',
        size: 0.1 * 1024 * 1024, // 100KB
        type: 'text/plain',
        arrayBuffer: async () => new ArrayBuffer(0.1 * 1024 * 1024),
      },
    ]

    const formDataMock = {
      getAll: (key: string) => (key === 'file' ? mockFiles : []),
      get: (key: string) => (key === 'knowledgeLabel' ? String(kbId) : null),
    }

    const uploadReq: any = { formData: async () => formDataMock }
    const uploadRes: any = await uploadFiles(uploadReq)
    
    expect(uploadRes.status).toBe(200)
    const uploadBody = await uploadRes.json()
    expect(uploadBody).toHaveProperty('files')
    expect(Array.isArray(uploadBody.files)).toBe(true)

    // Step 3: Add file metadata to the knowledge base
    const { POST: addFileMeta } = require('@/app/api/kb/[id]/route')
    
    for (const file of mockFiles) {
      const fileMetaReq: any = {
        url: `http://localhost/api/kb/${kbId}`,
        json: async () => ({ 
          fileMeta: { 
            name: file.name, 
            type: file.type.split('/').pop() || file.type 
          } 
        }),
      }
      const fileMetaRes: any = await addFileMeta(fileMetaReq)
      expect(fileMetaRes.status).toBe(200)
      const fileMetaBody = await fileMetaRes.json()
      expect(fileMetaBody).toEqual({ success: true })
    }

    // Verify files were added to the knowledge base
    expect(memoryNotebooks[0].files).toHaveLength(mockFiles.length)
    expect(memoryNotebooks[0].sources).toBe(mockFiles.length)
    expect(memoryNotebooks[0].files).toEqual(
      expect.arrayContaining([
        { name: 'document.pdf', type: 'pdf' },
        { name: 'presentation.pptx', type: 'pptx' },
        { name: 'spreadsheet.xlsx', type: 'xlsx' },
        { name: 'text.txt', type: 'txt' },
      ])
    )

    // Step 4: Verify Meili index has documents (simulated)
    const { meiliClient } = require('@/app/server-lib/meili.setup')
    expect(meiliClient.getIndex).toHaveBeenCalledWith(`kb_${kbId}`)

    // Step 5: Delete the entire knowledge base
    const { DELETE: deleteKB } = require('@/app/api/kb/route')
    
    const deleteReq: any = { json: async () => ({ id: kbId }) }
    const deleteRes: any = await deleteKB(deleteReq)
    
    expect(deleteRes.status).toBe(200)
    const deleteBody = await deleteRes.json()
    expect(deleteBody).toEqual({ success: true })

    // Verify knowledge base was removed from memory
    expect(memoryNotebooks).toHaveLength(0)

    // Verify Meili index was deleted
    const { deleteMeiliIndex } = require('@/app/server-lib/meili.setup')
    expect(deleteMeiliIndex).toHaveBeenCalledWith(`kb_${kbId}`)

    // Step 6: Verify that attempting to access the deleted KB returns 404
    const getFilesReq: any = {
      nextUrl: {
        searchParams: {
          get: (key: string) => key === 'notebookId' ? String(kbId) : null
        }
      }
    }
    
    const { GET: getFiles } = require('@/app/api/kb/[id]/route')
    const getFilesRes: any = await getFiles(getFilesReq)
    expect(getFilesRes.status).toBe(404)
    const getFilesBody = await getFilesRes.json()
    expect(getFilesBody).toHaveProperty('error')
    expect(getFilesBody.error).toBe('知识库不存在')

    // Step 7: Verify that attempting to add files to deleted KB returns 404
    const addFileToDeletedReq: any = {
      url: `http://localhost/api/kb/${kbId}`,
      json: async () => ({ 
        fileMeta: { name: 'newfile.pdf', type: 'pdf' } 
      }),
    }
    
    const addFileToDeletedRes: any = await addFileMeta(addFileToDeletedReq)
    expect(addFileToDeletedRes.status).toBe(404)
    const addFileToDeletedBody = await addFileToDeletedRes.json()
    expect(addFileToDeletedBody).toHaveProperty('error')
    expect(addFileToDeletedBody.error).toBe('知识库不存在')
  })

  it('stress: creates multiple KBs with files, then deletes them all', async () => {
    const { POST: createKB } = require('@/app/api/kb/route')
    const { POST: uploadFiles } = require('@/app/api/kb/[id]/route')
    const { DELETE: deleteKB } = require('@/app/api/kb/route')
    
    const kbCount = 10
    const kbIds: number[] = []
    
    // Create multiple knowledge bases
    for (let i = 0; i < kbCount; i++) {
      const kbPayload = {
        title: `压力测试知识库_${i + 1}`,
        date: '2025-01-01 10:00:00',
        creator: 'tester',
        icon: '📖',
        bgColor: 'bg-green-100',
      }
      
      const createReq: any = { json: async () => kbPayload }
      const createRes: any = await createKB(createReq)
      const createdKB = await createRes.json()
      
      expect(createdKB.id).toBe(i + 1)
      kbIds.push(createdKB.id)
    }
    
    expect(memoryNotebooks).toHaveLength(kbCount)
    
    // Add files to each knowledge base
    for (const kbId of kbIds) {
      const mockFiles = [
        { name: `file1_${kbId}.pdf`, type: 'pdf' },
        { name: `file2_${kbId}.txt`, type: 'txt' },
        { name: `file3_${kbId}.docx`, type: 'docx' },
      ]
      
      for (const file of mockFiles) {
        const fileMetaReq: any = {
          url: `http://localhost/api/kb/${kbId}`,
          json: async () => ({ fileMeta: file }),
        }
        const fileMetaRes: any = await addFileMeta(fileMetaReq)
        expect(fileMetaRes.status).toBe(200)
      }
    }
    
    // Verify all files were added
    for (let i = 0; i < kbCount; i++) {
      expect(memoryNotebooks[i].files).toHaveLength(3)
      expect(memoryNotebooks[i].sources).toBe(3)
    }
    
    // Delete all knowledge bases in reverse order
    for (let i = kbIds.length - 1; i >= 0; i--) {
      const kbId = kbIds[i]
      const deleteReq: any = { json: async () => ({ id: kbId }) }
      const deleteRes: any = await deleteKB(deleteReq)
      
      expect(deleteRes.status).toBe(200)
      const deleteBody = await deleteRes.json()
      expect(deleteBody).toEqual({ success: true })
    }
    
    // Verify all knowledge bases were deleted
    expect(memoryNotebooks).toHaveLength(0)
    
    // Verify Meili indexes were created and deleted
    const { createMeiliIndex, deleteMeiliIndex } = require('@/app/server-lib/meili.setup')
    expect(createMeiliIndex).toHaveBeenCalledTimes(kbCount)
    expect(deleteMeiliIndex).toHaveBeenCalledTimes(kbCount)
    
    // Verify each index name was handled correctly
    for (const kbId of kbIds) {
      expect(createMeiliIndex).toHaveBeenCalledWith(`kb_${kbId}`)
      expect(deleteMeiliIndex).toHaveBeenCalledWith(`kb_${kbId}`)
    }
  })
})


