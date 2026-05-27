export class UploadedFiles {
    constructor(
        public id: number,
        public customerId: string,
        public supplierName: string,
        public fileName: string = '',
        public filePath: string,
        public processType?: string,
        public uploadedTime: string = '',
        public isProcess: number = 0,
        public headerId: number = 0,
        public lineIdStart: number = 0,
        public lineIdEnd: number = 0,
        public invoiceNumber: string = '',
        public invoiceDate: string = ''
    ) { }
}