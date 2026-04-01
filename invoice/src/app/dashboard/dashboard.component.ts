import { CommonModule } from '@angular/common';
import { HttpClient } from '@angular/common/http';
import { Component, NgZone, OnInit } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { IonicModule } from '@ionic/angular';
import { NgxExtendedPdfViewerModule } from 'ngx-extended-pdf-viewer';
import { environment } from 'src/environments/environment';
import { Router } from '@angular/router';
import { DocumentScanner } from '@capgo/capacitor-document-scanner';
import { Capacitor } from '@capacitor/core';
import { PDFDocument } from 'pdf-lib';
import { Filesystem } from '@capacitor/filesystem';
import { AlertService } from '../core/services/alert.service';

@Component({
  standalone: true,
  imports: [CommonModule, FormsModule, IonicModule, NgxExtendedPdfViewerModule],
  selector: 'app-dashboard',
  templateUrl: './dashboard.component.html',
  styleUrls: ['./dashboard.component.scss'],
})
export class DashboardComponent implements OnInit {
  currentDate: string = '';
  currentDay: string = '';
  currentTime: string = '';

  ukDate: string = '';
  ukTime: string = '';
  ukDay: string = '';
  selectedInvoice: 'PURCHASE' | 'SERVICE' | 'SALES' | 'COMMISSION' = 'PURCHASE';
  fileName: string = '';
  customerDetails: string[] = [];

  selectedFileUrl: string | undefined;
  currentPage: number = 1;
  rotation: number = 0;

  photos: string[] = [];
  isImage: boolean = false;
  userna: string = '';
  customerId: string = '';
  dealerId: string = '';
  storeId: string = '';
  name: string = '';
  azureUrl: string = '';
  email: string = '';
  googleUrl: string = '';
  isLoading: boolean = false;
  successMessage: string = '';
  imageUrl: string = '';
  role: string = '';

  isEditModalOpen = false;
  supplierName = '';
  invoiceNumber = '';
  invoiceDate = '';

  showDatePicker: boolean = false;
  selectedIndex: number | null = null;
  selectedVendor: string = 'BOOKER';
  uploadedFiles: {
    name: string;
    file: File;
    url: string;
    status: 'PENDING' | 'PROCESSING' | 'COMPLETED';
    invoiceType: 'PURCHASE' | 'SERVICE' | 'SALES' | 'COMMISSION';
  }[] = [];

  selectedTarget: string | null = null;

  constructor(private http: HttpClient, private router: Router,
    private zone: NgZone, private alertService: AlertService
  ) { }

  ngOnInit() {
    const userData = localStorage.getItem('customer');

    if (userData) {
      const parsed = JSON.parse(userData);
      const user = parsed.user ?? parsed;

      this.userna = user.username ?? '';
      this.customerId = user.customerId ?? '';
      this.dealerId = user.dealerId ?? '';
      this.storeId = user.storeId ?? '';
      this.name = user.name ?? '';
      this.azureUrl = user.azureUrl ?? '';
      this.email = user.email ?? '';
      this.googleUrl = user.googleUrl ?? '';
      this.role = user.role ?? '';
    }
    // localStorage.removeItem('cust')

    this.updateUKTime();
    setInterval(() => this.updateUKTime(), 1000);
  }


  updateUKTime() {
    const now = new Date();

    const ukOptions: Intl.DateTimeFormatOptions = {
      timeZone: 'Europe/London',
      day: '2-digit',
      month: '2-digit',
      year: 'numeric'
    };

    const timeOptions: Intl.DateTimeFormatOptions = {
      timeZone: 'Europe/London',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      hour12: false
    };

    const dayOptions: Intl.DateTimeFormatOptions = {
      timeZone: 'Europe/London',
      weekday: 'long'
    };

    this.ukDate = new Intl.DateTimeFormat('en-GB', ukOptions).format(now);
    this.ukTime = new Intl.DateTimeFormat('en-GB', timeOptions).format(now);
    this.ukDay = new Intl.DateTimeFormat('en-GB', dayOptions).format(now);
  }
  updateDateTime() {
    const now = new Date();
    const options: Intl.DateTimeFormatOptions = { weekday: 'long', month: 'short', day: 'numeric', year: 'numeric' };
    this.currentDate = now.toLocaleDateString(undefined, options); // e.g., Feb 23, 2026
    this.currentDay = now.toLocaleDateString(undefined, { weekday: 'long' }); // e.g., Thursday
    this.currentTime = now.toLocaleTimeString(); // e.g., 5:30:12 PM
  }

  uploadToAzure(dataUrl: string) {
    const blob = this.dataURLtoBlob(dataUrl);
    const formData = new FormData();
    formData.append('file', blob, 'invoice.jpg');

    this.http.post('https://YOUR_AZURE_FUNCTION_OR_API/upload', formData)
      .subscribe({
        next: res => console.log('Uploaded successfully', res),
        error: err => console.error('Upload error', err)
      });
  }

  dataURLtoBlob(dataUrl: string): Blob {
    const arr = dataUrl.split(',');
    const mime = arr[0].match(/:(.*?);/)![1];
    const bstr = atob(arr[1]);
    let n = bstr.length;
    const u8arr = new Uint8Array(n);
    while (n--) u8arr[n] = bstr.charCodeAt(n);
    return new Blob([u8arr], { type: mime });
  }

  // Convert base64 to File object
  dataUrlToFile(dataUrl: string, fileName: string): File {
    const arr = dataUrl.split(',');
    const mime = arr[0].match(/:(.*?);/)![1];
    const bstr = atob(arr[1]);
    let n = bstr.length;
    const u8arr = new Uint8Array(n);

    while (n--) {
      u8arr[n] = bstr.charCodeAt(n);
    }

    return new File([u8arr], fileName, { type: mime });
  }

  base64ToBlob(base64: string, type = 'image/jpeg') {
    const binary = atob(base64);
    const len = binary.length;
    const buffer = new Uint8Array(len);
    for (let i = 0; i < len; i++) {
      buffer[i] = binary.charCodeAt(i);
    }
    return new Blob([buffer], { type });
  }
  async capturePhoto() {
    try {
      const platform = Capacitor.getPlatform();
      const isWeb = platform === 'web';
      let result: any;

      if (isWeb) {
        this.alertService.showToast('Document scanning is only supported on mobile devices.', 3000, 'top');
        return;
      } else {
        result = await DocumentScanner.scanDocument();
      }

      const images = result.scannedImages ?? [result.image];
      const pages: string[] = [];

      for (let i = 0; i < images.length; i++) {
        let base64Data = '';
        if (images[i].startsWith('data:')) {
          base64Data = images[i].split(',')[1];
        } else if (!images[i].startsWith('/')) {
          base64Data = images[i];
        } else {
          const file = await Filesystem.readFile({ path: images[i] });
          base64Data = file.data as string;
        }
        pages.push(`data:image/jpeg;base64,${base64Data}`);
      }

      await this.createPdfAndPush(pages);
    } catch (err) {
      this.alertService.showErrorToast('Scanner failed. Please try again.', 3000, 'top');
    }
  }

  async createPdfAndPush(pages: string[]) {
    if (!pages.length) {
      this.alertService.showToast('No pages to create PDF.', 3000, 'top');
      return;
    }
    try {
      const pdfDoc = await PDFDocument.create();

      for (let i = 0; i < pages.length; i++) {
        const page = pdfDoc.addPage([595, 842]);
        const jpgImageBytes = this.base64ToUint8Array(pages[i]);
        const jpgImage = await pdfDoc.embedJpg(jpgImageBytes);
        page.drawImage(jpgImage, {
          x: 0,
          y: 0,
          width: page.getWidth(),
          height: page.getHeight(),
        });
      }

      const pdfBytes: Uint8Array = await pdfDoc.save();
      const pdfBlob = new Blob([pdfBytes.buffer as ArrayBuffer], { type: 'application/pdf' });

      const now = new Date();
      const year = now.getFullYear();
      const month = String(now.getMonth() + 1).padStart(2, '0');
      const day = String(now.getDate()).padStart(2, '0');

      const hours = String(now.getHours()).padStart(2, '0');
      const minutes = String(now.getMinutes()).padStart(2, '0');
      const seconds = String(now.getSeconds()).padStart(2, '0');
      const milliseconds = String(now.getMilliseconds()).padStart(3, '0');
      const formattedDateTime = `${year}_${month}_${day}_${hours}_${minutes}_${seconds}_${milliseconds}`;
      const supplier = this.selectedVendor.replace(/\s+/g, '_').toUpperCase();
      const fileName = `${this.customerId}_${formattedDateTime}_${supplier}.pdf`;
      const pdfFile = new File([pdfBlob], fileName, { type: 'application/pdf' });

      this.zone.run(() => {
        this.uploadedFiles.push({
          name: fileName,
          file: pdfFile,
          url: URL.createObjectURL(pdfBlob),
          status: 'PENDING',
          invoiceType: this.selectedInvoice,
        });
      });

      this.alertService.showSuccessToast('PDF created and added', 3000, 'middle');

    } catch (err) {
      this.alertService.showErrorToast('PDF creation failed. Please try again.', 3000, 'middle');
    }
  }

  base64ToUint8Array(base64: string) {
    const binary = atob(base64.split(',')[1] || base64);
    const len = binary.length;
    const bytes = new Uint8Array(len);
    for (let i = 0; i < len; i++) {
      bytes[i] = binary.charCodeAt(i);
    }
    return bytes;
  }

  processFile(file: any, index: number) {
    this.selectedIndex = index;
    this.uploadedFiles[index].status = 'PROCESSING';
    setTimeout(() => {
      this.uploadedFiles[index].status = 'COMPLETED';
    }, 2000);
  }

  // removeFile(index: number) {
  //   this.uploadedFiles.splice(index, 1);
  //   this.selectedIndex = null;
  // }
  removeFile(index: number) {
    const removedFile = this.uploadedFiles[index];
    URL.revokeObjectURL(removedFile.url);
    this.uploadedFiles.splice(index, 1);

    if (this.selectedFileUrl === removedFile.url) {
      this.clearInspector();
    }
  }
  clearInspector() {
    this.selectedFileUrl = '';
    this.fileName = '';
    this.isPdf = false;
    this.isImage = false;
    this.zoomLevel = 1;
    this.rotation = 0;
  }
  sendToTarget() {
    if (this.selectedIndex === null) {
      alert('Please select a file.');
      return;
    }

    if (!this.selectedTarget) {
      alert('Please select a target.');
      return;
    }

    const selectedFile = this.uploadedFiles[this.selectedIndex];

    alert(`Sent ${selectedFile.name} to ${this.selectedTarget}`);
  }

  uplinkValue: string = '';
  isEditable: boolean = false;

  selectTarget(target: string) {
    this.selectedTarget = target;

    if (target === 'upload') {
      // this.uplinkValue = this.googleUrl;
    }

    if (target === 'azure') {
      this.uplinkValue = this.azureUrl;
    }

    if (target === 'email') {
      this.uplinkValue = this.email;
    }
    if (target === 'sql') {

    }
  }

  getTransmitIcon(): string {

    if (this.selectedTarget === 'upload') {
      return 'cloud-upload';
    }

    if (this.selectedTarget === 'gmail') {
      return 'mail-outline';
    }

    if (this.selectedTarget === 'azure') {
      return 'cloud-outline';
    }

    if (this.selectedTarget === 'email') {
      return 'mail-outline';
    }
    if (this.selectedTarget === 'sql') {
      return 'server-outline'
    }

    return 'send-outline';
  }

  selectFile(index: number) {
    this.selectedIndex = index;

    const fileObj = this.uploadedFiles[index];
    if (!fileObj || !fileObj.file) return;

    const file = fileObj.file;

    this.fileName = file.name;
    this.selectedFileUrl = URL.createObjectURL(file);
    this.isImage = false;
    this.isPdf = false;

    if (file.type === 'application/pdf') {
      this.isPdf = true;
    }
    else if (file.type.startsWith('image/')) {
      this.isImage = true;
    }
    else {
      alert("Unsupported file type");
      this.selectedFileUrl = '';
    }
  }
  totalPages: number = 0;

  prevPage() {
    if (this.currentPage > 1) {
      this.currentPage--;
    }
  }

  nextPage() {
    if (this.currentPage < this.totalPages) {
      this.currentPage++;
    }
  }
  rotatedImageFile: File | null = null;
  rotateLeft() {
    this.rotation -= 90;
    this.processRotation();
  }

  rotateRight() {
    this.rotation += 90;
    this.processRotation();
  }
  processRotation() {
    if (!this.isImage || !this.selectedFileUrl) return;

    const img = new Image();
    img.src = this.selectedFileUrl;

    img.onload = () => {

      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');

      const angle = this.rotation % 360;

      if (angle === 90 || angle === -270 || angle === 270 || angle === -90) {
        canvas.width = img.height;
        canvas.height = img.width;
      } else {
        canvas.width = img.width;
        canvas.height = img.height;
      }

      ctx?.translate(canvas.width / 2, canvas.height / 2);
      ctx?.rotate((angle * Math.PI) / 180);
      ctx?.drawImage(img, -img.width / 2, -img.height / 2);

      canvas.toBlob((blob) => {
        if (blob) {

          this.rotatedImageFile = new File([blob], this.fileName, {
            type: 'image/jpeg'
          });
          this.selectedFileUrl = URL.createObjectURL(blob);
        }
      }, 'image/jpeg');

    };
  }
  zoomLevel: number = 1;

  zoomIn() {
    this.zoomLevel += 0.2;
  }

  zoomOut() {
    if (this.zoomLevel > 0.4) {
      this.zoomLevel -= 0.2;
    }
  }

  onPagesLoaded(event: any) {
    this.totalPages = event.pagesCount;
  }
  onPdfLoaded(pdf: any) {
    this.totalPages = pdf.numPages;
  }

  uploadFromDrive(event: any) {
    const files = event.target.files;

    for (let i = 0; i < files.length; i++) {
      const file = files[i];

      this.uploadedFiles.push({
        name: file.name,
        file: file,
        url: URL.createObjectURL(file),
        status: 'PENDING',
        invoiceType: this.selectedInvoice
      });
    }
  }

  // sendMail(): Promise<void> {
  //   const formData = new FormData();

  //   for (let item of this.uploadedFiles) {
  //     formData.append('files', item.file);
  //   }

  //   const sendUrl = environment.apiUrl + 'File/sendzip/' + this.email + '/' + this.customerId + '/' + this.selectedVendor;
  //   return new Promise((resolve, reject) => {
  //     this.http.post(sendUrl, formData).subscribe({
  //       next: () => {
  //         resolve();
  //       },
  //       error: err => {
  //         reject(err);
  //       }
  //     });
  //   });
  // }
  // GoogleuploadFiles() {

  //   if (this.uploadedFiles.length === 0) {
  //     alert("No files selected");
  //     return;
  //   }

  //   const formData = new FormData();

  //   for (let item of this.uploadedFiles) {
  //     formData.append('files', item.file);
  //   }
  //   const uploadUrl = environment.apiUrl + 'file/uploadgoogle/' + this.customerId + '/' + this.selectedVendor;
  //   this.http.post(uploadUrl,
  //     formData).subscribe({
  //       next: (res) => {
  //         console.log(res);
  //         alert("Uploaded Successfully");
  //       },
  //       error: (err) => {
  //         console.log(err);
  //         alert("Upload Failed");
  //       }
  //     });
  // }

  // uploadAzureFiles() {

  //   if (!this.uploadedFiles || this.uploadedFiles.length === 0) {
  //     alert("Please select files");
  //     return;
  //   }

  //   const formData = new FormData();

  //   for (let i = 0; i < this.uploadedFiles.length; i++) {
  //     formData.append('files', this.uploadedFiles[i].file);
  //   }

  //   const uploadAzureurl = environment.apiUrl + 'file/uploadAzure';

  //   this.http.post<any>(uploadAzureurl, formData)
  //     .subscribe({
  //       next: (res) => {
  //         console.log("Upload Success", res);
  //       },
  //       error: (err) => {
  //         console.error("Upload Failed", err);
  //       }
  //     });
  // }

  isPdf: boolean = false;

  inspectFile(file: File, index: number) {
    this.selectFile(index);

    const uploaded = this.uploadedFiles[index];
    if (!uploaded) return;

    this.fileName = uploaded.name;

    this.selectedFileUrl = uploaded.url;

    if (uploaded.file?.type === 'application/pdf') {
      this.isPdf = true;
      this.isImage = false;
    } else {
      this.isPdf = false;
      this.isImage = true;
    }

    this.zoomLevel = 1;
    this.rotation = 0;
    setTimeout(() => {
      document
        .getElementById('inspector')
        ?.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }, 100);
  }

  transmit() {
    if (!this.selectedTarget) {
      alert('Please select a target');
      return;
    }
    switch (this.selectedTarget) {

      case 'email':
        this.sendMail();
        break;

      case 'upload':
        this.GoogleuploadFiles();
        break;

      case 'azure':
        this.uploadAzureFiles();
        break;

      default:
        alert('Invalid target');
    }
  }
  goToHome() {
    if (this.role === 'Admin') {
      this.router.navigate(['/site/home']);
    }
  }

  openEditModal() {
    this.isEditModalOpen = true;
  }

  closeModal() {
    this.isEditModalOpen = false;
    this.verificationStatus = 'idle';
    this.ErrorMessage = '';
    this.supplierName = '';
    this.invoiceNumber = '';
    this.invoiceDate = '';
  }

  verificationStatus: 'idle' | 'pending' | 'success' | 'error' = 'idle';
  ErrorMessage: string = '';

  verifyAndStandardize() {
    if (!this.supplierName || !this.invoiceNumber || !this.invoiceDate) {
      this.verificationStatus = 'error';
      this.ErrorMessage = 'Please complete all fields before verification.';
      return;
    }

    if (!this.invoiceNumber.toUpperCase().startsWith('INV-')) {
      this.verificationStatus = 'error';
      this.ErrorMessage = 'Invoice number must start with "INV-".';
      return;
    }

    this.verificationStatus = 'pending';
    this.ErrorMessage = '';

    const date = new Date(this.invoiceDate);
    const day = ('0' + date.getDate()).slice(-2);
    const month = ('0' + (date.getMonth() + 1)).slice(-2);
    const year = date.getFullYear();
    const formattedDate = `${day}-${month}-${year}`;

    if (this.selectedIndex !== null && this.uploadedFiles[this.selectedIndex]) {

      const fileObj = this.uploadedFiles[this.selectedIndex];
      const currentFile = fileObj.file;

      let extension = '';
      const parts = currentFile.name.split('.');
      if (parts.length > 1) {
        extension = '.' + parts.pop()!.toLowerCase();
      }

      const newFileName = `SUP-${this.supplierName.toUpperCase()}-${this.customerId}-${this.invoiceNumber}-${formattedDate}${extension}`;

      const renamedFile = new File([currentFile], newFileName, {
        type: currentFile.type,
        lastModified: currentFile.lastModified
      });

      // 9️⃣ Replace the File in the object
      fileObj.file = renamedFile;
      fileObj.name = newFileName;

      this.fileName = newFileName;

      setTimeout(() => {
        this.verificationStatus = 'success';

        setTimeout(() => {
          this.closeModal();
        }, 1200);

      }, 500);

    } else {
      // No file selected
      this.verificationStatus = 'error';
      this.ErrorMessage = 'No file selected to verify.';
    }
  }
  onInputChange() {
    if (this.verificationStatus === 'error') {
      this.verificationStatus = 'idle';
    }
  }
  onDateChange(event: any) {
    this.invoiceDate = event.detail.value;
    this.showDatePicker = false;
  }
  onModalDismiss() {
    this.isEditModalOpen = false;

    this.verificationStatus = 'idle';
    this.supplierName = '';
    this.invoiceNumber = '';
    this.invoiceDate = '';
    this.ErrorMessage = '';
  }

  get completedCount(): number {
    return this.uploadedFiles
      ? this.uploadedFiles.filter(f => f.status === 'COMPLETED').length
      : 0;
  }


  isConfirmModalOpen = false;

  dispatching = false;
  success = false;

  showSuccessBadge = false;

  // Open modal
  // openConfirmModal() {
  //   this.isConfirmModalOpen = true;
  //   this.dispatching = false;
  //   this.success = false;
  // }
  openConfirmModal() {
    if (this.uploadedFiles.length === 0) return;
    this.isConfirmModalOpen = true;
  }

  // Close modal
  closeConfirmModal() {
    this.isConfirmModalOpen = false;
  }
  async startDispatch() {
    if (this.dispatching) return;
    if (this.uploadedFiles.length === 0) return;

    this.dispatching = true;
    this.showSuccessBadge = false;

    try {
      await this.transmit();

      this.uploadedFiles.forEach(f => f.status = 'COMPLETED');

      this.showSuccessBadge = true;

      this.isConfirmModalOpen = false;

      setTimeout(() => {
        this.showSuccessBadge = false;
        this.dispatching = false;
      }, 5000);

    } catch (err: any) {
      console.error('Transmit failed:', err);
      alert('Transmit failed: ' + (err.message || err));
    } finally {
      this.dispatching = false;
    }
  }
  // Send files via Email
  async sendMail(): Promise<void> {
    if (this.uploadedFiles.length === 0) {
      throw new Error("No files selected");
    }

    const formData = new FormData();
    for (let item of this.uploadedFiles) {
      formData.append('files', item.file);
    }

    const sendUrl = `${environment.apiUrl}File/sendzip/${this.email}/${this.customerId}/${this.selectedVendor}`;

    return new Promise<void>((resolve, reject) => {
      this.http.post(sendUrl, formData).subscribe({
        next: () => {
          resolve();
        },
        error: (err) => {
          reject(err);
        }
      });
    });
  }

  // Upload files to Google Drive
  async GoogleuploadFiles(): Promise<void> {
    if (this.uploadedFiles.length === 0) {
      throw new Error("No files selected");
    }

    const formData = new FormData();
    for (let item of this.uploadedFiles) {
      formData.append('files', item.file);
    }

    const uploadUrl = `${environment.apiUrl}file/uploadgoogle/${this.customerId}/${this.selectedVendor}`;

    return new Promise<void>((resolve, reject) => {
      this.http.post(uploadUrl, formData).subscribe({
        next: (res) => {
          resolve(); // resolve promise on success
        },
        error: (err) => {
          console.error(err);
          reject(err); // reject promise on error
        }
      });
    });
  }

  // Upload files to Azure
  async uploadAzureFiles(): Promise<void> {
    if (this.uploadedFiles.length === 0) {
      throw new Error("No files selected");
    }

    const formData = new FormData();
    for (let item of this.uploadedFiles) {
      formData.append('files', item.file);
    }

    const uploadUrl = `${environment.apiUrl}file/uploadazure/${this.customerId}/${this.selectedVendor}`;

    return new Promise<void>((resolve, reject) => {
      this.http.post(uploadUrl, formData).subscribe({
        next: (res) => {
          resolve();
        },
        error: (err) => {
          console.error(err);
          reject(err);
        }
      });
    });
  }

  // Upload files to SQL (if applicable)
  async uploadSQLFiles(): Promise<void> {
    if (this.uploadedFiles.length === 0) {
      throw new Error("No files selected");
    }

    const formData = new FormData();
    for (let item of this.uploadedFiles) {
      formData.append('files', item.file);
    }

    const uploadUrl = `${environment.apiUrl}file/uploadsql/${this.customerId}/${this.selectedVendor}`;

    return new Promise<void>((resolve, reject) => {
      this.http.post(uploadUrl, formData).subscribe({
        next: (res) => {
          resolve();
        },
        error: (err) => {
          console.error(err);
          reject(err);
        }
      });
    });
  }
}
