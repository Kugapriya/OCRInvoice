import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Router } from '@angular/router';
import { Observable } from 'rxjs';
import { Customer } from 'src/app/_model/customer';
import { Store } from 'src/app/_model/store';
import { User } from 'src/app/_model/user';
import { environment } from 'src/environments/environment';

@Injectable({
  providedIn: 'root',
})
export class RepositoryService {

  baseUrl = environment.apiUrl;

  constructor(private http: HttpClient, private router: Router) { }

  loggedInUser?: User;
  stores?: Store[];
  selectedStore?: Store;
  selectedStoreId?: string;
  previousUser?: User;
  customerId?: string;

  getStores(username: string): Observable<Store[]> {
    return this.http.get<Store[]>(this.baseUrl + 'stores/getStores/' + username);
  }
  setStore(store: Store) {
    if (!store) return;
    if (this.selectedStore !== store) {
      this.selectedStore = store;
      if (store.storeId) {
        localStorage.setItem('storeId', store.storeId);
      } else {
        console.warn('Selected store has no storeId');
      }
    }
  }
  getUser(username: string): Observable<User> {
    return this.http.get<User>(this.baseUrl + 'users/' + username);
  }
  getCustomerByStore(username: string, storeId: string) {
    return this.http.get<Customer>(`${this.baseUrl}stores/getCustomerByStore/${username}/${storeId}`);
  }
}
