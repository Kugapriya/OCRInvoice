import { DocMateInvoiceHeader } from './docmate-invoice-header';
import { DocMateInvoiceLine } from './docmate-invoice-line';
import { UploadedFiles } from './uploadedFiles';

export class InvoiceFileDetail {
    constructor(
        public uploadedFile: UploadedFiles,
        public header: DocMateInvoiceHeader | null = null,
        public lines: DocMateInvoiceLine[] = []
    ) { }
}