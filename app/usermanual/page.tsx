// app/usermanual/page.tsx

import React from 'react';
import ReactMarkdown from 'react-markdown'; // 引入 react-markdown 将 Markdown 转换为 HTML
import { promises as fs } from 'fs'; // 使用 fs 模块的 Promise 版本来进行异步文件读取
import path from 'path'; // 用于构造文件路径

// 定义一个异步 Server Component 作为页面组件
export default async function UserManualPage() {
    // 构造 Markdown 文件的绝对路径
    const filePath = path.join(process.cwd(), 'app', 'usermanual', 'DeepseekMineQuestion.md');

    // 异步读取 Markdown 文件内容，文件编码为 'utf8'
    const mdContent = await fs.readFile(filePath, 'utf8');

    // - 使用 flex 布局使页面内容在整个视口中居中显示
    // - 内部内容使用白色背景、阴影、内边距和圆角美化展示
    return (
        <div className="min-h-screen flex items-center justify-center bg-gray-100 p-4">
            <div className="max-w-3xl bg-white rounded-lg shadow-lg p-8">
                <h1 className="text-3xl font-bold mb-6 text-center">
                    DeepSeekMine 常见问题
                </h1>
                <ReactMarkdown>
                    {mdContent}
                </ReactMarkdown>
            </div>
        </div>
    );
}
