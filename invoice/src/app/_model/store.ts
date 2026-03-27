export class Store {
    constructor(
        public storeId?: string,
        public address?: string,
        public city?: string,
        public database?: string,
        public port?: number,
        public postCode?: string,
        public publicIp?: string,
        public storeName?: string,
        public serialNumber?: string,
        public macAddress?: string,
        public ServerName?: string,
        public hostedEnvironment?: string,
        public tick?: Date,
        public customerNo ?: string,
        public uri?: string,
        public dealerId: string = '',
        public customerId: string = ''
    ) {}
}

