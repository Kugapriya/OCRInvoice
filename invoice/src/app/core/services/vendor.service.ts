import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from 'src/environments/environment';

export interface Vendor {
  id: number;
  supplierName: string;
  contactName?: string;
  address1?: string;
  city?: string;
  mobileNumber?: string;
  email?: string;
}

@Injectable({
  providedIn: 'root'
})
export class VendorService {
  private apiUrl = environment.apiUrl+'vendors/';

  vendors: Vendor[] = [];
  selectedVendor: Vendor | null = null;
  originalVendor: Vendor | null = null;

  vendor_tableMode: boolean = true;
  vendor_editMode: boolean = false;
  isCreatingNew: boolean = false;

  hasUnsavedChanges(): boolean {
    if (!this.vendor_editMode || !this.selectedVendor || !this.originalVendor) return false;
    return JSON.stringify(this.selectedVendor) !== JSON.stringify(this.originalVendor);
  }

  constructor(private http: HttpClient) {}

  getAllVendors(): Observable<Vendor[]> {
    return this.http.get<Vendor[]>(`${this.apiUrl}getall`);
  }

  getVendorById(id: number): Observable<Vendor> {
    return this.http.get<Vendor>(`${this.apiUrl}get/${id}`);
  }

  createVendor(vendor: Vendor): Observable<Vendor> {
    return this.http.post<Vendor>(`${this.apiUrl}create`, vendor);
  }

  updateVendor(vendor: Vendor): Observable<any> {
    return this.http.put<any>(`${this.apiUrl}update`, vendor);
  }

  deleteVendor(id: number): Observable<any> {
    return this.http.delete<any>(`${this.apiUrl}delete/${id}`);
  }
}