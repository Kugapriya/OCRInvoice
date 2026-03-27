import { Injectable } from '@angular/core';
import { Resolve, Router } from '@angular/router';
import { Observable, of } from 'rxjs';
import { catchError } from 'rxjs/operators';
import { User } from '../_model/user';
import { RepositoryService } from '../core/services/repository.service';
import { AuthService } from '../core/services/auth.service';
import { AlertService } from '../core/services/alert.service';

@Injectable()

export class AuthUserResolver implements Resolve<User> {

    constructor(private repositoryService: RepositoryService, private authService: AuthService,
        private router: Router, private alertify: AlertService) { }

    resolve(): Observable<User> {
        const username = this.authService.decodedToken?.nameid;
        if (this.repositoryService.loggedInUser?.username?.toLowerCase() === username?.toLowerCase()) {
            return of(this.repositoryService.loggedInUser!);
        }

        const fallbackUser: User = {
            username: username || '',
            password: '',
            name: '',
            address1: '',
            address2: '',
            city: '',
            telephone: '',
            role: '',
            email: '',
            isSuperUser: false,
            dealerId: '',
            theme: '',
            customerId: '',
            accessLevel: ''
        };

        this.repositoryService.loggedInUser = fallbackUser;

        return of(fallbackUser);
    }
}
// ;return this.repositoryService.getUser(this.authService.decodedToken.nameid).pipe(
//                 catchError(error => {
//                     // this.alertify.error('Problem in retrieving data');
//                     // this.alertify.error(error);
//                     this.router.navigate(['/login']);
//                     return of(null);
//                 })
//             );
