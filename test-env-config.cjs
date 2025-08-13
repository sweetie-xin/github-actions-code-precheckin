// 环境配置测试脚本
const fs = require('fs');
const path = require('path');

console.log("=== 环境配置测试 ===\n");

// 1. 测试 env.config.js 文件读取
console.log("1. 测试 env.config.js 文件读取:");
const envConfigPath = path.join(process.cwd(), 'env.config.js');
if (fs.existsSync(envConfigPath)) {
  try {
    // 读取文件内容并解析为对象
    const configContent = fs.readFileSync(envConfigPath, 'utf8');
    console.log("   ✅ 文件读取成功");
    
    // 提取 module.exports 部分
    const exportMatch = configContent.match(/module\.exports\s*=\s*({[\s\S]*?});?\s*$/);
    if (exportMatch) {
      // 使用 eval 来解析对象（在受控环境中）
      const exportStr = exportMatch[1];
      const envConfig = eval(`(${exportStr})`);
      console.log("   ✅ 配置解析成功");
      
      // 显示配置内容
      console.log("\n   配置内容:");
      Object.keys(envConfig).forEach(key => {
        const value = envConfig[key];
        const displayValue = key === 'MEILI_API_KEY' ? (value ? '已设置' : '未设置') : value;
        console.log(`   📋 ${key}: ${displayValue}`);
      });
      
      // 测试环境变量设置
      console.log("\n2. 测试环境变量设置:");
      Object.keys(envConfig).forEach(key => {
        if (!process.env[key]) {
          process.env[key] = envConfig[key];
          console.log(`   ✅ 设置 ${key}: ${envConfig[key]}`);
        } else {
          console.log(`   ⚠️  ${key} 已存在: ${process.env[key]}`);
        }
      });
      
      // 验证环境变量
      console.log("\n3. 验证环境变量:");
      const requiredVars = ['NODE_ENV', 'APP_ENV', 'MEILI_API_KEY', 'MEILI_DEV_BASE'];
      requiredVars.forEach(varName => {
        const value = process.env[varName];
        const status = value ? '✅' : '❌';
        const displayValue = varName === 'MEILI_API_KEY' ? (value ? '已设置' : '未设置') : (value || '未设置');
        console.log(`   ${status} ${varName}: ${displayValue}`);
      });
      
    } else {
      console.log("   ❌ 配置格式不正确，未找到 module.exports");
    }
  } catch (err) {
    console.log("   ❌ 配置解析失败:", err.message);
  }
} else {
  console.log("   ❌ env.config.js 文件不存在");
}

// 4. 测试 Meilisearch 配置
console.log("\n4. 测试 Meilisearch 配置:");
try {
  // 模拟 meili.config.ts 中的配置加载逻辑
  const meiliConfigPath = path.join(process.cwd(), 'app/server-lib/meili.config.ts');
  if (fs.existsSync(meiliConfigPath)) {
    const configContent = fs.readFileSync(meiliConfigPath, 'utf8');
    
    // 检查关键配置是否存在
    if (configContent.includes('MEILI_API_KEY')) {
      console.log("   ✅ MEILI_API_KEY 配置存在");
    } else {
      console.log("   ❌ MEILI_API_KEY 配置缺失");
    }
    
    if (configContent.includes('MEILI_BASE')) {
      console.log("   ✅ MEILI_BASE 配置存在");
    } else {
      console.log("   ❌ MEILI_BASE 配置缺失");
    }
    
    if (configContent.includes('eval')) {
      console.log("   ✅ 环境配置解析逻辑存在");
    } else {
      console.log("   ❌ 环境配置解析逻辑缺失");
    }
  } else {
    console.log("   ❌ meili.config.ts 不存在");
  }
} catch (err) {
  console.log("   ❌ Meilisearch 配置检查失败:", err.message);
}

// 5. 测试索引创建逻辑
console.log("\n5. 测试索引创建逻辑:");
try {
  const uploadRoutePath = path.join(process.cwd(), 'app/api/files/upload/route.ts');
  if (fs.existsSync(uploadRoutePath)) {
    const routeContent = fs.readFileSync(uploadRoutePath, 'utf8');
    
    if (routeContent.includes('indexExists')) {
      console.log("   ✅ indexExists 函数调用存在");
    } else {
      console.log("   ❌ indexExists 函数调用缺失");
    }
    
    if (routeContent.includes('createMeiliIndex')) {
      console.log("   ✅ createMeiliIndex 函数调用存在");
    } else {
      console.log("   ❌ createMeiliIndex 函数调用缺失");
    }
    
    if (routeContent.includes('if (!(await indexExists')) {
      console.log("   ✅ 索引存在检查逻辑存在");
    } else {
      console.log("   ❌ 索引存在检查逻辑缺失");
    }
  } else {
    console.log("   ❌ upload route 文件不存在");
  }
} catch (err) {
  console.log("   ❌ 索引创建逻辑检查失败:", err.message);
}

console.log("\n=== 测试完成 ===");
console.log("\n💡 如果所有测试都通过，环境配置应该正常工作");
console.log("💡 如果发现问题，请检查相应的配置文件"); 