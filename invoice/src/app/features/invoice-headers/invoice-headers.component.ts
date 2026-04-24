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
  showAllUploads = true; // Show all files by default
  readonly recentWindowDays = 7;
  editingBarcodeId: number | null = null;
  savingBarcodeId: number | null = null;

  ngOnInit() {
    this.loadInvoiceDetails();
  }

  // get invoiceDetails(): InvoiceFileDetail[] {
  //   if (this.showAllUploads) {
  //     return this.allInvoiceDetails;
  //   }

  //   return this.allInvoiceDetails.filter((detail) => this.isRecentUpload(detail.uploadedFile.uploadedTime));
  // }
  get invoiceDetails(): InvoiceFileDetail[] {
    let data = this.allInvoiceDetails;

    // 1. Recent filter
    if (!this.showAllUploads) {
      data = data.filter(detail =>
        this.isRecentUpload(detail.uploadedFile.uploadedTime)
      );
    }

    if (this.fromDate && this.toDate) {
      const from = new Date(this.fromDate).setHours(0, 0, 0, 0);
      const to = new Date(this.toDate).setHours(23, 59, 59, 999);

      data = data.filter(detail => {
        const fileDate = new Date(detail.uploadedFile.uploadedTime).getTime();
        return fileDate >= from && fileDate <= to;
      });
    }

    return data;
  }

  getProcessStatusLabel(status: number | null | undefined): string {
    switch (status) {
      case 0:
        return 'Not Processed Yet';
      case 9:
        return 'Currently Processing';
      case 1:
        return 'Success';
      case 2:
        return 'Failed (Processing Failed)';
      case 3:
        return 'VAT Mismatch Exception';
      case 4:
        return 'UnSupported File Format';
      default:
        return 'Unknown Status';
    }
  }
  getProcessStatusClass(status: number | null | undefined): string {
    if (status === 0) return 'status-not-processed';
    if (status === 9) return 'status-processing';
    if (status === 1) return 'status-success';
    if (status === 2 || status === 3) return 'status-failed';
    return 'status-failed';
  }

  parseDate(dateString: string | Date | null | undefined): Date | null {
    if (!dateString) return null;
    if (dateString instanceof Date) return dateString;

    if (typeof dateString === 'string') {
      const cleaned = dateString.replace(/\s[A-Z]{3,4}$/, '').trim();
      const date = new Date(cleaned);
      return isNaN(date.getTime()) ? null : date;
    }

    return null;
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
        this.loading = false;
        this.alertService.showErrorToast('Failed to load invoice headers and lines');
      }
    });
  }
  fromDate: string | null = null;
  toDate: string | null = null;


  // valueText(value: unknown): string {
  //   if (value === null || value === undefined) {
  //     return 'N/A';
  //   }

  //   if (value instanceof Date) {
  //     return value.toISOString();
  //   }

  //   if (typeof value === 'object') {
  //     return JSON.stringify(value);
  //   }

  //   const stringValue = String(value);

  //   // Check if it's a date string and format it as UTC
  //   if (typeof value === 'string' && /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/.test(stringValue)) {
  //     try {
  //       const date = new Date(stringValue);
  //       return date.toISOString();
  //     } catch {
  //       return stringValue;
  //     }
  //   }

  //   return stringValue;
  // }

  toggleUploadWindow() {
    this.showAllUploads = !this.showAllUploads;
  }

  downloadFile(detail: InvoiceFileDetail, event: Event) {
    event.stopPropagation();

    const filePath = detail.uploadedFile.filePath;
    const fileName = detail.uploadedFile.fileName;

    if (!filePath || !fileName) {
      this.alertService.showErrorToast('File data is missing');
      return;
    }

    const url = this.repository.getDownloadUrl(filePath);

    fetch(url, { method: 'GET' })
      .then((response) => {
        if (response.ok) {
          const anchor = document.createElement('a');
          anchor.href = url;
          anchor.download = fileName;
          anchor.rel = 'noopener';
          document.body.appendChild(anchor);
          anchor.click();
          document.body.removeChild(anchor);
        } else if (response.status === 404) {
          this.alertService.showErrorToast('File not found');
        } else if (response.status === 500) {
          this.alertService.showErrorToast('Server error - file path may be invalid');
        } else {
          this.alertService.showErrorToast(`Failed to download file (${response.status})`);
        }
      })
      .catch((error) => {
        this.alertService.showErrorToast('File not found or path is invalid');
      });
  }

  previewFile(detail: InvoiceFileDetail, event: Event) {
    event.stopPropagation();

    const filePath = detail.uploadedFile.filePath;

    if (!filePath) {
      this.alertService.showErrorToast('File data is missing');
      return;
    }

    const url = this.repository.getPreviewUrl(filePath);

    fetch(url, { method: 'GET' })
      .then((response) => {
        if (response.ok) {
          window.open(url, '_blank', 'noopener');
        } else if (response.status === 404) {
          this.alertService.showErrorToast('File not found');
        } else if (response.status === 500) {
          this.alertService.showErrorToast('Server error - file path may be invalid');
        } else {
          this.alertService.showErrorToast(`Failed to preview file (${response.status})`);
        }
      })
      .catch((error) => {
        this.alertService.showErrorToast('File not found or path is invalid');
      });
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
        this.alertService.showErrorToast('Failed to save barcode');
        this.savingBarcodeId = null;
      }
    });
  }

  isBarcodeEmpty(barcode: any): boolean {
    return !barcode || barcode === 'N/A' || (typeof barcode === 'string' && barcode.trim() === '');
  }

}
