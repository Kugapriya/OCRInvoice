export class Customer {
    constructor(
        public id: number = 0,
        public username: string = '',
        public password: string = '',
        public customerId: string = '',
        public dealerId: string = '',
        public storeId: string = '',
        public name: string = '',
        public email: string = '',
        public googleUrl: string = '',
        public azureUrl: string = '',
        public role: string = '',
    ) { }
}