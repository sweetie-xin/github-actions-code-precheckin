/** @type {import('next').NextConfig} */

// const CHATGPT_END_URL: string = process.env.NEXT_PUBLIC_CHATGPT_END_URL || "http://127.0.0.1:6001"
const CHATGPT_END_URL: string = "https://deepseekmine.com"
const nextConfig = {
    devIndicators: {
        position: "bottom-right", // 构建指示器的位置
    },
    async rewrites() {
        return [
            {
                source: '/api/omni',
                destination: `${CHATGPT_END_URL}/omni/api/chat/process`,
            },
        ];
    },
};

module.exports = nextConfig;
