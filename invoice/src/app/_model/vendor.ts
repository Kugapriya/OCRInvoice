export class User {
    constructor(
        public username: string ,
        public password: string = '',
        public name: string = '',
        public address1: string = '',
        public address2: string = '',
        public city: string = '',
        public telephone: string = '',
        public email: string = '',
        public role?: string,
        public isSuperUser?: boolean,
        public dealerId: string = '',
        public theme: string = '',
        public customerId: string = '',
        public accessLevel: string = 'Site'
    ) { }
}
