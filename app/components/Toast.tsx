"use client";

import { useEffect } from "react";

interface ToastProps {
  message: string;
  type?: "success" | "error" | "warning" | "info";
  onClose: () => void;
}

export default function Toast({ message, type = "success", onClose }: ToastProps) {
  useEffect(() => {
    const timer = setTimeout(() => {
      onClose();
    }, 3000);
    return () => clearTimeout(timer);
  }, [onClose]);

  const getToastStyles = () => {
    switch (type) {
      case "error":
        return "bg-red-100 text-red-900 border-red-200";
      case "warning":
        return "bg-yellow-100 text-yellow-900 border-yellow-200";
      case "info":
        return "bg-blue-100 text-blue-900 border-blue-200";
      default:
        return "bg-green-100 text-green-900 border-green-200";
    }
  };

  const getButtonStyles = () => {
    switch (type) {
      case "error":
        return "text-red-700 hover:text-red-900";
      case "warning":
        return "text-yellow-700 hover:text-yellow-900";
      case "info":
        return "text-blue-700 hover:text-blue-900";
      default:
        return "text-green-700 hover:text-green-900";
    }
  };

  return (
    <div className={`fixed bottom-4 left-1/2 transform -translate-x-1/2 px-3 py-2 rounded-lg shadow-lg z-50 text-xs border ${getToastStyles()}`}>
      <div className="flex items-center justify-between space-x-4">
        <span className="font-medium">{message}</span>
        <button
          className={`focus:outline-none font-medium text-sm ${getButtonStyles()}`}
          onClick={onClose}
        >
          ✕
        </button>
      </div>
    </div>
  );
}
