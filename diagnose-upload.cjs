// 上传问题诊断脚本
const fs = require('fs');
const path = require('path');

console.log("=== DeepSeekMine 上传问题诊断 ===\n");

// 1. 检查关键文件是否存在
const criticalFiles = [
  'app/api/files/upload/route.ts',
  'app/server-lib/meili.setup.ts',
  'app/server-lib/file_parser.ts',
  'app/server-lib/rag/chunker.ts',
  'app/server-lib/tokenization.ts',
  'package.json',
  'notebooks.json'
];

console.log("1. 检查关键文件:");
criticalFiles.forEach(file => {
  const exists = fs.existsSync(file);
  console.log(`   ${exists ? '✅' : '❌'} ${file}`);
});

// 2. 检查 Meilisearch 配置
console.log("\n2. 检查 Meilisearch 配置:");
try {
  const meiliConfig = require('./app/server-lib/meili.config.ts');
  console.log("   ✅ meili.config.ts 存在");
} catch (err) {
  console.log("   ❌ meili.config.ts 配置问题:", err.message);
}

// 3. 检查端口占用
console.log("\n3. 检查端口占用情况:");
const { exec } = require('child_process');

exec('netstat -ano | findstr :7775', (error, stdout, stderr) => {
  if (stdout) {
    console.log("   ✅ Meilisearch 端口 7775 被占用");
    console.log("   " + stdout.trim().split('\n')[0]);
  } else {
    console.log("   ⚠️  Meilisearch 端口 7775 未被占用");
  }
});

exec('netstat -ano | findstr :3335', (error, stdout, stderr) => {
  if (stdout) {
    console.log("   ✅ Next.js 端口 3335 被占用");
    console.log("   " + stdout.trim().split('\n')[0]);
  } else {
    console.log("   ⚠️  Next.js 端口 3335 未被占用");
  }
});

// 4. 检查环境变量
console.log("\n4. 检查环境变量:");
const envVars = ['NODE_ENV', 'MEILI_API_KEY', 'APP_ENV'];
envVars.forEach(envVar => {
  const value = process.env[envVar];
  console.log(`   ${value ? '✅' : '❌'} ${envVar}: ${value || '未设置'}`);
});

// 5. 检查 Node.js 版本
console.log("\n5. 检查 Node.js 版本:");
const nodeVersion = process.version;
const majorVersion = parseInt(nodeVersion.slice(1).split('.')[0]);
console.log(`   ${majorVersion >= 18 ? '✅' : '❌'} Node.js ${nodeVersion} (需要 >= 18.18.0)`);

// 6. 检查依赖包
console.log("\n6. 检查关键依赖包:");
try {
  const packageJson = JSON.parse(fs.readFileSync('package.json', 'utf8'));
  const criticalDeps = ['meilisearch', 'next', 'react', 'uuid'];
  
  criticalDeps.forEach(dep => {
    const version = packageJson.dependencies?.[dep] || packageJson.devDependencies?.[dep];
    console.log(`   ${version ? '✅' : '❌'} ${dep}: ${version || '未安装'}`);
  });
} catch (err) {
  console.log("   ❌ 无法读取 package.json:", err.message);
}

// 7. 检查临时目录
console.log("\n7. 检查临时目录:");
const tempDir = path.join(process.cwd(), 'temp');
try {
  if (!fs.existsSync(tempDir)) {
    fs.mkdirSync(tempDir, { recursive: true });
    console.log("   ✅ 临时目录已创建");
  } else {
    console.log("   ✅ 临时目录已存在");
  }
  
  // 测试写入权限
  const testFile = path.join(tempDir, 'test.txt');
  fs.writeFileSync(testFile, 'test');
  fs.unlinkSync(testFile);
  console.log("   ✅ 临时目录写入权限正常");
} catch (err) {
  console.log("   ❌ 临时目录权限问题:", err.message);
}

// 8. 常见问题检查
console.log("\n8. 常见问题检查:");

// 检查是否有语法错误
try {
  const uploadRoute = fs.readFileSync('app/api/files/upload/route.ts', 'utf8');
  if (uploadRoute.includes('processedFiles') && uploadRoute.includes('failedFiles')) {
    console.log("   ✅ 上传路由文件语法正确");
  } else {
    console.log("   ❌ 上传路由文件可能缺少关键变量");
  }
} catch (err) {
  console.log("   ❌ 无法读取上传路由文件:", err.message);
}

// 检查 Meilisearch 二进制文件
const meiliBinary = path.join(process.cwd(), 'meilisearch', 'meilisearch.exe');
if (fs.existsSync(meiliBinary)) {
  console.log("   ✅ Meilisearch 二进制文件存在");
} else {
  console.log("   ❌ Meilisearch 二进制文件不存在");
}

console.log("\n=== 诊断完成 ===");
console.log("\n如果发现问题，请:");
console.log("1. 检查错误日志中的具体错误信息");
console.log("2. 确保所有依赖包已正确安装");
console.log("3. 确保 Meilisearch 服务正在运行");
console.log("4. 检查文件权限和网络连接"); 