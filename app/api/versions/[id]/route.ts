import { NextRequest, NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';

export async function PATCH(
    request: NextRequest,
    { params }: { params: { id: string } }
) {
    try {
        const { status } = await request.json();
        const versionId = params.id;

        if (!status || !['active', 'deprecated', 'draft'].includes(status)) {
            return NextResponse.json(
                { error: '无效的状态' },
                { status: 400 }
            );
        }

        const versionsFile = path.join(process.cwd(), 'data', 'versions.json');

        if (!fs.existsSync(versionsFile)) {
            return NextResponse.json(
                { error: '版本文件不存在' },
                { status: 404 }
            );
        }

        const data = fs.readFileSync(versionsFile, 'utf8');
        const versions = JSON.parse(data);

        const versionIndex = versions.findIndex((v: any) => v.id === versionId);

        if (versionIndex === -1) {
            return NextResponse.json(
                { error: '版本不存在' },
                { status: 404 }
            );
        }

        versions[versionIndex].status = status;

        fs.writeFileSync(versionsFile, JSON.stringify(versions, null, 2));

        return NextResponse.json({
            success: true,
            version: versions[versionIndex],
        });

    } catch (error) {
        console.error('Error updating version status:', error);
        return NextResponse.json(
            { error: '更新状态失败' },
            { status: 500 }
        );
    }
}

export async function DELETE(
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

        const versionIndex = versions.findIndex((v: any) => v.id === versionId);

        if (versionIndex === -1) {
            return NextResponse.json(
                { error: '版本不存在' },
                { status: 404 }
            );
        }

        const version = versions[versionIndex];

        // 删除文件
        if (version.filePath && fs.existsSync(version.filePath)) {
            fs.unlinkSync(version.filePath);
        }

        // 从数组中移除
        versions.splice(versionIndex, 1);

        fs.writeFileSync(versionsFile, JSON.stringify(versions, null, 2));

        return NextResponse.json({
            success: true,
            message: '版本删除成功',
        });

    } catch (error) {
        console.error('Error deleting version:', error);
        return NextResponse.json(
            { error: '删除版本失败' },
            { status: 500 }
        );
    }
}
