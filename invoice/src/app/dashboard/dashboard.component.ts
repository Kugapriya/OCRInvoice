import { CommonModule } from '@angular/common';
import { HttpClient } from '@angular/common/http';
import { Component, ElementRef, NgZone, OnDestroy, OnInit, ViewChild } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { IonicModule } from '@ionic/angular';
import { NgxExtendedPdfViewerModule } from 'ngx-extended-pdf-viewer';
import { environment } from 'src/environments/environment';
import { DocumentScanner } from '@capgo/capacitor-document-scanner';
import { Capacitor } from '@capacitor/core';
import { PDFDocument } from 'pdf-lib';
import { AlertService } from '../core/services/alert.service';
import { RepositoryService } from '../core/services/repository.service';
import { SharedModule } from '../shared/shared.module';

interface UploadedFile {
  name: string;
  file?: File;
  url?: string;
  invoiceType: string;
  uploadDate: string; // YYYY-MM-DD
  uploadTime: string; // HH:MM
  isProcess?: number;
}

interface PendingFile {
  file: File;
  url: string;
  isPdf: boolean;
  isImage: boolean;
}

interface FileGroup {
  label: string;
  date: string;
  files: UploadedFile[];
}

@Component({
  standalone: true,
  imports: [CommonModule, FormsModule, IonicModule, NgxExtendedPdfViewerModule, SharedModule],
  selector: 'app-dashboard',
  templateUrl: './dashboard.component.html',
  styleUrls: ['./dashboard.component.scss'],
})
export class DashboardComponent implements OnInit, OnDestroy {
  @ViewChild('fileInput') fileInput!: ElementRef<HTMLInputElement>;

  selectedInvoice = '';
  role = '';
  email = '';
  customerId = '';

  uploadedFiles: UploadedFile[] = [];
  showUploadSheet = false;
  private refreshTimer: ReturnType<typeof setInterval> | null = null;

  // Preview modal (before confirming add)
  showPreviewModal = false;
  pendingFiles: PendingFile[] = [];
  previewSelectedIndex = 0;
  previewFileUrl = '';
  previewIsPdf = false;
  previewIsImage = false;
  previewPage = 1;
  previewTotalPages = 0;

  get selectedStoreIdDisplay(): string {
    return this.repository.selectedStore?.storeId || localStorage.getItem('storeId') || '';
  }

  get selectedStoreNameDisplay(): string {
    return this.repository.selectedStore?.storeName || localStorage.getItem('storeName') || '';
  }

  get groupedFiles(): FileGroup[] {
    const today = this.todayStr();
    const yesterday = this.dateStr(new Date(Date.now() - 86400000));

    const map = new Map<string, UploadedFile[]>();
    for (const f of this.uploadedFiles) {
      const d = f.uploadDate || today;
      if (!map.has(d)) map.set(d, []);
      map.get(d)!.push(f);
    }

    return Array.from(map.entries())
      .sort((a, b) => b[0].localeCompare(a[0]))
      .map(([date, files]) => ({
        date,
        label: date === today ? 'Today' : date === yesterday ? 'Yesterday' : this.formatGroupDate(date),
        files,
      }));
  }

  constructor(
    private http: HttpClient,
    private zone: NgZone,
    private alertService: AlertService,
    public repository: RepositoryService,
  ) {}

  ngOnInit() {
    this.repository.loadSelectedStoreFromStorage();
    this.repository.loadCustomerIdFromStorage();

    const userData = localStorage.getItem('customer');
    if (userData) {
      const parsed = JSON.parse(userData);
      const user = parsed.user ?? parsed;
      this.email = user.email ?? '';
      this.role = user.role ?? '';
    }

    this.customerId = this.repository.customerId ?? '';
    if (!this.customerId) {
      const cust = localStorage.getItem('cust') ?? '';
      this.customerId = cust ? JSON.parse(cust).customerId : '';
    }

    this.loadFromBackend();
    this.refreshTimer = setInterval(() => this.loadFromBackend(), 2 * 60 * 1000);
  }

  ngOnDestroy() {
    if (this.refreshTimer) clearInterval(this.refreshTimer);
  }

  private todayStr(): string {
    return this.dateStr(new Date());
  }

  private dateStr(d: Date): string {
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  }

  private formatGroupDate(isoDate: string): string {
    return new Intl.DateTimeFormat(undefined, { day: '2-digit', month: 'short', year: 'numeric' }).format(new Date(isoDate));
  }

  private loadFromBackend() {
    if (!this.customerId) return;
    this.http.get<any[]>(`${environment.apiUrl}file/getuploadedFiles/${this.customerId}`).subscribe({
      next: (files) => {
        const sessionFiles = this.uploadedFiles.filter(f => !!f.file);
        const sessionNames = new Set(sessionFiles.map(f => f.name));

        const backendFiles: UploadedFile[] = (files || [])
          .filter(f => !!f.fileName && !sessionNames.has(f.fileName))
          .map(f => {
            const dt = f.uploadedTime ? new Date(f.uploadedTime) : null;
            const valid = dt && !isNaN(dt.getTime());
            const d = valid ? dt! : new Date();
            return {
              name: f.fileName,
              invoiceType: f.processType || '',
              uploadDate: this.dateStr(d),
              uploadTime: `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`,
              isProcess: f.isProcess as number,
            };
          });

        this.uploadedFiles = [...sessionFiles, ...backendFiles];
      },
      error: (err) => {
        this.alertService.showErrorToast(err?.error?.message || 'Could not load file history');
      },
    });
  }

  openUploadOptions() {
    if (!this.selectedInvoice) {
      this.alertService.showToast('Please select Invoice Type first', 3000, 'top');
      return;
    }
    this.showUploadSheet = true;
  }

  captureAndClose() {
    this.showUploadSheet = false;
    setTimeout(() => this.capturePhoto(), 200);
  }

  galleryAndClose() {
    this.showUploadSheet = false;
    setTimeout(() => this.fileInput.nativeElement.click(), 200);
  }

  async capturePhoto() {
    try {
      if (Capacitor.getPlatform() === 'web') {
        this.alertService.showToast('Camera scan is only supported on mobile.', 3000, 'top');
        return;
      }

      // responseType 'base64' returns image data directly — works on both Android and iOS
      const result = await DocumentScanner.scanDocument({ responseType: 'base64' as any });

      // User cancelled — do nothing
      if (result.status === 'cancel') return;

      const images: string[] = result.scannedImages ?? [];
      if (!images.length) return;

      const pages: string[] = [];
      for (const img of images) {
        if (img.startsWith('data:')) {
          pages.push(img);
        } else {
          // Raw base64 — detect PNG (magic: 0x89 0x50) vs JPEG (0xFF 0xD8)
          const header = atob(img.substring(0, 8));
          const isPng = header.charCodeAt(0) === 0x89 && header.charCodeAt(1) === 0x50;
          pages.push(`data:image/${isPng ? 'png' : 'jpeg'};base64,${img}`);
        }
      }

      await this.createPdfAndPreview(pages);
    } catch {
      this.alertService.showErrorToast('Scanner failed. Please try again.', 3000, 'top');
    }
  }

  async createPdfAndPreview(pages: string[]) {
    if (!pages.length) return;
    try {
      const pdfDoc = await PDFDocument.create();

      for (const dataUrl of pages) {
        const isPng = dataUrl.startsWith('data:image/png');
        const rawBytes = this.dataUrlToBytes(dataUrl);

        // Use the correct embedder — wrong type throws inside pdf-lib
        const embeddedImg = isPng
          ? await pdfDoc.embedPng(rawBytes)
          : await pdfDoc.embedJpg(rawBytes);

        const page = pdfDoc.addPage([595, 842]); // A4 portrait
        page.drawImage(embeddedImg, {
          x: 0, y: 0,
          width: page.getWidth(),
          height: page.getHeight(),
        });
      }

      const pdfBytes = await pdfDoc.save();
      const pdfBlob = new Blob([pdfBytes.buffer as ArrayBuffer], { type: 'application/pdf' });

      const now = new Date();
      const ts = [
        now.getFullYear(),
        String(now.getMonth() + 1).padStart(2, '0'),
        String(now.getDate()).padStart(2, '0'),
        String(now.getHours()).padStart(2, '0'),
        String(now.getMinutes()).padStart(2, '0'),
        String(now.getSeconds()).padStart(2, '0'),
      ].join('_');

      const pdfFile = new File(
        [pdfBlob],
        `${this.customerId}_${ts}.pdf`,
        { type: 'application/pdf' }
      );

      this.zone.run(() => this.addToPending([pdfFile]));
    } catch {
      this.alertService.showErrorToast('PDF creation failed.', 3000, 'middle');
    }
  }

  onFilesSelected(event: Event) {
    const input = event.target as HTMLInputElement;
    if (!input.files?.length) return;
    const files = Array.from(input.files);
    this.addToPending(files);
    input.value = '';
  }

  addToPending(files: File[]) {
    this.pendingFiles = files.map(f => ({
      file: f,
      url: URL.createObjectURL(f),
      isPdf: f.type === 'application/pdf',
      isImage: f.type.startsWith('image/'),
    }));
    this.previewSelectedIndex = 0;
    this.previewPage = 1;
    this.previewTotalPages = 0;
    this.showPreviewModal = true;
    this.setPreviewFile(0);
  }

  setPreviewFile(index: number) {
    const pf = this.pendingFiles[index];
    if (!pf) return;
    this.previewSelectedIndex = index;
    this.previewFileUrl = pf.url;
    this.previewIsPdf = pf.isPdf;
    this.previewIsImage = pf.isImage;
    this.previewPage = 1;
  }

  selectPreviewFile(index: number) {
    this.setPreviewFile(index);
  }

  onPreviewPagesLoaded(event: any) {
    this.previewTotalPages = event.pagesCount;
  }

  confirmPreview() {
    const now = new Date();
    const batch: UploadedFile[] = this.pendingFiles.map(pf => ({
      name: pf.file.name,
      file: pf.file,
      url: pf.url,
      invoiceType: this.selectedInvoice,
      uploadDate: this.todayStr(),
      uploadTime: `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`,
    }));

    for (const f of batch) this.uploadedFiles.unshift(f);
    this.pendingFiles = [];
    this.showPreviewModal = false;
    this.previewFileUrl = '';

    if (!this.customerId) {
      this.alertService.showErrorToast('Customer ID is required');
      return;
    }

    const formData = new FormData();
    for (const item of batch) {
      formData.append('files', item.file!);
      formData.append('invoiceTypes', item.invoiceType);
    }

    this.http.post<any>(`${environment.apiUrl}file/upload/${this.customerId}`, formData).subscribe({
      next: () => {
        this.alertService.showSuccessToast('Upload successful');
      },
      error: (err) => {
        this.alertService.showErrorToast(err?.error?.message || err?.message || 'Upload failed');
      },
    });
  }

  discardPreview() {
    for (const pf of this.pendingFiles) {
      URL.revokeObjectURL(pf.url);
    }
    this.pendingFiles = [];
    this.showPreviewModal = false;
    this.previewFileUrl = '';
  }

  prevPreviewPage() { if (this.previewPage > 1) this.previewPage--; }
  nextPreviewPage() { if (this.previewPage < this.previewTotalPages) this.previewPage++; }

  // Converts a data-URL (data:mime;base64,xxx) to raw bytes
  dataUrlToBytes(dataUrl: string): Uint8Array {
    const b64 = dataUrl.includes(',') ? dataUrl.split(',')[1] : dataUrl;
    const binary = atob(b64);
    const bytes = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
    return bytes;
  }

  base64ToUint8Array(base64: string): Uint8Array {
    return this.dataUrlToBytes(base64);
  }

  dataURLtoBlob(dataUrl: string): Blob {
    const arr = dataUrl.split(',');
    const mime = arr[0].match(/:(.*?);/)![1];
    const bstr = atob(arr[1]);
    const u8arr = new Uint8Array(bstr.length);
    for (let i = 0; i < bstr.length; i++) u8arr[i] = bstr.charCodeAt(i);
    return new Blob([u8arr], { type: mime });
  }
}
