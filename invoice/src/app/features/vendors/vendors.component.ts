import { Component, OnInit } from '@angular/core';
import { VendorService, Vendor } from '../../core/services/vendor.service';
import { RepositoryService } from '../../core/services/repository.service';
import { CommonModule } from '@angular/common';
import { IonicModule, AlertController } from '@ionic/angular';
import { VendorEditComponent } from '../vendor-edit/vendor-edit.component';

@Component({
  selector: 'app-vendors',
  templateUrl: './vendors.component.html',
  styleUrls: ['./vendors.component.scss'],
  standalone: true,
  imports: [CommonModule, IonicModule, VendorEditComponent]
})
export class VendorsComponent implements OnInit {
  error = '';

  constructor(
    public service: VendorService,
    public repository: RepositoryService,
    private alertCtrl: AlertController
  ) { }

  ngOnInit() {
    this.loadVendors();
    this.service.vendor_tableMode = true;
    this.service.vendor_editMode = false;
  }

  loadVendors() {
    this.service.getAllVendors().subscribe({
      next: (data) => {
        this.service.vendors = data;
      },
      error: (err) => {
        this.error = err.message;
      }
    });
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
