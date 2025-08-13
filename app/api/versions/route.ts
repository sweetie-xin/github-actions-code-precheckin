import { NextRequest, NextResponse } from 'next/server';
import formidable from 'formidable';
import fs from 'fs';
import path from 'path';

// 版本文件存储目录
const VERSIONS_DIR = path.join(process.cwd(), 'uploads', 'versions');

// 确保目录存在
if (!fs.existsSync(VERSIONS_DIR)) {
    fs.mkdirSync(VERSIONS_DIR, { recursive: true });
}

export async function POST(request: NextRequest) {
    try {
        const contentType = request.headers.get('content-type');

        let versionData;

        if (contentType?.includes('application/json')) {
            // 来自前端的JSON数据（外部API上传后的记录保存）
            versionData = await request.json();
        } else {
            // 原始的formData上传（保持向后兼容）
            const formData = await request.formData();
            const file = formData.get('file') as File;
            const version = formData.get('version') as string;
            const description = formData.get('description') as string;

            if (!file || !version || !description) {
                return NextResponse.json(
                    { error: '缺少必要的字段' },
                    { status: 400 }
                );
            }

            // 验证文件类型
            const allowedExtensions = ['.exe', '.msi', '.dmg', '.zip', '.tar.gz'];
            const fileExtension = path.extname(file.name).toLowerCase();

            if (!allowedExtensions.includes(fileExtension)) {
                return NextResponse.json(
                    { error: '不支持的文件类型' },
                    { status: 400 }
                );
            }

            // 生成文件名
            const timestamp = Date.now();
            const fileName = `${file.name}`;
            const filePath = path.join(VERSIONS_DIR, fileName);

            // 保存文件
            const buffer = Buffer.from(await file.arrayBuffer());
            fs.writeFileSync(filePath, buffer);

            // 创建版本记录
            versionData = {
                id: timestamp.toString(),
                version,
                fileName,
                fileSize: file.size,
                uploadDate: new Date().toISOString().split('T')[0],
                description,
                status: 'draft',
                downloadCount: 0,
                filePath: filePath,
            };
        }

        // 保存版本信息到数据库或文件
        const versionsFile = path.join(process.cwd(), 'data', 'versions.json');
        const versionsDir = path.dirname(versionsFile);

        if (!fs.existsSync(versionsDir)) {
            fs.mkdirSync(versionsDir, { recursive: true });
        }

        let versions = [];
        if (fs.existsSync(versionsFile)) {
            const data = fs.readFileSync(versionsFile, 'utf8');
            versions = JSON.parse(data);
        }

        versions.unshift(versionData);
        fs.writeFileSync(versionsFile, JSON.stringify(versions, null, 2));

        return NextResponse.json({
            success: true,
            version: versionData,
        });

    } catch (error) {
        console.error('Upload error:', error);
        return NextResponse.json(
            { error: '上传失败' },
            { status: 500 }
        );
    }
} export async function GET() {
    try {
        const versionsFile = path.join(process.cwd(), 'data', 'versions.json');

        if (!fs.existsSync(versionsFile)) {
            return NextResponse.json([]);
        }

        const data = fs.readFileSync(versionsFile, 'utf8');
        const versions = JSON.parse(data);

        return NextResponse.json(versions);
    } catch (error) {
        console.error('Error loading versions:', error);
        return NextResponse.json(
            { error: '加载版本列表失败' },
            { status: 500 }
        );
    }
}
