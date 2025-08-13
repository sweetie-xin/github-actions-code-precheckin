import { ISearchResults } from "@/app/types/deftypes";
import { getFileIcon } from "@/app/lib/util"; // 假设你把 getFileIcon 放在这个路径下
interface SearchResultsProps {
  searchResults: ISearchResults[];
  onBack: () => void;
}

const SearchResults: React.FC<SearchResultsProps> = ({ searchResults, onBack }) => {
  return (
    <div className="basis-[30%] max-w-[30%] bg-white border-r border-gray-200 p-6 
                    rounded-2xl shadow-lg flex flex-col max-h-[88vh] overflow-hidden m-5">
      {/* 顶部栏 */}
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-base font-semibold text-gray-800">命中知识库</h2>
        <button onClick={onBack} className="text-blue-500 hover:underline text-sm">
          ⬅
        </button>
      </div>

      {/* 结果区域 */}
      <div className="flex-1 overflow-y-auto">
        {searchResults.length === 0 ? (
          <p className="text-sm text-gray-500">命中文件</p>
        ) : (
          <div className="space-y-4">
            {searchResults.map((hit, index) => (
              <div
                key={hit.doc_id + "-" + index}
                className={`p-4 rounded-lg shadow-sm border ${index % 2 === 0 ? "bg-blue-50" : "bg-orange-50"}`}
              >
                {/* 编号 + 文件图标 + 文件名 */}
                <div className="flex items-center gap-2 text-gray-700 text-sm mb-2">
                  <span className="text-gray-400 font-mono">#{index + 1}</span>
                  <span className="text-xl">{getFileIcon(`${hit.title}`)}</span>
                  <span className="font-medium text-blue-600">
                    {hit.title}
                  </span>
                </div>

                {/* 内容正文 */}
                <div
                  className="text-sm text-gray-900 leading-6 whitespace-pre-wrap"
                  dangerouslySetInnerHTML={{ __html: hit._formatted.content }}
                />
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default SearchResults;
