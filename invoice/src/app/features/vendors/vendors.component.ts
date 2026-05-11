import { Component, OnInit } from '@angular/core';
import { VendorService, Vendor } from '../../core/services/vendor.service';
import { RepositoryService } from '../../core/services/repository.service';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { IonicModule, AlertController } from '@ionic/angular';
import { VendorEditComponent } from '../vendor-edit/vendor-edit.component';

@Component({
  selector: 'app-vendors',
  templateUrl: './vendors.component.html',
  styleUrls: ['./vendors.component.scss'],
  standalone: true,
  imports: [CommonModule, FormsModule, IonicModule, VendorEditComponent]
})
export class VendorsComponent implements OnInit {
  error = '';
  searchQuery = '';
  filteredVendors: Vendor[] = [];

  constructor(
    public service: VendorService,
    public repository: RepositoryService,
    private alertCtrl: AlertController
  ) { }

  ngOnInit() {
    this.service.vendor_tableMode = true;
    this.service.vendor_editMode = false;
    this.loadVendors();
  }

  loadVendors() {
    this.service.getAllVendors().subscribe({
      next: (data) => {
        this.service.vendors = data;
        this.filteredVendors = data;
      },
      error: (err) => {
        this.error = err.message;
      }
    });
  }

  onSearch() {
    const q = this.searchQuery.trim().toLowerCase();
    if (!q) {
      this.filteredVendors = this.service.vendors;
      return;
    }
    this.filteredVendors = this.service.vendors.filter(v =>
      v.supplierName?.toLowerCase().includes(q) ||
      v.contactName?.toLowerCase().includes(q) ||
      v.email?.toLowerCase().includes(q) ||
      v.city?.toLowerCase().includes(q)
    );
  }

  getAvatarClass(name: string): string {
    const idx = (name?.charCodeAt(0) || 0) % 8;
    return `c${idx}`;
  }

  createNewVendor() {
    const blank: Vendor = { id: 0, supplierName: '', contactName: '', address1: '', city: '', mobileNumber: '', email: '' };
    this.service.selectedVendor = { ...blank };
    this.service.originalVendor = { ...blank };
    this.service.vendor_tableMode = false;
    this.service.vendor_editMode = true;
    this.service.isCreatingNew = true;
  }

  editVendor(vendor: Vendor) {
    this.service.selectedVendor = { ...vendor };
    this.service.originalVendor = { ...vendor };
    this.service.vendor_tableMode = false;
    this.service.vendor_editMode = true;
    this.service.isCreatingNew = false;
  }

  async deleteVendor(id: number) {
    const vendor = this.service.vendors.find(v => v.id === id);
    const vendorName = (vendor?.supplierName ?? '').trim();

    const alert = await this.alertCtrl.create({
      header: 'Delete Vendor',
      message: `Are you sure you want to delete "${vendorName}"?`,
      buttons: [
        { text: 'Cancel', role: 'cancel' },
        {
          text: 'Delete',
          role: 'destructive',
          handler: () => {
            this.service.deleteVendor(id).subscribe({
              next: () => {
                this.service.vendors = this.service.vendors.filter(v => v.id !== id);
                this.error = '';
              },
              error: () => {
                this.error = 'Failed to delete vendor. Please try again.';
              }
            });
          }
        }
      ]
    });
    await alert.present();
  }
}
