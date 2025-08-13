import {NextRequest, NextResponse} from "next/server";
import fs from "fs";
import path from "path";

const loginFile = path.join(process.cwd(), "login.json");

export async function GET() {
    try {
        if (!fs.existsSync(loginFile)) {
            return NextResponse.json({}, {status: 200});
        }
        const data = fs.readFileSync(loginFile, "utf-8");
        return NextResponse.json(JSON.parse(data), {status: 200});
    } catch (err) {
        console.error("读取 login.json 失败:", err);
        return NextResponse.json({error: "读取失败"}, {status: 500});
    }
}

export async function POST(req: NextRequest) {
    try {
        const json = await req.json();
        fs.writeFileSync(loginFile, JSON.stringify(json, null, 2));
        return NextResponse.json({message: "保存成功"}, {status: 200});
    } catch (err) {
        console.error("写入 login.json 失败:", err);
        return NextResponse.json({error: "写入失败"}, {status: 500});
    }
}
