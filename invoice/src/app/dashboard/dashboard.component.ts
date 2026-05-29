import { CommonModule } from '@angular/common';
import { HttpClient } from '@angular/common/http';
import { AfterViewInit, Component, ElementRef, NgZone, OnDestroy, OnInit, QueryList, ViewChild, ViewChildren } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { IonicModule } from '@ionic/angular';
import { NgxExtendedPdfViewerModule } from 'ngx-extended-pdf-viewer';
import { environment } from 'src/environments/environment';
import { DocumentScanner, ScannerMode } from '@capgo/capacitor-document-scanner';
import { Capacitor } from '@capacitor/core';
import { PDFDocument } from 'pdf-lib';
import { AlertService } from '../core/services/alert.service';
import { RepositoryService } from '../core/services/repository.service';
import { ActivityService } from '../core/services/activity.service';
import { SharedModule } from '../shared/shared.module';
import { FileSummary } from '../_model/file-summary';

interface UploadedFile {
  id: number;
  name: string;
  file?: File;
  url?: string;
  invoiceType: string;
  supplierName: string;
  invoiceNo: string;
  uploadDate: string;   // YYYY-MM-DD
  uploadTime: string;   // HH:MM
  isProcess?: number;
  totalLines: number;
  noBarcodeCount: number;
  fromSession?: boolean;
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
export class DashboardComponent implements OnInit, OnDestroy, AfterViewInit {
  @ViewChild('fileInput') fileInput!: ElementRef<HTMLInputElement>;
  @ViewChild('imageInput') imageInput!: ElementRef<HTMLInputElement>;
  @ViewChildren('fileListContainer') fileListContainers!: QueryList<ElementRef<HTMLDivElement>>;

  selectedInvoice = 'Purchase Invoice';
  role = '';
  email = '';
  customerId = '';

  uploadedFiles: UploadedFile[] = [];
  showUploadSheet = false;
  showGallerySubOptions = false;
  private refreshTimer: ReturnType<typeof setInterval> | null = null;
  private readonly dashboardStateKey = 'dashboard.fileListState';
  private fileListScrollTops = new Map<string, number>();

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

  // Pagination: show N date-groups per page
  pageSize = 7;
  currentPage = 0;

  get totalPages(): number {
    return Math.max(1, Math.ceil(this.groupedFiles.length / this.pageSize));
  }

  get pagedGroups(): FileGroup[] {
    const groups = this.groupedFiles;
    const start = this.currentPage * this.pageSize;
    return groups.slice(start, start + this.pageSize);
  }

  prevPage() {
    if (this.currentPage > 0) {
      this.currentPage--;
      this.saveDashboardState();
      this.restoreVisibleFileListScrollPositionsLater();
    }
  }

  nextPage() {
    if (this.currentPage + 1 < this.totalPages) {
      this.currentPage++;
      this.saveDashboardState();
      this.restoreVisibleFileListScrollPositionsLater();
    }
  }

  goToPage(n: number) {
    if (n >= 0 && n < this.totalPages) {
      this.currentPage = n;
      this.saveDashboardState();
      this.restoreVisibleFileListScrollPositionsLater();
    }
  }

  onFileListScroll(groupDate: string, container: HTMLDivElement) {
    this.fileListScrollTops.set(groupDate, container.scrollTop);
    this.saveDashboardState();
  }

  constructor(
    private http: HttpClient,
    private zone: NgZone,
    private router: Router,
    private alertService: AlertService,
    public repository: RepositoryService,
    private activityService: ActivityService,
  ) { }

  ngOnInit() {
    this.restoreDashboardState();
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

    this.activityService.log('dashboard_page_view', 'dashboard', this.customerId);
    this.loadFromBackend();
    this.refreshTimer = setInterval(() => this.loadFromBackend(), 2 * 60 * 1000);
  }

  ngAfterViewInit() {
    this.restoreVisibleFileListScrollPositionsLater();
  }

  ngOnDestroy() {
    if (this.refreshTimer) clearInterval(this.refreshTimer);
    this.saveDashboardState();
  }

  isSuccess(file: UploadedFile) { return file.isProcess === 1 && file.noBarcodeCount === 0 && file.totalLines > 0; }
  isPending(file: UploadedFile) { return file.isProcess === 0 || file.isProcess == null; }
  isNotCompleted(file: UploadedFile) { return file.isProcess === 1 && file.noBarcodeCount > 0 && file.totalLines > 0; }
  isError(file: UploadedFile) {
    return file.isProcess != null
      && file.isProcess !== 0
      && file.isProcess !== 1
      && file.isProcess !== 9;
  }

  statusLabel(file: UploadedFile): string {
    if (this.isSuccess(file)) return 'success';
    if (this.isError(file)) return 'error';
    if (this.isNotCompleted(file)) return 'Incomplete';
    return 'pending';
  }

  goToBarcodeLines(file: UploadedFile) {
    if (!file.invoiceNo) {
      this.alertService.showToast('No invoice number available for this file.', 3000, 'top');
      return;
    }
    this.saveDashboardState();
    this.router.navigate(['/site/dashboard/barcode-lines'], {
      state: { invoiceNumber: file.invoiceNo, fileId: file.id, fileName: file.name, tab: 'nobarcode' }
    });
  }

  goToAllLines(file: UploadedFile) {
    if (!file.invoiceNo) {
      this.alertService.showToast('No invoice number available for this file.', 3000, 'top');
      return;
    }
    this.saveDashboardState();
    this.router.navigate(['/site/dashboard/barcode-lines'], {
      state: { invoiceNumber: file.invoiceNo, fileId: file.id, fileName: file.name, tab: 'all' }
    });
  }

  private todayStr(): string { return this.dateStr(new Date()); }

  private dateStr(d: Date): string {
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  }

  private formatGroupDate(isoDate: string): string {
    return new Intl.DateTimeFormat(undefined, { day: '2-digit', month: 'short', year: 'numeric' }).format(new Date(isoDate));
  }

  private restoreVisibleFileListScrollPositionsLater() {
    setTimeout(() => this.restoreVisibleFileListScrollPositions(), 0);
  }

  private restoreVisibleFileListScrollPositions() {
    if (!this.fileListContainers?.length) return;

    this.fileListContainers.forEach((containerRef) => {
      const container = containerRef.nativeElement;
      const groupDate = container.getAttribute('data-group-date');
      if (!groupDate) return;

      const savedScrollTop = this.fileListScrollTops.get(groupDate);
      if (savedScrollTop != null) {
        container.scrollTop = savedScrollTop;
      }
    });
  }

  private saveDashboardState() {
    sessionStorage.setItem(this.dashboardStateKey, JSON.stringify({
      currentPage: this.currentPage,
      fileListScrollTops: Array.from(this.fileListScrollTops.entries()),
    }));
  }

  private restoreDashboardState() {
    const rawState = sessionStorage.getItem(this.dashboardStateKey);
    if (!rawState) return;

    try {
      const parsed = JSON.parse(rawState) as {
        currentPage?: number;
        fileListScrollTops?: Array<[string, number]>;
      };

      if (typeof parsed.currentPage === 'number' && parsed.currentPage >= 0) {
        this.currentPage = parsed.currentPage;
      }

      if (Array.isArray(parsed.fileListScrollTops)) {
        this.fileListScrollTops = new Map(parsed.fileListScrollTops);
      }
    } catch {
      sessionStorage.removeItem(this.dashboardStateKey);
    }
  }

  private loadFromBackend() {
    if (!this.customerId) return;
    this.http.get<FileSummary[]>(`${environment.apiUrl}file/getFileSummaries/${this.customerId}`).subscribe({
      next: (files) => {
        const sessionFiles = this.uploadedFiles.filter(f => !!f.fromSession);
        const sessionNames = new Set(sessionFiles.map(f => f.name));

        const backendFiles: UploadedFile[] = (files || [])
          .filter(f => !!f.fileName && !sessionNames.has(f.fileName))
          .map(f => {
            const dt = f.uploadedTime ? new Date(f.uploadedTime) : null;
            const valid = dt && !isNaN(dt.getTime());
            const d = valid ? dt! : new Date();
            return {
              id: f.id,
              name: f.fileName,
              invoiceType: f.processType || '',
              supplierName: f.supplierName || '',
              invoiceNo: f.invoiceNumber || '',
              uploadDate: this.dateStr(d),
              uploadTime: `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`,
              isProcess: f.isProcess,
              totalLines: f.totalLines ?? 0,
              noBarcodeCount: f.noBarcodeCount ?? 0,
            };
          });

        this.uploadedFiles = [...sessionFiles, ...backendFiles];
        this.currentPage = Math.min(this.currentPage, Math.max(0, this.totalPages - 1));
        this.restoreVisibleFileListScrollPositionsLater();
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
    this.capturePhoto();
    this.showUploadSheet = false;
  }

  galleryAndClose() {
    this.showGallerySubOptions = true;
  }

  selectImagesAsPages() {
    this.imageInput.nativeElement.click();
    this.showUploadSheet = false;
    this.showGallerySubOptions = false;
  }

  selectFiles() {
    this.fileInput.nativeElement.click();
    this.showUploadSheet = false;
    this.showGallerySubOptions = false;
  }

  async capturePhoto() {
    try {
      if (Capacitor.getPlatform() === 'web') {
        this.alertService.showToast('Camera scan is only supported on mobile.', 3000, 'top');
        return;
      }

      const result = await DocumentScanner.scanDocument({
        responseType: 'base64' as any,
        croppedImageQuality: 90,
        scannerMode: ScannerMode.Full,
        letUserAdjustCrop: true,
        brightness: 4,
        contrast: 1.25,
      });

      if (result.status === 'cancel') return;

      const images: string[] = result.scannedImages ?? [];
      if (!images.length) return;

      const pages: string[] = [];
      for (const img of images) {
        if (img.startsWith('data:')) {
          pages.push(img);
        } else {
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
        const embeddedImg = isPng
          ? await pdfDoc.embedPng(rawBytes)
          : await pdfDoc.embedJpg(rawBytes);

        const page = pdfDoc.addPage([595, 842]);
        page.drawImage(embeddedImg, { x: 0, y: 0, width: page.getWidth(), height: page.getHeight() });
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

      const pdfFile = new File([pdfBlob], `${this.customerId}_${ts}.pdf`, { type: 'application/pdf' });
      this.zone.run(() => this.addToPending([pdfFile]));
    } catch {
      this.alertService.showErrorToast('PDF creation failed.', 3000, 'middle');
    }
  }

  async onImagesSelected(event: Event) {
    const input = event.target as HTMLInputElement;
    if (!input.files?.length) return;

    const imageFiles = Array.from(input.files);
    input.value = '';

    try {
      await this.combineImagesToSinglePdf(imageFiles);
    } catch (error) {
      this.alertService.showErrorToast('Failed to process images. Please try again.', 3000, 'middle');
    }
  }

  private async combineImagesToSinglePdf(imageFiles: File[]) {
    if (!imageFiles.length) return;

    try {
      const pdfDoc = await PDFDocument.create();

      for (const imageFile of imageFiles) {
        const arrayBuffer = await imageFile.arrayBuffer();
        const isPng = imageFile.type === 'image/png';
        const isJpg = imageFile.type === 'image/jpeg';

        if (!isPng && !isJpg) {
          this.alertService.showToast(`Skipping ${imageFile.name}: Only PNG and JPG supported`, 3000, 'middle');
          continue;
        }

        const embeddedImg = isPng
          ? await pdfDoc.embedPng(arrayBuffer)
          : await pdfDoc.embedJpg(arrayBuffer);

        const page = pdfDoc.addPage([595, 842]);
        page.drawImage(embeddedImg, { x: 0, y: 0, width: page.getWidth(), height: page.getHeight() });
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

      const pdfFile = new File([pdfBlob], `${this.customerId}_${ts}_combined.pdf`, { type: 'application/pdf' });
      this.zone.run(() => this.addToPending([pdfFile]));
    } catch (error) {
      this.alertService.showErrorToast('Failed to combine images into PDF.', 3000, 'middle');
    }
  }

  onFilesSelected(event: Event) {
    const input = event.target as HTMLInputElement;
    if (!input.files?.length) return;
    this.addToPending(Array.from(input.files));
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

  selectPreviewFile(index: number) { this.setPreviewFile(index); }

  onPreviewPagesLoaded(event: any) { this.previewTotalPages = event.pagesCount; }

  confirmPreview() {
    const now = new Date();
    const batch: UploadedFile[] = this.pendingFiles.map(pf => ({
      id: 0,
      name: pf.file.name,
      file: pf.file,
      url: pf.url,
      invoiceType: this.selectedInvoice,
      supplierName: '',
      invoiceNo: '',
      uploadDate: this.todayStr(),
      uploadTime: `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`,
      totalLines: 0,
      noBarcodeCount: 0,
      fromSession: true,
    }));

    for (const f of batch) this.uploadedFiles.unshift(f);
    this.currentPage = 0;
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
        // Close modals after successful upload
        this.showUploadSheet = false;
        this.showGallerySubOptions = false;
      },
      error: (err) => {
        this.alertService.showErrorToast(err?.error?.message || err?.message || 'Upload failed');
      },
    });
  }

  discardPreview() {
    for (const pf of this.pendingFiles) URL.revokeObjectURL(pf.url);
    this.pendingFiles = [];
    this.showPreviewModal = false;
    this.previewFileUrl = '';
  }

  prevPreviewPage() { if (this.previewPage > 1) this.previewPage--; }
  nextPreviewPage() { if (this.previewPage < this.previewTotalPages) this.previewPage++; }

  dataUrlToBytes(dataUrl: string): Uint8Array {
    const b64 = dataUrl.includes(',') ? dataUrl.split(',')[1] : dataUrl;
    const binary = atob(b64);
    const bytes = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
    return bytes;
  }

  base64ToUint8Array(base64: string): Uint8Array { return this.dataUrlToBytes(base64); }

  dataURLtoBlob(dataUrl: string): Blob {
    const arr = dataUrl.split(',');
    const mime = arr[0].match(/:(.*?);/)![1];
    const bstr = atob(arr[1]);
    const u8arr = new Uint8Array(bstr.length);
    for (let i = 0; i < bstr.length; i++) u8arr[i] = bstr.charCodeAt(i);
    return new Blob([u8arr], { type: mime });
  }
}
