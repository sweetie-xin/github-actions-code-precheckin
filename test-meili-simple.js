// 简单的 Meilisearch 配置测试
const https = require('https');
const http = require('http');

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

async function testMeiliConfig() {
  console.log('=== Meilisearch 配置测试 ===');
  console.log(`连接地址: ${MEILI_BASE}`);
  console.log(`API Key: ${MEILI_API_KEY}`);
  console.log('');

  try {
    // 1. 测试连接和获取索引列表
    console.log('1. 测试连接和获取索引列表...');
    const indexesResponse = await makeRequest(`${MEILI_BASE}/indexes`);
    console.log(`状态码: ${indexesResponse.status}`);
    
    if (indexesResponse.status === 200) {
      console.log('✅ 连接成功');
      console.log('索引列表:', indexesResponse.data);
    } else {
      console.log('❌ 连接失败');
      console.log('响应:', indexesResponse.data);
    }

    // 2. 测试特定索引
    console.log('\n2. 测试特定索引:');
    const testIndexes = ['kb_1', 'kb_2', 'kb_3'];
    for (const indexName of testIndexes) {
      try {
        const response = await makeRequest(`${MEILI_BASE}/indexes/${indexName}`);
        if (response.status === 200) {
          console.log(`  ${indexName}: ✅ 存在`);
        } else {
          console.log(`  ${indexName}: ❌ 不存在 (${response.status})`);
        }
      } catch (err) {
        console.log(`  ${indexName}: ❌ 检查失败 - ${err.message}`);
      }
    }

    // 3. 测试创建索引
    console.log('\n3. 测试创建索引...');
    const testIndexName = 'test_index_' + Date.now();
    const createResponse = await makeRequest(`${MEILI_BASE}/indexes`, {
      method: 'POST',
      body: {
        uid: testIndexName,
        primaryKey: 'id'
      }
    });
    
    if (createResponse.status === 201) {
      console.log(`✅ 索引 ${testIndexName} 创建成功`);
      
      // 验证索引是否真的创建了
      const verifyResponse = await makeRequest(`${MEILI_BASE}/indexes/${testIndexName}`);
      if (verifyResponse.status === 200) {
        console.log(`✅ 索引 ${testIndexName} 验证成功`);
      } else {
        console.log(`❌ 索引 ${testIndexName} 验证失败`);
      }
    } else {
      console.log(`❌ 索引创建失败: ${createResponse.status}`);
      console.log('响应:', createResponse.data);
    }

  } catch (error) {
    console.error('❌ 测试失败:', error.message);
  }
}

testMeiliConfig(); 