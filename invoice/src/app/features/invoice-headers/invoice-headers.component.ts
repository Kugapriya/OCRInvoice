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
  error: string | null = null;
  private allInvoiceDetails: InvoiceFileDetail[] = [];
  showAllUploads = false;
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

    return this.allInvoiceDetails.filter((detail) => this.isWithinRecentWindow(detail.uploadedFile.uploadedTime));
  }

  loadInvoiceDetails() {
    if (!this.repository.customerId) {
      this.allInvoiceDetails = [];
      this.error = null;
      this.alertService.showErrorAlert('Select a store', 'Please select a store first to load invoice headers and lines.');
      return;
    }

    this.loading = true;
    this.error = null;

    this.repository.getUploadedFileDetails(this.repository.customerId).subscribe({
      next: (details) => {
        this.allInvoiceDetails = details;
        this.loading = false;
      },
      error: (err) => {
        console.error(err);
        this.error = 'Failed to load invoice headers and lines';
        this.loading = false;
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

    return String(value);
  }

  toggleUploadWindow() {
    this.showAllUploads = !this.showAllUploads;
  }

  downloadFile(detail: InvoiceFileDetail, event: Event) {
    event.stopPropagation();

    const url = this.repository.getDownloadUrl(
      detail.uploadedFile.customerId,
      detail.uploadedFile.supplierName || '',
      detail.uploadedFile.fileName
    );

    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = detail.uploadedFile.fileName;
    anchor.rel = 'noopener';
    document.body.appendChild(anchor);
    anchor.click();
    document.body.removeChild(anchor);
  }

  previewFile(detail: InvoiceFileDetail, event: Event) {
    event.stopPropagation();

    const url = this.repository.getPreviewUrl(
      detail.uploadedFile.customerId,
      detail.uploadedFile.supplierName || '',
      detail.uploadedFile.fileName
    );

    window.open(url, '_blank', 'noopener');
  }

  private isWithinRecentWindow(uploadedTime: string): boolean {
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
