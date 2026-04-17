import { CommonModule } from '@angular/common';
import { HttpClient } from '@angular/common/http';
import { Component, OnInit } from '@angular/core';
import { IonicModule } from '@ionic/angular';
import { UploadedFiles } from 'src/app/_model/uploadedFiles';
import { AlertService } from 'src/app/core/services/alert.service';
import { RepositoryService } from 'src/app/core/services/repository.service';
import { environment } from 'src/environments/environment';

const baseurl = environment.apiUrl;

@Component({
  selector: 'app-uploaded-files',
  templateUrl: './uploaded-files.component.html',
  styleUrls: ['./uploaded-files.component.scss'],
  imports: [IonicModule, CommonModule]
})
export class UploadedFilesComponent implements OnInit {

  constructor(private http: HttpClient, private repository: RepositoryService, private alertService: AlertService) { }

  ngOnInit(): void {
    this.loadFiles();
  }

  uploadedFiles: UploadedFiles[] = [];
  loading = false;
  error: string | null = null;


  loadFiles() {
    if (!this.repository.customerId) {
      this.error = 'Please select a store first.';
      this.loading = false;
      return;
    }
    this.loading = true;
    this.error = null;

    this.http.get<UploadedFiles[]>(`${baseurl}file/getuploadedFiles/${this.repository.customerId}`).subscribe({
      next: (files) => {
        this.uploadedFiles = files;
        this.loading = false;
      },
      error: (err) => {
        this.error = 'Failed to load files';
        this.loading = false;
      }
    });
  }

  // isRecent(uploadedTime: string | Date): boolean {
  //   const fileDate = new Date(uploadedTime);
  //   const sevenDaysAgo = new Date();
  //   sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
  //   return fileDate >= sevenDaysAgo;
  // }

  downloadFile(file: UploadedFiles) {
    if (!file.filePath || !file.fileName) {
      this.alertService.showErrorToast('File data is missing', 3000, 'top');
      return;
    }

    const url = this.repository.getDownloadUrl(file.filePath);

    fetch(url, { method: 'GET' })
      .then((response) => {
        if (response.ok) {
          const link = document.createElement('a');
          link.href = url;
          link.download = file.fileName;
          link.click();
          URL.revokeObjectURL(link.href);
        } else if (response.status === 404) {
          this.alertService.showErrorToast('File not found', 3000, 'top');
        } else if (response.status === 500) {
          this.alertService.showErrorToast('Server error - file path may be invalid', 3000, 'top');
        } else {
          this.alertService.showErrorToast(`Failed to download file (${response.status})`, 3000, 'top');
        }
      })
      .catch((error) => {
        this.alertService.showErrorToast('File not found or path is invalid', 3000, 'top');
      });
  }

  previewFile(file: UploadedFiles) {
    if (!file.filePath) {
      this.alertService.showErrorToast('File data is missing', 3000, 'top');
      return;
    }

    const url = this.repository.getPreviewUrl(file.filePath);

    fetch(url, { method: 'GET' })
      .then((response) => {
        if (response.ok) {
          window.open(url, '_blank', 'noopener');
        } else if (response.status === 404) {
          this.alertService.showErrorToast('File not found', 3000, 'top');
        } else if (response.status === 500) {
          this.alertService.showErrorToast('Server error - file path may be invalid', 3000, 'top');
        } else {
          this.alertService.showErrorToast(`Failed to preview file (${response.status})`, 3000, 'top');
        }
      })
      .catch((error) => {
        this.alertService.showErrorToast('File not found or path is invalid', 3000, 'top');
      });
  }
  getFormattedDateWithMs(date: string): string {
    const d = new Date(date);
    const ms = d.getMilliseconds().toString().padStart(3, '0');
    return `${d.getFullYear()}-${(d.getMonth() + 1).toString().padStart(2, '0')}-${d.getDate().toString().padStart(2, '0')} ` +
      `${d.getHours().toString().padStart(2, '0')}:${d.getMinutes().toString().padStart(2, '0')}:${d.getSeconds().toString().padStart(2, '0')}.${ms}`;
  }
}
