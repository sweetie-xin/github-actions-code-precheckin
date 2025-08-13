export const checkLogin = async (setToastMessage?: (msg: string) => void) => {
    try {
        const res = await fetch('/api/login', {
            method: 'GET',
            headers: { 'Content-Type': 'application/json' },
        });

        if (!res.ok) {
            throw new Error("未登录");
        }

        const data = await res.json();
        if (data && data.isFirstLogin === false) {
            return true;
        } else {
            if (setToastMessage) {
                setToastMessage("请先登录，再使用聊天功能");
                setTimeout(() => {
                    window.location.href = "/login";
                }, 1500);
            }
            return false;
        }
    } catch (err) {
        console.error("检测登录状态异常:", err);
        if (setToastMessage) {
            setToastMessage("请先登录，再使用聊天功能");
            setTimeout(() => {
                window.location.href = "/login";
            }, 1500);
        }
        return false;
    }
};
