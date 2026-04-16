import { CommonModule } from '@angular/common';
import { Component, OnInit } from '@angular/core';
import { IonicModule } from '@ionic/angular';
import { FormsModule } from '@angular/forms';
import { InvoiceFileDetail } from '../../_model/invoice-file-detail';
import { DocMateInvoiceLine } from '../../_model/docmate-invoice-line';
import { AlertService } from 'src/app/core/services/alert.service';
import { RepositoryService } from 'src/app/core/services/repository.service';

@Component({
  standalone: true,
  selector: 'app-invoice-headers',
  templateUrl: './invoice-headers.component.html',
  styleUrls: ['./invoice-headers.component.scss'],
  imports: [IonicModule, CommonModule, FormsModule]
})
export class InvoiceHeadersComponent implements OnInit {
  constructor(public repository: RepositoryService, private alertService: AlertService) { }

  loading = false;
  private allInvoiceDetails: InvoiceFileDetail[] = [];
  showAllUploads = true;
  readonly recentWindowDays = 7;
  editingBarcodeId: number | null = null;
  savingBarcodeId: number | null = null;

  ngOnInit() {
    this.loadInvoiceDetails();
  }

  get invoiceDetails(): InvoiceFileDetail[] {
    if (this.showAllUploads) {
      return this.allInvoiceDetails;
    }

    return this.allInvoiceDetails.filter((detail) => this.isRecentUpload(detail.uploadedFile.uploadedTime));
  }

  loadInvoiceDetails() {
    if (!this.repository.customerId) {
      this.allInvoiceDetails = [];
      this.alertService.showErrorToast('Please select a store first');
      return;
    }

    this.loading = true;

    this.repository.getUploadedFileDetails(this.repository.customerId).subscribe({
      next: (details) => {
        this.allInvoiceDetails = details;
        this.loading = false;
      },
      error: (err) => {
        console.error(err);
        this.loading = false;
        this.alertService.showErrorToast('Failed to load invoice headers and lines');
      }
    });
  }

  valueText(value: unknown): string {
    if (value === null || value === undefined) {
      return 'N/A';
    }

    if (value instanceof Date) {
      return value.toISOString();
    }

    if (typeof value === 'object') {
      return JSON.stringify(value);
    }

    const stringValue = String(value);

    // Check if it's a date string and format it as UTC
    if (typeof value === 'string' && /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/.test(stringValue)) {
      try {
        const date = new Date(stringValue);
        return date.toISOString();
      } catch {
        return stringValue;
      }
    }

    return stringValue;
  }

  toggleUploadWindow() {
    this.showAllUploads = !this.showAllUploads;
  }

  downloadFile(detail: InvoiceFileDetail, event: Event) {
    event.stopPropagation();

    const customerId = detail.uploadedFile.customerId;
    const supplierName = detail.uploadedFile.supplierName || '';
    const fileName = detail.uploadedFile.fileName;

    if (!customerId || !supplierName || !fileName) {
      this.alertService.showErrorToast('File data is missing');
      return;
    }

    const url = this.repository.getDownloadUrl(customerId, supplierName, fileName);

    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = fileName;
    anchor.rel = 'noopener';
    document.body.appendChild(anchor);
    anchor.click();
    document.body.removeChild(anchor);
  }

  previewFile(detail: InvoiceFileDetail, event: Event) {
    event.stopPropagation();

    const customerId = detail.uploadedFile.customerId;
    const supplierName = detail.uploadedFile.supplierName || '';
    const fileName = detail.uploadedFile.fileName;

    if (!customerId || !supplierName || !fileName) {
      this.alertService.showErrorToast('File data is missing');
      return;
    }

    const url = this.repository.getPreviewUrl(customerId, supplierName, fileName);

    window.open(url, '_blank', 'noopener');
  }

  isRecentUpload(uploadedTime: string): boolean {
    const parsedDate = new Date(uploadedTime);

    if (Number.isNaN(parsedDate.getTime())) {
      return true;
    }

    const recentWindowMs = this.recentWindowDays * 24 * 60 * 60 * 1000;
    return Date.now() - parsedDate.getTime() <= recentWindowMs;
  }

  toggleBarcodeEdit(lineId: number) {
    if (this.editingBarcodeId === lineId) {
      this.editingBarcodeId = null;
    } else {
      this.editingBarcodeId = lineId;
    }
  }

  saveBarcode(line: DocMateInvoiceLine, event: Event) {
    event.stopPropagation();

    this.savingBarcodeId = line.id;

    this.repository.updateLineBarcode(line.id, line.barcode || '').subscribe({
      next: () => {
        this.alertService.showSuccessToast('Barcode saved successfully');
        this.editingBarcodeId = null;
        this.savingBarcodeId = null;
      },
      error: (err) => {
        console.error('Error saving barcode:', err);
        this.alertService.showErrorToast('Failed to save barcode');
        this.savingBarcodeId = null;
      }
    });
  }

  isBarcodeEmpty(barcode: any): boolean {
    return !barcode || barcode === 'N/A' || (typeof barcode === 'string' && barcode.trim() === '');
  }

}
