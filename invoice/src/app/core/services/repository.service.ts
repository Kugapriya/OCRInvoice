import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Router } from '@angular/router';
import { Observable } from 'rxjs';
import { Customer } from 'src/app/_model/customer';
import { Store } from 'src/app/_model/store';
import { User } from 'src/app/_model/user';
import { InvoiceFileDetail } from '../../_model/invoice-file-detail';
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
        localStorage.setItem('storeName', store.storeName || '');
      } else {
        console.warn('Selected store has no storeId');
      }
    }
  }

  setCustomerIdFromStore(customerId: string) {
    this.customerId = customerId;
    if (customerId) {
      localStorage.setItem('customerId', customerId);
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

  getDownloadUrl(customerId: string, supplierName: string, fileName: string): string {
    const encodedCustomerId = encodeURIComponent(customerId);
    const encodedSupplierName = encodeURIComponent(supplierName);
    const encodedFileName = encodeURIComponent(fileName);

    return `${this.baseUrl}file/download/${encodedCustomerId}/${encodedSupplierName}/${encodedFileName}`;
  }

  getPreviewUrl(customerId: string, supplierName: string, fileName: string): string {
    const encodedCustomerId = encodeURIComponent(customerId);
    const encodedSupplierName = encodeURIComponent(supplierName);
    const encodedFileName = encodeURIComponent(fileName);

    return `${this.baseUrl}file/preview/${encodedCustomerId}/${encodedSupplierName}/${encodedFileName}`;
  }

  updateLineBarcode(lineId: number, barcode: string): Observable<any> {
    return this.http.put(`${this.baseUrl}file/updateLineBarcode/${lineId}`, { barcode });
  }
}
