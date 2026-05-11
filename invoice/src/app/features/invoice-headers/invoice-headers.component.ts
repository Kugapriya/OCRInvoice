import { CommonModule } from '@angular/common';
import { Component, OnInit } from '@angular/core';
import { IonicModule } from '@ionic/angular';
import { FormsModule } from '@angular/forms';
import { DomSanitizer, SafeResourceUrl } from '@angular/platform-browser';
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

  constructor(
    public repository: RepositoryService,
    private alertService: AlertService,
    private sanitizer: DomSanitizer
  ) {}

  loading = false;
  private allInvoiceDetails: InvoiceFileDetail[] = [];
  showAllUploads = true;
  readonly recentWindowDays = 7;
  editingBarcodeId: number | null = null;
  savingBarcodeId: number | null = null;

  fromDate: string | null = null;
  toDate: string | null = null;

  // Pagination
  currentPage = 1;
  readonly pageSize = 10;

  // Preview overlay
  previewVisible = false;
  previewFileName = '';
  previewIsPdf = false;
  previewIsImage = false;
  safePreviewUrl: SafeResourceUrl = '';
  private previewDetail: InvoiceFileDetail | null = null;

  ngOnInit() {
    this.loadInvoiceDetails();
  }

  get invoiceDetails(): InvoiceFileDetail[] {
    let data = this.allInvoiceDetails;

    if (!this.showAllUploads) {
      data = data.filter(d => this.isRecentUpload(d.uploadedFile.uploadedTime));
    }

    if (this.fromDate && this.toDate) {
      const from = new Date(this.fromDate).setHours(0, 0, 0, 0);
      const to   = new Date(this.toDate).setHours(23, 59, 59, 999);
      data = data.filter(d => {
        const t = new Date(d.uploadedFile.uploadedTime).getTime();
        return t >= from && t <= to;
      });
    }

    return data;
  }

  get totalPages(): number {
    return Math.ceil(this.invoiceDetails.length / this.pageSize);
  }

  get pagedDetails(): InvoiceFileDetail[] {
    const start = (this.currentPage - 1) * this.pageSize;
    return this.invoiceDetails.slice(start, start + this.pageSize);
  }

  goToPage(page: number) {
    if (page < 1 || page > this.totalPages) return;
    this.currentPage = page;
  }

  onDateChange() {
    this.currentPage = 1;
  }

  loadInvoiceDetails() {
    if (!this.repository.customerId) {
      this.allInvoiceDetails = [];
      this.alertService.showErrorToast('Please select a store first');
      return;
    }

    this.loading = true;
    this.currentPage = 1;

    this.repository.getUploadedFileDetails(this.repository.customerId).subscribe({
      next: (details) => {
        this.allInvoiceDetails = details;
        this.loading = false;
      },
      error: () => {
        this.loading = false;
        this.alertService.showErrorToast('Failed to load invoice headers and lines');
      }
    });
  }

  getProcessStatusLabel(status: number | null | undefined): string {
    switch (status) {
      case 0: return 'Not Processed Yet';
      case 9: return 'Currently Processing';
      case 1: return 'Success';
      case 2: return 'Failed (Processing Failed)';
      case 3: return 'VAT Mismatch Exception';
      case 4: return 'Unsupported File Format';
      case 5: return 'Access Permission Denied';
      default: return 'Unknown Status';
    }
  }

  getProcessStatusClass(status: number | null | undefined): string {
    if (status === 0) return 'status-not-processed';
    if (status === 9) return 'status-processing';
    if (status === 1) return 'status-success';
    return 'status-failed';
  }

  async previewFile(detail: InvoiceFileDetail, event: Event) {
    event.stopPropagation();
    const filePath = detail.uploadedFile.filePath;
    if (!filePath) return;

    const url = this.repository.getPreviewUrl(filePath);
    try {
      const res = await fetch(url, { method: 'HEAD' });
      if (!res.ok) return;
    } catch { return; }

    const fileName = detail.uploadedFile.fileName || '';
    const ext = fileName.split('.').pop()?.toLowerCase() || '';
    this.previewFileName = fileName;
    this.previewIsPdf   = ext === 'pdf';
    this.previewIsImage = ['jpg', 'jpeg', 'png', 'gif', 'webp'].includes(ext);
    this.safePreviewUrl = this.sanitizer.bypassSecurityTrustResourceUrl(url);
    this.previewDetail  = detail;
    this.previewVisible = true;
  }

  closePreview() {
    this.previewVisible = false;
    this.safePreviewUrl = '';
    this.previewDetail  = null;
  }

  async downloadFromPreview() {
    if (!this.previewDetail) return;
    const filePath = this.previewDetail.uploadedFile.filePath;
    const fileName = this.previewDetail.uploadedFile.fileName;
    if (!filePath || !fileName) return;

    const url = this.repository.getDownloadUrl(filePath);
    const link = document.createElement('a');
    link.href = url;
    link.download = fileName;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }

  async downloadFile(detail: InvoiceFileDetail, event: Event) {
    event.stopPropagation();
    const filePath = detail.uploadedFile.filePath;
    const fileName = detail.uploadedFile.fileName;
    if (!filePath || !fileName) return;

    const url = this.repository.getDownloadUrl(filePath);
    try {
      const res = await fetch(url, { method: 'HEAD' });
      if (!res.ok) return;
    } catch { return; }

    const link = document.createElement('a');
    link.href = url;
    link.download = fileName;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }

  isRecentUpload(uploadedTime: string): boolean {
    const d = new Date(uploadedTime);
    if (isNaN(d.getTime())) return true;
    return Date.now() - d.getTime() <= this.recentWindowDays * 86400000;
  }

  toggleBarcodeEdit(lineId: number) {
    this.editingBarcodeId = this.editingBarcodeId === lineId ? null : lineId;
  }

  onBarcodeKeyPress(event: KeyboardEvent): boolean {
    return /[0-9]/.test(event.key);
  }

  saveBarcode(line: DocMateInvoiceLine, event: Event) {
    event.stopPropagation();
    const barcode = line.barcode || '';
    if (barcode && (!/^\d+$/.test(barcode) || barcode.length > 13)) {
      this.alertService.showErrorToast('Barcode must be numeric and max 13 digits');
      return;
    }
    this.savingBarcodeId = line.id;
    this.repository.updateLineBarcode(line.id, line.barcode || '').subscribe({
      next: () => {
        this.alertService.showSuccessToast('Barcode saved successfully');
        this.editingBarcodeId = null;
        this.savingBarcodeId = null;
      },
      error: () => {
        this.alertService.showErrorToast('Failed to save barcode');
        this.savingBarcodeId = null;
      }
    });
  }

  isBarcodeEmpty(barcode: any): boolean {
    return !barcode || barcode === 'N/A' || (typeof barcode === 'string' && barcode.trim() === '');
  }

  toggleUploadWindow() {
    this.showAllUploads = !this.showAllUploads;
    this.currentPage = 1;
  }

  parseDate(dateString: string | Date | null | undefined): Date | null {
    if (!dateString) return null;
    if (dateString instanceof Date) return dateString;
    const cleaned = (dateString as string).replace(/\s[A-Z]{3,4}$/, '').trim();
    const date = new Date(cleaned);
    return isNaN(date.getTime()) ? null : date;
  }
}
