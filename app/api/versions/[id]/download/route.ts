import { NextRequest, NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';

export async function GET(
    request: NextRequest,
    { params }: { params: { id: string } }
) {
    try {
        const versionId = params.id;
        const versionsFile = path.join(process.cwd(), 'data', 'versions.json');

        if (!fs.existsSync(versionsFile)) {
            return NextResponse.json(
                { error: '版本文件不存在' },
                { status: 404 }
            );
        }

        const data = fs.readFileSync(versionsFile, 'utf8');
        const versions = JSON.parse(data);

        const version = versions.find((v: any) => v.id === versionId);

        if (!version) {
            return NextResponse.json(
                { error: '版本不存在' },
                { status: 404 }
            );
        }

        // 增加下载计数
        version.downloadCount = (version.downloadCount || 0) + 1;

        // 更新版本信息
        const versionIndex = versions.findIndex((v: any) => v.id === versionId);
        versions[versionIndex] = version;
        fs.writeFileSync(versionsFile, JSON.stringify(versions, null, 2));

        // 如果有外部URL，重定向到外部下载链接
        if (version.externalUrl) {
            return NextResponse.redirect(version.externalUrl);
        }

        // 如果没有外部URL但有文件名，构建外部下载链接
        if (version.fileName) {
            const externalDownloadUrl = `http://47.122.144.171:8001/software/download/${version.fileName}`;
            return NextResponse.redirect(externalDownloadUrl);
        }        // 否则使用本地文件
        if (!version.filePath || !fs.existsSync(version.filePath)) {
            return NextResponse.json(
                { error: '文件不存在' },
                { status: 404 }
            );
        }

        // 读取文件并返回
        const fileBuffer = fs.readFileSync(version.filePath);

        return new NextResponse(fileBuffer, {
            status: 200,
            headers: {
                'Content-Type': 'application/octet-stream',
                'Content-Disposition': `attachment; filename="${version.fileName}"`,
                'Content-Length': version.fileSize.toString(),
            },
        });

    } catch (error) {
        console.error('Error downloading version:', error);
        return NextResponse.json(
            { error: '下载失败' },
            { status: 500 }
        );
    }
}