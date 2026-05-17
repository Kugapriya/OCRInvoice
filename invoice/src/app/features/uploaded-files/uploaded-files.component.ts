import { CommonModule } from '@angular/common';
import { HttpClient } from '@angular/common/http';
import { Component, OnInit } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { DomSanitizer, SafeResourceUrl } from '@angular/platform-browser';
import { IonicModule } from '@ionic/angular';
import { UploadedFiles } from 'src/app/_model/uploadedFiles';
import { RepositoryService } from 'src/app/core/services/repository.service';
import { ActivityService } from 'src/app/core/services/activity.service';
import { environment } from 'src/environments/environment';

const baseurl = environment.apiUrl;

@Component({
  selector: 'app-uploaded-files',
  templateUrl: './uploaded-files.component.html',
  styleUrls: ['./uploaded-files.component.scss'],
  imports: [IonicModule, CommonModule, FormsModule]
})
export class UploadedFilesComponent implements OnInit {

  uploadedFiles: UploadedFiles[] = [];
  filteredFiles: UploadedFiles[] = [];
  pagedFiles: UploadedFiles[] = [];
  currentPage = 1;
  pageSize = 10;
  filterFrom: string = '';
  filterTo: string = '';

  previewVisible = false;
  previewFileName = '';
  previewIsPdf = false;
  previewIsImage = false;
  safePreviewUrl: SafeResourceUrl = '';
  previewFileRef: UploadedFiles | null = null;

  constructor(
    private http: HttpClient,
    private repository: RepositoryService,
    private sanitizer: DomSanitizer,
    private activityService: ActivityService
  ) {}

  ngOnInit(): void {
    this.activityService.log('page_view', 'uploaded-files', this.repository.customerId ?? undefined);
    this.loadFiles();
  }

  loadFiles() {
    if (!this.repository.customerId) return;
    this.http.get<UploadedFiles[]>(`${baseurl}file/getuploadedFiles/${this.repository.customerId}`).subscribe({
      next: (files) => {
        this.uploadedFiles = files;
        this.currentPage = 1;
        this.applyFilter();
      },
      error: () => {}
    });
  }

  async previewFile(file: UploadedFiles) {
    if (!file.filePath) return;

    const url = this.repository.getPreviewUrl(file.filePath);

    try {
      const res = await fetch(url, { method: 'HEAD' });
      if (!res.ok) return;
    } catch {
      return;
    }

    const ext = file.fileName?.split('.').pop()?.toLowerCase() || '';
    this.previewFileName = file.fileName;
    this.previewFileRef = file;
    this.previewIsPdf = ext === 'pdf';
    this.previewIsImage = ['jpg', 'jpeg', 'png', 'gif', 'webp'].includes(ext);
    this.safePreviewUrl = this.sanitizer.bypassSecurityTrustResourceUrl(url);
    this.previewVisible = true;
  }

  closePreview() {
    this.previewVisible = false;
    this.safePreviewUrl = '';
  }

  async downloadFile(file: UploadedFiles) {
    if (!file.filePath || !file.fileName) return;

    const url = this.repository.getDownloadUrl(file.filePath);

    try {
      const res = await fetch(url, { method: 'HEAD' });
      if (!res.ok) return;
    } catch {
      return;
    }

    const link = document.createElement('a');
    link.href = url;
    link.download = file.fileName;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }

  get totalPages(): number {
    return Math.ceil(this.filteredFiles.length / this.pageSize);
  }

  applyFilter() {
    const from = this.filterFrom ? new Date(this.filterFrom) : null;
    const to = this.filterTo ? new Date(this.filterTo + 'T23:59:59') : null;

    this.filteredFiles = this.uploadedFiles.filter(f => {
      const d = new Date(f.uploadedTime);
      if (from && d < from) return false;
      if (to   && d > to)   return false;
      return true;
    });

    this.currentPage = 1;
    this.updatePage();
  }

  clearFilter() {
    this.filterFrom = '';
    this.filterTo = '';
    this.applyFilter();
  }

  updatePage() {
    const start = (this.currentPage - 1) * this.pageSize;
    this.pagedFiles = this.filteredFiles.slice(start, start + this.pageSize);
  }

  goToPage(page: number) {
    if (page < 1 || page > this.totalPages) return;
    this.currentPage = page;
    this.updatePage();
  }

  getFileIcon(fileName: string): string {
    const ext = fileName?.split('.').pop()?.toLowerCase() || '';
    if (ext === 'pdf') return 'document-text-outline';
    if (['jpg', 'jpeg', 'png', 'gif', 'webp'].includes(ext)) return 'image-outline';
    if (['xls', 'xlsx', 'csv'].includes(ext)) return 'grid-outline';
    if (['doc', 'docx'].includes(ext)) return 'document-outline';
    if (['zip', 'rar'].includes(ext)) return 'archive-outline';
    return 'attach-outline';
  }

  getFileClass(fileName: string): string {
    const ext = fileName?.split('.').pop()?.toLowerCase() || '';
    if (ext === 'pdf') return 'avatar-pdf';
    if (['jpg', 'jpeg', 'png', 'gif', 'webp'].includes(ext)) return 'avatar-img';
    if (['xls', 'xlsx', 'csv'].includes(ext)) return 'avatar-xls';
    if (['doc', 'docx'].includes(ext)) return 'avatar-doc';
    return 'avatar-default';
  }
}
