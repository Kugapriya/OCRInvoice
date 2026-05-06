import { Component, OnInit } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { VendorService, Vendor } from '../../core/services/vendor.service';
import { FormsModule } from '@angular/forms';
import { CommonModule } from '@angular/common';
import { IonicModule } from '@ionic/angular';

@Component({
  selector: 'app-vendor-edit',
  templateUrl: './vendor-edit.component.html',
  styleUrls: ['./vendor-edit.component.scss'],
  standalone: true,
  imports: [FormsModule, CommonModule, IonicModule]
})
export class VendorEditComponent implements OnInit {
  vendor: Vendor = {
    id: 0,
    supplierName: '',
    contactName: '',
    address1: '',
    city: '',
    mobileNumber: '',
    email: ''
  };

  vendorId: string | null = null;
  isNew: boolean = true;
  loading: boolean = false;
  error: string = '';
  success: string = '';
  submitted: boolean = false;

   constructor(public service: VendorService) {}
  ngOnInit(): void {
  }

  save() {
    const vendor = this.service.selectedVendor;

    if (!vendor || !vendor.supplierName) return;

    if (this.service.isCreatingNew) {
      this.service.createVendor(vendor).subscribe(() => {
        this.service.vendors.push(vendor);
        this.clear();
      });
    } else {
      this.service.updateVendor(vendor).subscribe(() => {
        const index = this.service.vendors.findIndex(v => v.id === vendor.id);
        if (index !== -1) {
          this.service.vendors[index] = vendor;
        }
        this.clear();
      });
    }
  }

  clear() {
    this.service.selectedVendor = null;
    this.service.vendor_tableMode = true;
    this.service.vendor_editMode = false;
    this.service.isCreatingNew = false;
  }
}