declare module "pdf-parse" {
    interface PDFInfo {
      Title?: string;
      Author?: string;
      Subject?: string;
      Keywords?: string;
      Creator?: string;
      Producer?: string;
      CreationDate?: string;
      ModDate?: string;
    }
  
    interface PDFMetadata {
      metadata?: { [key: string]: unknown };
      info: PDFInfo;
      text: string;
      numpages: number;
      numrender: number;
      version: string;
    }
  
    function pdfParse(data: Buffer | Uint8Array | ArrayBuffer | string): Promise<PDFMetadata>;
  
    export = pdfParse;
  }
  