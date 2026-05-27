export interface FileSummary {
  id: number;
  fileName: string;
  supplierName: string | null;
  invoiceNumber: string;
  invoiceDate: string;
  uploadedTime: string;
  processType: string | null;
  isProcess: number;
  totalLines: number;
  noBarcodeCount: number;
}
