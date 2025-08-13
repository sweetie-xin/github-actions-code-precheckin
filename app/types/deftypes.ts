export interface UploadedFile {
  doc_id: string;
  title: string;
  fileType: string;
  knowledgeLabel: string;
  fileName?: string;  // 新增，且可选
}

export interface ISearchResults extends UploadedFile {
  _formatted: { content: string };
  content: string
}

export interface Config {
  config_mode: string;
  model?: string;
  model_name?: string;
}
