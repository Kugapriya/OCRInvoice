import { Component, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { VendorService, Vendor } from '../../core/services/vendor.service';
import { CommonModule } from '@angular/common';
import { IonicModule } from '@ionic/angular';
import { VendorEditComponent } from '../vendor-edit/vendor-edit.component';

@Component({
  selector: 'app-vendors',
  templateUrl: './vendors.component.html',
  styleUrls: ['./vendors.component.scss'],
  standalone: true,
  imports: [CommonModule, IonicModule,VendorEditComponent]
})
export class VendorsComponent implements OnInit {
  error = '';
  loading = false;

  constructor(public service: VendorService) { }

  ngOnInit() {
    this.loadVendors();
    this.service.vendor_tableMode = true;
    this.service.vendor_editMode = false;
  }

  loadVendors() {
    this.loading = true;
    this.service.getAllVendors().subscribe({
      next: (data) => {
        this.service.vendors = data;
        this.loading = false;
      },
      error: (err) => {
        this.error = err.message;
        this.loading = false;
      }
    });
  }

  createNewVendor() {
    this.service.selectedVendor = {
      id: 0,
      supplierName: '',
      contactName: '',
      address1: '',
      city: '',
      mobileNumber: '',
      email: ''
    };

    this.service.vendor_tableMode = false;
    this.service.vendor_editMode = true;
    this.service.isCreatingNew = true;
  }

  editVendor(vendor: Vendor) {
    this.service.selectedVendor = { ...vendor };

    this.service.vendor_tableMode = false;
    this.service.vendor_editMode = true;
    this.service.isCreatingNew = false;
  }

  deleteVendor(id: number) {
    if (confirm('Delete this vendor?')) {
      this.service.deleteVendor(id).subscribe(() => {
        this.loadVendors();
      });
    }
  }
}