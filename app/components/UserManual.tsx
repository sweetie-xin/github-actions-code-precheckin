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

    // 返回页面内容：
    // - 显示一个标题
    // - 使用 ReactMarkdown 将读取到的 Markdown 文本渲染为 HTML
    return (
        <div className="container">
            <h1>User Manual: DeepseekMineQuestion</h1>
            <ReactMarkdown>
                {mdContent}
            </ReactMarkdown>
        </div>
    );
}
