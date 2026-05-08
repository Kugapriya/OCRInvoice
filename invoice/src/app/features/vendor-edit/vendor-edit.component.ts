import { Component, OnInit } from '@angular/core';
import { VendorService } from '../../core/services/vendor.service';
import { FormsModule } from '@angular/forms';
import { CommonModule } from '@angular/common';
import { IonicModule, ToastController } from '@ionic/angular';

@Component({
  selector: 'app-vendor-edit',
  templateUrl: './vendor-edit.component.html',
  styleUrls: ['./vendor-edit.component.scss'],
  standalone: true,
  imports: [FormsModule, CommonModule, IonicModule]
})
export class VendorEditComponent implements OnInit {
  supplierNameExists = false;

  constructor(public service: VendorService, private toastCtrl: ToastController) { }

  ngOnInit(): void { }

  hasChanges(): boolean {
    return this.service.hasUnsavedChanges();
  }

  onSupplierNameInput() {
    if (!this.service.selectedVendor) return;
    this.service.selectedVendor.supplierName = this.service.selectedVendor.supplierName.toUpperCase();

    const nameTrimmed = this.service.selectedVendor.supplierName.trim();
    if (!nameTrimmed) {
      this.supplierNameExists = false;
      return;
    }

    if (this.service.isCreatingNew) {
      this.supplierNameExists = this.service.vendors.some(
        v => v.supplierName.trim().toUpperCase() === nameTrimmed
      );
    } else {
      this.supplierNameExists = this.service.vendors.some(
        v => v.id !== this.service.selectedVendor!.id &&
             v.supplierName.trim().toUpperCase() === nameTrimmed
      );
    }
  }

  onlyNumbers(event: KeyboardEvent) {
    if (!/[0-9]/.test(event.key)) {
      event.preventDefault();
    }
  }

  isSaveDisabled(): boolean {
    if (!this.service.selectedVendor?.supplierName?.trim()) return true;
    if (this.supplierNameExists) return true;
    if (!this.service.isCreatingNew && !this.hasChanges()) return true;
    return false;
  }

  async save() {
    const vendor = this.service.selectedVendor;
    if (!vendor || !vendor.supplierName?.trim()) return;

    vendor.supplierName = vendor.supplierName.trim().toUpperCase();

    if (this.service.isCreatingNew) {
      this.service.createVendor(vendor).subscribe({
        next: async (created) => {
          this.service.vendors.push(created);
          this.service.getAllVendors().subscribe(v => this.service.vendors = v);
          this.clear();
          await this.showToast('Vendor saved successfully.', 'success');
        },
        error: async () => {
          await this.showToast('Could not create vendor. Please try again.', 'danger');
        }
      });
    } else {
      this.service.updateVendor(vendor).subscribe({
        next: async () => {
          const i = this.service.vendors.findIndex(v => v.id === vendor.id);
          if (i !== -1) this.service.vendors[i] = { ...vendor };
          this.clear();
          await this.showToast('Vendor updated successfully.', 'success');
        },
        error: async () => {
          await this.showToast('Could not update vendor. Please try again.', 'danger');
        }
      });
    }
  }

  private async showToast(message: string, color: 'success' | 'danger') {
    const toast = await this.toastCtrl.create({
      message,
      duration: 2500,
      color,
      position: 'top'
    });
    await toast.present();
  }

  clear() {
    this.supplierNameExists = false;
    this.service.selectedVendor = null;
    this.service.originalVendor = null;
    this.service.vendor_tableMode = true;
    this.service.vendor_editMode = false;
    this.service.isCreatingNew = false;
  }
}
