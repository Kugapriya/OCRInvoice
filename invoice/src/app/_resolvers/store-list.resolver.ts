import { Injectable } from '@angular/core';
import { Resolve, Router } from '@angular/router';
import { catchError, map, Observable, of } from 'rxjs';
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
        const storedCustomerRaw = localStorage.getItem('customer');
        let customerUserName = '';
        if (storedCustomerRaw) {
            try {
                const parsed = JSON.parse(storedCustomerRaw);
                customerUserName = parsed?.user?.username || parsed?.username || '';
            } catch {
                customerUserName = '';
            }
        }

        const username = this.authService.decodedToken?.nameid
            || this.repositoryService.loggedInUser?.username
            || customerUserName;

        if (!username) {
            this.router.navigate(['/login']);
            return of([]);
        }

        if (this.repositoryService.stores && this.repositoryService.previousUser &&
            this.repositoryService.previousUser === this.repositoryService.loggedInUser) {
            // Always set selectedStore based on stored storeId
            const storedStoreId = localStorage.getItem('storeId');
            if (storedStoreId && this.repositoryService.stores) {
                const selected = this.repositoryService.stores.find(s => s.storeId === storedStoreId);
                if (selected) {
                    this.repositoryService.selectedStore = selected;
                }
            }
            // Load customer ID from storage
            this.repositoryService.loadCustomerIdFromStorage();
            return of(this.repositoryService.stores);
        } else {
            this.repositoryService.previousUser = this.repositoryService.loggedInUser;

            return this.repositoryService.getStores(username).pipe(
                map(stores => {
                    this.repositoryService.stores = stores;
                    const storedStoreId = localStorage.getItem('storeId');
                    if (storedStoreId) {
                        const selected = stores.find(s => s.storeId === storedStoreId);
                        if (selected) {
                            this.repositoryService.selectedStore = selected;
                        }
                    }
                    // Load customer ID from storage
                    this.repositoryService.loadCustomerIdFromStorage();
                    return stores;
                }),
                catchError(error => {
                    // this.alertify.error(error);
                    this.router.navigate(['/login']);
                    return of([]);
                })
            );
        }
    }
}