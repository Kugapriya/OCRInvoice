import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Router } from '@angular/router';
import { Observable } from 'rxjs';
import { Customer } from 'src/app/_model/customer';
import { Store } from 'src/app/_model/store';
import { User } from 'src/app/_model/user';
import { InvoiceFileDetail } from '../../_model/invoice-file-detail';
import { DocMateInvoiceLine } from '../../_model/docmate-invoice-line';
import { environment } from 'src/environments/environment';

@Injectable({
  providedIn: 'root',
})
export class RepositoryService {

  baseUrl = environment.apiUrl;

  constructor(private http: HttpClient, private router: Router) {
    this.loadSelectedStoreFromStorage();
    this.loadCustomerIdFromStorage();
  }

  loggedInUser?: User;
  stores?: Store[];
  selectedStore?: Store;
  selectedStoreId?: string;
  previousUser?: User;
  customerId?: string;

  getStores(username: string): Observable<Store[]> {
    return this.http.get<Store[]>(this.baseUrl + 'stores/getStores/' + username);
  }
  clearSelectedStore() {
    this.selectedStore = undefined;
    this.selectedStoreId = undefined;
    localStorage.removeItem('selectedStore');
    localStorage.removeItem('storeId');
    localStorage.removeItem('storeName');
  }

  setStore(store: Store) {
    if (!store) return;
    if (this.selectedStore !== store) {
      this.selectedStore = store;
      localStorage.setItem('selectedStore', JSON.stringify(store));
      if (store.storeId) {
        localStorage.setItem('storeId', store.storeId);
        localStorage.setItem('storeName', store.storeName || '');
      } else {
        console.warn('Selected store has no storeId');
      }
    }
  }

  loadSelectedStoreFromStorage() {
    const storedStore = localStorage.getItem('selectedStore');
    if (storedStore) {
      try {
        const parsedStore = JSON.parse(storedStore) as Store;
        this.selectedStore = parsedStore;
        this.selectedStoreId = parsedStore.storeId;
        return;
      } catch {
        localStorage.removeItem('selectedStore');
      }
    }

    const storeId = localStorage.getItem('storeId');
    const storeName = localStorage.getItem('storeName');
    if (storeId) {
      this.selectedStore = {
        storeId,
        storeName: storeName || '',
        customerId: '',
        address: ''
      } as Store;
      this.selectedStoreId = storeId;
    }
  }

  setCustomerIdFromStore(customerId: string) {
    this.customerId = customerId;
    if (customerId) {
      localStorage.setItem('customerId', customerId);
      localStorage.setItem('cust', JSON.stringify({ customerId }));
    }
  }

  loadCustomerIdFromStorage() {
    const storedCustomerId = localStorage.getItem('customerId');
    if (storedCustomerId) {
      this.customerId = storedCustomerId;
    }
  }
  getUser(username: string): Observable<User> {
    return this.http.get<User>(this.baseUrl + 'users/' + username);
  }
  getCustomerByStore(username: string, storeId: string) {
    return this.http.get<Customer>(`${this.baseUrl}stores/getCustomerByStore/${username}/${storeId}`);
  }

  getUploadedFileDetails(customerId: string): Observable<InvoiceFileDetail[]> {
    return this.http.get<InvoiceFileDetail[]>(`${this.baseUrl}file/getuploadedFileDetails/${customerId}`);
  }

  getDownloadUrl(filePath: string): string {
    const encodedFilePath = btoa(filePath);
    return `${this.baseUrl}file/download/${encodedFilePath}`;
  }

  getPreviewUrl(filePath: string): string {
    const encodedFilePath = btoa(filePath);
    return `${this.baseUrl}file/preview/${encodedFilePath}`;
  }

  getInvoiceLines(lineIdStart: number, lineIdEnd: number): Observable<DocMateInvoiceLine[]> {
    return this.http.get<DocMateInvoiceLine[]>(`${this.baseUrl}file/getInvoiceLines/${lineIdStart}/${lineIdEnd}`);
  }

  updateLineBarcode(lineId: number, barcode: string): Observable<any> {
    return this.http.put(`${this.baseUrl}file/updateLineBarcode/${lineId}`, { barcode });
  }

}
