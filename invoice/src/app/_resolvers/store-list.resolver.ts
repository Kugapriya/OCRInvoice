import { Injectable } from '@angular/core';
import { Resolve, Router } from '@angular/router';
import { catchError, Observable, of } from 'rxjs';
import { RepositoryService } from '../core/services/repository.service';
import { Store } from '../_model/store';
import { AuthService } from '../core/services/auth.service';

@Injectable({
  providedIn: 'root' 
})
export class StoreListResolver implements Resolve<Store[]> {

    constructor(private repositoryService: RepositoryService, private authService: AuthService,
        private router: Router) { }

    resolve(): Observable<Store[]> {
        if (this.repositoryService.stores && this.repositoryService.previousUser &&
            this.repositoryService.previousUser === this.repositoryService.loggedInUser) {
            // return of(this.repositoryService.stores);
            // return new Observable(observer => {
            //     observer.next(this.repositoryService.stores);
            //     observer.complete();
            // });
            return of(this.repositoryService.stores);
        } else {
            this.repositoryService.previousUser = this.repositoryService.loggedInUser;

            return this.repositoryService.getStores(this.authService.decodedToken.nameid).pipe(
                catchError(error => {
                    // this.alertify.error(error);
                    this.router.navigate(['/login']);
                    return of([]);
                })
            );
        }
    }
}