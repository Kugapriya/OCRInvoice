export class DocMateInvoiceHeader {
    constructor(
        public id: number = 0,
        public createdUtc: string = '',
        public filename: string | null = null,
        public docType: string | null = null,
        public supplierName: string | null = null,
        public customerName: string | null = null,
        public cmsCustomerId: string | null = null,
        public docNumber: string | null = null,
        public docDate: string | null = null,
        public totalExVat: number | null = null,
        public totalVat: number | null = null,
        public totalIncVat: number | null = null,
        public currency: string | null = null,
        public compared: boolean | null = null,
        public generated: boolean | null = null,
        public startSync: boolean | null = null,
        public endSync: boolean | null = null,
        public originalId: number = 0
    ) { }
}