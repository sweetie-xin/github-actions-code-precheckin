// components/DeleteProgressModal.tsx
'use client';

import { Trash2, X, CheckCircle } from 'lucide-react';

interface DeleteProgressModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  progress: number;
  currentStep: string;
  isComplete: boolean;
  error: string | null;
}

export const DeleteProgressModal = ({
  isOpen,
  onClose,
  title,
  progress,
  currentStep,
  isComplete,
  error
}: DeleteProgressModalProps) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg p-8 max-w-md w-full mx-4 shadow-2xl">
        {/* 头部 */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center space-x-3">
            <Trash2 size={24} className="text-red-500" />
            <h3 className="text-sm font-semibold text-gray-900">
              {isComplete ? '删除完成' : '正在删除'}
            </h3>
          </div>
          {isComplete && (
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600 transition-colors"
            >
              <X size={20} />
            </button>
          )}
        </div>

        <div className="mb-6">
          <p className="text-gray-600">
            <span className="text-sm text-gray-900">{title}</span>
          </p>
        </div>

        {/* 错误信息 */}
        {error && (
          <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg">
            <p className="text-red-700 text-sm">{error}</p>
          </div>
        )}

        {/* 进度条 */}
        {!error && (
          <>
            <div className="mb-4">
              <div className="flex justify-between items-center mb-2">
                <span className="text-sm font-medium text-gray-700">{currentStep}</span>
                <span className="text-sm text-gray-500">{progress}%</span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-3 overflow-hidden">
                <div
                  className={`h-full rounded-full transition-all duration-500 ease-out ${
                    isComplete ? 'bg-green-500' : 'bg-red-500'
                  }`}
                  style={{ width: `${progress}%` }}
                >
                  {!isComplete && (
                    <div className="h-full w-full bg-gradient-to-r from-transparent via-white to-transparent opacity-30 animate-pulse" />
                  )}
                </div>
              </div>
            </div>

            {isComplete && (
              <div className="flex items-center justify-center space-x-2 mt-6 p-4 bg-green-50 rounded-lg">
                <CheckCircle size={20} className="text-green-500" />
                <span className="text-green-700 font-medium">已成功删除</span>
              </div>
            )}
          </>
        )}

        {/* 操作按钮 */}
        {(isComplete || error) && (
          <div className="flex justify-end mt-6">
            <button
              onClick={onClose}
              className="px-6 py-2 bg-gray-500 text-white rounded-lg hover:bg-gray-600 transition-colors"
            >
              关闭
            </button>
          </div>
        )}
      </div>
    </div>
  );
};
