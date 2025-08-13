import { useState } from "react";
import { PanelRightClose, StickyNote, Trash2, ChevronDown, Minimize2 } from "lucide-react";

interface NotesPanelProps {
  summaries: string[];
  onDelete: (index: number) => void;
  onHide?: () => void;
}

export default function NotesPanel({ summaries, onDelete, onHide }: NotesPanelProps) {
  const [expandedIndex, setExpandedIndex] = useState<number | null>(null);
  const [viewingNote, setViewingNote] = useState<{question: string, answer: string} | null>(null);

  const cleanMarkdown = (text: string) => {
    return text
      .replace(/\*\*(.*?)\*\*/g, '$1')
      .replace(/\*(.*?)\*/g, '$1')
      .replace(/`(.*?)`/g, '$1')
      .replace(/#{1,6}\s?/g, '')
      .replace(/!?$$(.*?)$$$$.*?$$/g, '$1')
      .replace(/✧/g, '')
      .replace(/<[^>]+>/g, '')
      .replace(/\n{3,}/g, '\n\n')
      .trim();
  };

  const parseSummary = (summary: string) => {
    if (summary.includes('\n---\n')) {
      const [question, answer] = summary.split('\n---\n');
      return {
        question: cleanMarkdown(question) || "无问题",
        answer: cleanMarkdown(answer) || "无回答"
      };
    }
    
    return {
      question: "用户问题",
      answer: cleanMarkdown(summary)
    };
  };

  const openNoteDetail = (note: {question: string, answer: string}, index: number) => {
    setViewingNote(note);
    setExpandedIndex(index);
  };

  const closeNoteDetail = () => {
    setViewingNote(null);
    setExpandedIndex(null);
  };

  return (
    <>
      <aside className="basis-[30%] max-w-[30%] border-l border-gray-200 bg-white p-6 relative rounded-2xl transition-all mt-5 mb-5 mr-5 max-h-[calc(100vh-120px)] flex flex-col">
        {/* 标题 + 隐藏按钮 */}
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-sm font-semibold text-gray-600">问答记录</h3>
          {onHide && (
            <button
              onClick={onHide}
              className="text-gray-400 hover:text-indigo-600 transition"
              title="隐藏笔记"
            >
              <PanelRightClose size={18} />
            </button>
          )}
        </div>

        {/* 如果没有笔记，显示占位内容 */}
        {summaries.length === 0 ? (
          <div className="flex flex-1 flex-col items-center justify-center text-gray-500 text-center">
            <StickyNote className="w-12 h-12 text-gray-400 mb-4" />
            <p className="text-sm font-medium mt-4">已保存的问答将显示在此处</p>
            <p className="text-xs mt-1 text-gray-500 leading-5 max-w-xs">
              聊天中的问答会自动保存到这里
            </p>
          </div>
        ) : (
          <ul className="space-y-3 overflow-y-auto flex-1">
            {summaries.map((summary, index) => {
              const { question, answer } = parseSummary(summary);
              const isExpanded = expandedIndex === index;
              
              return (
                <li
                  key={index}
                  className={`p-3 rounded-lg shadow-sm bg-gray-100 flex flex-col hover:bg-gray-200 transition-all ${isExpanded ? 'bg-blue-50' : ''}`}
                >
                  {/* 折叠时只显示用户问题 */}
                  <div 
                    className="flex justify-between items-center cursor-pointer"
                    onClick={() => openNoteDetail({question, answer}, index)}
                  >
                    <div className="flex gap-3 items-start flex-1">
                      <div className="flex-shrink-0 text-blue-500">
                        <StickyNote size={20} />
                      </div>
                      <div className="flex-1">
                        <p className="text-xs font-medium text-gray-700">
                          提问: {question}
                        </p>
                      </div>
                    </div>
                    
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        onDelete(index);
                      }}
                      className="text-red-600 hover:text-red-800 p-1"
                    >
                      <Trash2 size={18} />
                    </button>
                  </div>
                </li>
              );
            })}
          </ul>
        )}

        
        {viewingNote && (
          <div className="absolute inset-0 bg-white rounded-lg flex flex-col z-10 shadow-lg">
            {/* 弹窗顶部栏 - 缩小按钮 */}
            <div className="flex items-center p-4 border-b">
              <button
                onClick={closeNoteDetail}
                className="flex items-center text-gray-500 hover:text-gray-700 mr-2"
                title="缩小"
              >
                <Minimize2 size={20} className="mr-1" />
              </button>
              <h3 className="text-sm font-medium truncate flex-1">
                回答详情
              </h3>
            </div>

            {/* 笔记内容区域 - 显示回答 */}
            <div className="p-4 overflow-y-auto flex-1">
              <div className="bg-blue-50 p-4 rounded-lg h-full">
                <p className="text-sm text-gray-800 whitespace-pre-wrap">
                  {viewingNote.answer}
                </p>
              </div>
            </div>
          </div>
        )}
      </aside>
    </>
  );
}