type SliceItem = {
    doc_index: string;
    content: string;
    title: string;
    knowledgeLabel: string;
    fileType: string;
};

type SubResult = {
    code: number;
    message: string;
    data: SliceItem[];
};

export type UploadResponse = {
    code: number;
    message: string;
    data: { data: SubResult[] };
    files: string[]
};