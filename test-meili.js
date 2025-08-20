// 测试 Meilisearch 配置
const { meiliClient, createMeiliIndex, indexExists } = require('./app/server-lib/meili.setup.ts');

async function testMeiliConfig() {
  console.log('=== Meilisearch 配置测试 ===');
  
  try {
    // 1. 测试连接
    console.log('1. 测试 Meilisearch 连接...');
    const indexes = await meiliClient.getIndexes();
    console.log('连接成功');
    console.log('当前索引数量:', indexes.length);
    
    // 2. 列出所有索引
    console.log('\n2. 当前索引列表:');
    for (const index of indexes) {
      console.log(`  - ${index.uid}`);
    }
    
    // 3. 测试特定索引
    console.log('\n3. 测试特定索引:');
    const testIndexes = ['kb_1', 'kb_2', 'kb_3'];
    for (const indexName of testIndexes) {
      const exists = await indexExists(indexName);
      console.log(`  ${indexName}: ${exists ? ' 存在' : ' 不存在'}`);
    }
    
    // 4. 测试创建索引
    console.log('\n4. 测试创建索引...');
    const testIndexName = 'test_index_' + Date.now();
    await createMeiliIndex(testIndexName);
    console.log(`索引 ${testIndexName} 创建成功`);
    
    // 5. 验证索引创建
    const created = await indexExists(testIndexName);
    console.log(`索引 ${testIndexName} 验证: ${created ? ' 成功' : ' 失败'}`);
    
  } catch (error) {
    console.error('测试失败:', error.message);
    console.error('错误详情:', error);
  }
}

testMeiliConfig(); 