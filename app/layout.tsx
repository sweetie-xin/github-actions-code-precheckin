// app/layout.tsx
import './globals.css';
import Navbar from './components/Navbar';
import { AuthProvider } from './context/AuthProvider';



export const metadata = {
    title: 'DeepSeekMine',
};

export default function RootLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    return (
        <html lang="en">
            <body className="bg-white text-gray-800">
                <AuthProvider>
                    <Navbar />
                    {/* 页面主要内容 */}
                    {children}
                </AuthProvider>
            </body>
        </html>
    );
}