// 修复缺失的索引
const https = require('https');
const http = require('http');
const fs = require('fs');
const path = require('path');

const MEILI_BASE = 'http://127.0.0.1:7775';
const MEILI_API_KEY = 'qaz0913cde350odxs';

async function makeRequest(url, options = {}) {
  return new Promise((resolve, reject) => {
    const urlObj = new URL(url);
    const isHttps = urlObj.protocol === 'https:';
    const client = isHttps ? https : http;
    
    const requestOptions = {
      hostname: urlObj.hostname,
      port: urlObj.port,
      path: urlObj.pathname + urlObj.search,
      method: options.method || 'GET',
      headers: {
        'Authorization': `Bearer ${MEILI_API_KEY}`,
        'Content-Type': 'application/json',
        ...options.headers
      }
    };

    const req = client.request(requestOptions, (res) => {
      let data = '';
      res.on('data', (chunk) => {
        data += chunk;
      });
      res.on('end', () => {
        try {
          const jsonData = JSON.parse(data);
          resolve({ status: res.statusCode, data: jsonData });
        } catch (e) {
          resolve({ status: res.statusCode, data: data });
        }
      });
    });

    req.on('error', (err) => {
      reject(err);
    });

    if (options.body) {
      req.write(JSON.stringify(options.body));
    }
    
    req.end();
  });
}

async function waitForTask(taskUid) {
  console.log(`等待任务 ${taskUid} 完成...`);
  while (true) {
    try {
      const response = await makeRequest(`${MEILI_BASE}/tasks/${taskUid}`);
      if (response.status === 200) {
        const task = response.data;
        if (task.status === 'succeeded') {
          console.log(`✅ 任务 ${taskUid} 完成`);
          return true;
        } else if (task.status === 'failed') {
          console.log(`❌ 任务 ${taskUid} 失败:`, task.error);
          return false;
        }
        // 继续等待
        await new Promise(resolve => setTimeout(resolve, 100));
      }
    } catch (err) {
      console.log(`检查任务状态失败: ${err.message}`);
      return false;
    }
  }
}

async function createIndex(indexName) {
  try {
    console.log(`创建索引: ${indexName}`);
    const response = await makeRequest(`${MEILI_BASE}/indexes`, {
      method: 'POST',
      body: {
        uid: indexName,
        primaryKey: 'id'
      }
    });
    
    if (response.status === 201 || response.status === 202) {
      const taskUid = response.data.taskUid;
      const success = await waitForTask(taskUid);
      if (success) {
        console.log(`✅ 索引 ${indexName} 创建成功`);
        return true;
      } else {
        console.log(`❌ 索引 ${indexName} 创建失败`);
        return false;
      }
    } else {
      console.log(`❌ 创建索引请求失败: ${response.status}`);
      return false;
    }
  } catch (err) {
    console.log(`❌ 创建索引 ${indexName} 时出错: ${err.message}`);
    return false;
  }
}

async function checkIndexExists(indexName) {
  try {
    const response = await makeRequest(`${MEILI_BASE}/indexes/${indexName}`);
    return response.status === 200;
  } catch (err) {
    return false;
  }
}

async function fixMissingIndexes() {
  console.log('=== 修复缺失的索引 ===');
  
  try {
    // 读取知识库配置
    const notebooksPath = path.join(process.cwd(), 'notebooks.json');
    if (!fs.existsSync(notebooksPath)) {
      console.log('❌ 找不到 notebooks.json 文件');
      return;
    }
    
    const notebooks = JSON.parse(fs.readFileSync(notebooksPath, 'utf8'));
    console.log(`找到 ${notebooks.length} 个知识库`);
    
    // 检查每个知识库的索引
    for (const notebook of notebooks) {
      const indexName = `kb_${notebook.id}`;
      const exists = await checkIndexExists(indexName);
      
      if (exists) {
        console.log(`✅ 索引 ${indexName} 已存在`);
      } else {
        console.log(`❌ 索引 ${indexName} 缺失，正在创建...`);
        const success = await createIndex(indexName);
        if (success) {
          console.log(`✅ 索引 ${indexName} 修复成功`);
        } else {
          console.log(`❌ 索引 ${indexName} 修复失败`);
        }
      }
    }
    
    console.log('\n=== 修复完成 ===');
    
  } catch (error) {
    console.error('修复过程中出错:', error.message);
  }
}

fixMissingIndexes(); 