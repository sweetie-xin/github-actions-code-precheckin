// components/SupportedFormats.tsx
import React from "react";

export const supportFormats = [
  "pdf", "docx", "xlsx", "xls", "txt", "csv", "json",
  "md", "log", "py", "js", "ts", "html", "css"
];

const SupportedFormats: React.FC = () => {
  return (
    <p className="text-sm text-gray-500 mt-2">
      支持格式：
      <span className="text-gray-600">
        {supportFormats.join(", ")}
      </span>
    </p>
  );
};

export default SupportedFormats;
