"use client";

import { useState, useRef, useCallback } from 'react';
import { X, Image, Send } from 'lucide-react';
import Toast from '../components/Toast';

// 反馈类型定义
type FeedbackType = '功能建议' | '界面体验' | '技术问题' | '内容问题' | '其他';

export default function FeedbackPage() {
    const [text, setText] = useState('');
    const [images, setImages] = useState<File[]>([]);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [toastMessage, setToastMessage] = useState<string | null>(null);
    const [selectedType, setSelectedType] = useState<FeedbackType | null>(null);
    const [contactInfo, setContactInfo] = useState('');
    const fileInputRef = useRef<HTMLInputElement>(null);

    const MAX_TEXT_LENGTH = 500; // 字数限制
    const MAX_IMAGES = 3; // 最大图片数量
    const FEEDBACK_TYPES: FeedbackType[] = ['功能建议', '界面体验', '技术问题', '内容问题', '其他'];

    const showToast = useCallback((message: string) => {
        setToastMessage(message);
    }, []);

    const handleTextChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
        const value = e.target.value;
        if (value.length <= MAX_TEXT_LENGTH) {
            setText(value);
        }
    };

    const handleContactChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        setContactInfo(e.target.value);
    };

    const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
        const files = e.target.files;
        if (!files) return;

        // 检查是否超过最大数量
        if (images.length + files.length > MAX_IMAGES) {
            showToast(`最多只能上传${MAX_IMAGES}张图片`);
            return;
        }

        // 验证文件类型和大小
        const validFiles: File[] = [];
        const maxSize = 5 * 1024 * 1024; // 5MB

        Array.from(files).forEach(file => {
            if (!file.type.startsWith('image/')) {
                showToast(`${file.name} 不是有效的图片格式`);
                return;
            }

            if (file.size > maxSize) {
                showToast(`${file.name} 超过5MB限制`);
                return;
            }

            validFiles.push(file);
        });

        setImages(prev => [...prev, ...validFiles]);
    };

    const removeImage = (index: number) => {
        setImages(prev => prev.filter((_, i) => i !== index));
    };

    const handleSubmit = async () => {
        if (text.trim().length === 0) {
            showToast('请输入反馈内容');
            return;
        }

        if (!selectedType) {
            showToast('请选择反馈类型');
            return;
        }

        try {
            setIsSubmitting(true);

            // 构造提交数据
            const feedbackData = {
                type: selectedType,
                text: text,
                contactInfo: contactInfo,
                images: images
            };

            console.log('提交的反馈数据:', feedbackData);



            // 实际提交逻辑
            const formData = new FormData();
            formData.append('feedback_type', selectedType);
            formData.append('feedback_text', text);
            formData.append('contact_info', contactInfo);
            images.forEach(image => {
                formData.append('images', image);
            });
            // const access_token = localStorage.getItem("access_token");
            const response = await fetch(`https://deepseekmine.com/omni/api/feedback`, {
                method: 'POST',
                body: formData,
                // headers: {
                //     'Authorization': `Bearer ${access_token}`
                // }
            });
            console.log('提交反馈响应:', response);
            if (!response.ok) throw new Error('提交失败');

            showToast('感谢您的反馈！');
            setText('');
            setImages([]);
            setSelectedType(null);
            setContactInfo('');
        } catch (error) {
            console.error('提交反馈失败:', error);
            showToast('提交失败，请稍后重试');
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <div className="min-h-screen bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
            <div className="max-w-2xl mx-auto">
                <div className="bg-white rounded-lg shadow-xl p-6 sm:p-8">
                    <h1 className="text-2xl font-semibold text-gray-800 mb-6">问题反馈</h1>

                    <div className="space-y-6">
                        {/* 反馈类型选择 */}
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">
                                反馈类型 <span className="text-red-500">*</span>
                            </label>
                            <div className="flex flex-wrap gap-3">
                                {FEEDBACK_TYPES.map((type) => (
                                    <button
                                        key={type}
                                        className={`px-4 py-2 text-sm rounded-full transition-colors ${selectedType === type
                                            ? 'bg-blue-100 text-blue-700 border border-blue-300'
                                            : 'bg-gray-100 hover:bg-gray-200 text-gray-700'
                                            }`}
                                        onClick={() => setSelectedType(type)}
                                    >
                                        {type}
                                    </button>
                                ))}
                            </div>
                            {selectedType === '其他' && (
                                <input
                                    type="text"
                                    placeholder="请简要描述您的反馈类型"
                                    className="mt-2 w-full border border-gray-300 rounded-md p-2 text-sm"
                                />
                            )}
                        </div>

                        {/* 文本输入 */}
                        <div>
                            <label htmlFor="feedback-text" className="block text-sm font-medium text-gray-700 mb-2">
                                反馈内容 <span className="text-red-500">*</span>
                            </label>
                            <div className="relative">
                                <textarea
                                    id="feedback-text"
                                    placeholder="请描述您遇到的问题或建议..."
                                    className="w-full border border-gray-300 rounded-md p-3 min-h-[150px] focus:outline-none focus:ring-2 focus:ring-blue-500"
                                    value={text}
                                    onChange={handleTextChange}
                                    maxLength={MAX_TEXT_LENGTH}
                                    disabled={isSubmitting}
                                ></textarea>
                                <div className="absolute bottom-2 right-2 text-xs text-gray-500">
                                    {text.length}/{MAX_TEXT_LENGTH}
                                </div>
                            </div>
                        </div>

                        {/* 图片上传区域 */}
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">
                                添加截图 {images.length > 0 ? `(${images.length}/${MAX_IMAGES})` : ''}
                            </label>

                            <div className="flex flex-wrap gap-4">
                                {/* 已上传的图片 */}
                                {images.map((image, index) => (
                                    <div key={index} className="relative w-24 h-24 border rounded-md overflow-hidden group">
                                        <img
                                            src={URL.createObjectURL(image)}
                                            alt={`上传图片 ${index + 1}`}
                                            className="w-full h-full object-cover"
                                        />
                                        <button
                                            onClick={() => removeImage(index)}
                                            className="absolute top-1 right-1 bg-red-500 text-white p-1 rounded-full opacity-90 hover:opacity-100"
                                            title="删除图片"
                                        >
                                            <X size={14} />
                                        </button>
                                        <div className="absolute bottom-0 left-0 right-0 bg-black bg-opacity-60 text-white text-xs px-2 py-1 truncate">
                                            {image.name.length > 15 ? image.name.substring(0, 15) + '...' : image.name}
                                        </div>
                                    </div>
                                ))}

                                {/* 上传按钮 */}
                                {images.length < MAX_IMAGES && (
                                    <button
                                        onClick={() => fileInputRef.current?.click()}
                                        disabled={isSubmitting}
                                        className="w-24 h-24 border-2 border-dashed border-gray-300 rounded-md flex flex-col items-center justify-center text-gray-500 hover:text-blue-600 hover:border-blue-500 transition-colors"
                                    >
                                        <Image size={24} />
                                        <span className="mt-2 text-xs">添加图片</span>
                                    </button>
                                )}
                            </div>

                            <p className="mt-2 text-xs text-gray-500">
                                支持 JPG、PNG 格式，单张图片不超过 5MB
                            </p>

                            {/* 隐藏的文件输入框 */}
                            <input
                                type="file"
                                ref={fileInputRef}
                                className="hidden"
                                accept="image/*"
                                multiple
                                onChange={handleImageUpload}
                                disabled={isSubmitting || images.length >= MAX_IMAGES}
                            />
                        </div>

                        {/* 联系方式 */}
                        <div>
                            <label htmlFor="contact" className="block text-sm font-medium text-gray-700 mb-2">
                                联系方式（选填）
                            </label>
                            <input
                                type="text"
                                id="contact"
                                value={contactInfo}
                                onChange={handleContactChange}
                                placeholder="邮箱或手机号，方便我们回复您"
                                className="w-full border border-gray-300 rounded-md p-3 focus:outline-none focus:ring-2 focus:ring-blue-500"
                                disabled={isSubmitting}
                            />
                        </div>

                        {/* 提交按钮 */}
                        <div className="flex justify-end mt-8">
                            <button
                                onClick={() => {
                                    handleSubmit();
                                }}
                                disabled={isSubmitting || text.trim().length === 0 || !selectedType}
                                className="px-6 py-3 bg-blue-600 text-white rounded-md hover:bg-blue-700 flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                            >
                                {isSubmitting ? '提交中...' : (
                                    <>
                                        <Send size={18} />
                                        提交反馈
                                    </>
                                )}
                            </button>
                        </div>
                    </div>
                </div>
            </div>

            {/* 使用现有的Toast组件 */}
            {toastMessage && (
                <Toast
                    message={toastMessage}
                    onClose={() => setToastMessage(null)}
                />
            )}
        </div>
    );
}