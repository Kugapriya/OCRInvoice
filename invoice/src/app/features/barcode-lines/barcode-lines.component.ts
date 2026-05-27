import { CommonModule } from '@angular/common';
import { HttpClient } from '@angular/common/http';
import { Component, ElementRef, HostListener, NgZone, OnDestroy, OnInit, ViewChild } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { AlertController, IonicModule } from '@ionic/angular';
import { Capacitor } from '@capacitor/core';
import { BarcodeScanner } from '@capacitor-mlkit/barcode-scanning';
import { BrowserMultiFormatReader } from '@zxing/browser';
import { BarcodeFormat, DecodeHintType } from '@zxing/library';
import { environment } from 'src/environments/environment';
import { AlertService } from 'src/app/core/services/alert.service';
import { ActivityService } from 'src/app/core/services/activity.service';
import { RepositoryService } from 'src/app/core/services/repository.service';
import { TopNavComponent } from 'src/app/shared/top-nav/top-nav.component';
import { CanDeactivateBarcode } from 'src/app/core/_guards/unsaved-barcode.guard';

export interface InvoiceLine {
  id: number;
  lineNo: number | null;
  code: string | null;
  description: string | null;
  casePack: number | null;
  unitSize: string | null;
  qty: number | null;
  unitPrice: number | null;
  lineNet: number | null;
  barcode: string | null;
  isManual: boolean | null;
  docNumber: string | null;
  supplierName: string | null;
}

@Component({
  standalone: true,
  selector: 'app-barcode-lines',
  imports: [CommonModule, FormsModule, IonicModule, TopNavComponent],
  templateUrl: './barcode-lines.component.html',
  styleUrls: ['./barcode-lines.component.scss'],
})
export class BarcodeLinesComponent implements OnInit, OnDestroy, CanDeactivateBarcode {
  @ViewChild('webVideoEl') webVideoEl?: ElementRef<HTMLVideoElement>;

  invoiceNumber = '';
  fileId: number | null = null;
  fileName = '';

  allLines: InvoiceLine[] = [];
  noBarcode: InvoiceLine[] = [];
  withBarcode: InvoiceLine[] = [];

  activeTab: 'nobarcode' | 'all' = 'nobarcode';

  // Inline barcode editing
  editingId: number | null = null;
  editValues: { [id: number]: string } = {};
  saving = false;

  // Web barcode scanner
  webScannerActive = false;
  private webControls: { stop: () => void } | null = null;

  get displayLines(): InvoiceLine[] {
    return this.activeTab === 'nobarcode' ? this.noBarcode : this.allLines;
  }

  get supplierName(): string {
    return this.allLines[0]?.supplierName || '';
  }

  /** True when any input has a typed but unsaved value */
  get hasUnsavedChanges(): boolean {
    // No-barcode lines with typed values
    const noBarcodeDirty = this.noBarcode.some(
      l => (this.editValues[l.id] || '').trim() !== ''
    );
    // bc-has line in edit mode whose value differs from saved barcode
    let editDirty = false;
    if (this.editingId !== null) {
      const line = this.allLines.find(l => l.id === this.editingId);
      if (line) {
        editDirty =
          (this.editValues[this.editingId] || '').trim() !==
          (line.barcode || '').trim();
      }
    }
    return noBarcodeDirty || editDirty;
  }

  constructor(
    private router: Router,
    private http: HttpClient,
    private zone: NgZone,
    private alertController: AlertController,
    private alertService: AlertService,
    private activityService: ActivityService,
    private repository: RepositoryService,
  ) { }

  ngOnInit(): void {
    const state = history.state;

    this.invoiceNumber = state?.['invoiceNumber'] || '';
    this.fileId = state?.['fileId'] ? +state['fileId'] : null;
    this.fileName = state?.['fileName'] || '';
    this.activeTab = state?.['tab'] === 'all' ? 'all' : 'nobarcode';

    if (this.invoiceNumber) {
      this.activityService.log(
        'barcode_lines_view', 'barcode-lines',
        this.repository.customerId ?? undefined
      );
      this.loadLines();
    }
  }

  ngOnDestroy(): void {
    this.stopWebScan();
  }

  // ── Browser / app close guard ──────────────────────────────
  @HostListener('window:beforeunload', ['$event'])
  onBeforeUnload(event: BeforeUnloadEvent) {
    if (this.hasUnsavedChanges) {
      event.preventDefault();
    }
  }

  // ── Route deactivate guard ─────────────────────────────────
  async canDeactivate(): Promise<boolean> {
    if (!this.hasUnsavedChanges) return true;
    return this.showUnsavedAlert();
  }

  // ── Tab switch guard ───────────────────────────────────────
  async switchTab(tab: 'nobarcode' | 'all') {
    if (tab === this.activeTab) return;
    if (this.hasUnsavedChanges) {
      const confirmed = await this.showUnsavedAlert();
      if (!confirmed) return;
      // Discard: clear all typed values
      this.noBarcode.forEach(l => { this.editValues[l.id] = ''; });
      this.editingId = null;
    }
    this.activeTab = tab;
  }

  private async showUnsavedAlert(): Promise<boolean> {
    const alert = await this.alertController.create({
      header: 'Unsaved Barcodes',
      message: 'You have unsaved barcode entries. If you leave now your changes will be lost.',
      cssClass: 'unsaved-alert',
      buttons: [
        { text: 'Stay & Save', role: 'cancel' },
        { text: 'Leave', role: 'confirm', cssClass: 'leave-btn' },
      ],
    });
    await alert.present();
    const { role } = await alert.onDidDismiss();
    return role === 'confirm';
  }

  // ──────────────────────────────────────────────────────────

  loadLines() {
    if (!this.invoiceNumber) return;
    this.http.get<InvoiceLine[]>(
      `${environment.apiUrl}file/getLinesByInvoice/${encodeURIComponent(this.invoiceNumber)}`
    ).subscribe({
      next: (lines) => {
        this.allLines = lines || [];
        this.noBarcode = this.allLines.filter(l => !l.barcode || l.barcode.trim() === '');
        this.withBarcode = this.allLines.filter(l => l.barcode && l.barcode.trim() !== '');
        this.editValues = {};
        this.noBarcode.forEach(l => { this.editValues[l.id] = ''; });
      },
      error: (err) => {
        this.alertService.showErrorToast(err?.error?.message || 'Failed to load invoice lines');
      },
    });
  }

  startEdit(line: InvoiceLine) {
    this.editingId = line.id;
    this.editValues[line.id] = line.barcode || '';
  }

  cancelEdit(line: InvoiceLine) {
    this.editValues[line.id] = line.barcode || '';
    this.editingId = null;
  }

  saveBarcode(line: InvoiceLine) {
    const val = (this.editValues[line.id] || '').trim();
    if (!val) {
      this.alertService.showToast('Barcode cannot be empty.', 3000, 'top');
      return;
    }
    if (val.length > 13) {
      this.alertService.showToast('Maximum 13 digit.', 3000, 'top');
      return;
    }
    this.saving = true;
    const encodedBarcode = encodeURIComponent(val);
    this.http.put(
      `${environment.apiUrl}file/updateLineBarcode/${line.id}/${encodedBarcode}`,
      {}
    ).subscribe({
      next: () => {
        line.barcode = val;
        this.editingId = null;
        delete this.editValues[line.id];
        this.saving = false;
        this.noBarcode = this.allLines.filter(l => !l.barcode || l.barcode.trim() === '');
        this.withBarcode = this.allLines.filter(l => l.barcode && l.barcode.trim() !== '');
        this.alertService.showSuccessToast('Barcode saved');
      },
      error: (err) => {
        this.alertService.showErrorToast(err?.error?.message || 'Failed to save barcode');
        this.saving = false;
      },
    });
  }

  async scanBarcode(line: InvoiceLine) {
    this.editingId = line.id;

    if (Capacitor.getPlatform() === 'web') {
      this.webScannerActive = true;
      this.startWebScan();
      return;
    }

    try {
      const { supported } = await BarcodeScanner.isSupported();
      if (!supported) {
        this.alertService.showToast('Barcode scanning is not supported on this device.', 3000, 'top');
        return;
      }

      const { camera } = await BarcodeScanner.requestPermissions();
      if (camera !== 'granted' && camera !== 'limited') {
        this.alertService.showToast('Camera permission denied. Please enable in device settings.', 3000, 'top');
        return;
      }

      const { barcodes } = await BarcodeScanner.scan();
      if (barcodes.length > 0) {
        const scanned = barcodes[0].rawValue ?? '';
        this.zone.run(() => {
          this.editValues[line.id] = scanned;
          // Auto-save after scanning
          this.saveBarcode(line);
        });
      }
    } catch {
      this.alertService.showErrorToast('Barcode scan failed. Please try again.');
    }
  }

  private async startWebScan() {
    const videoEl = this.webVideoEl?.nativeElement;
    if (!videoEl) {
      this.alertService.showErrorToast('Video element not found.');
      this.webScannerActive = false;
      return;
    }

    try {
      // Simple barcode reader setup
      const hints = new Map();
      hints.set(DecodeHintType.TRY_HARDER, true);

      const reader = new BrowserMultiFormatReader(hints);

      // Mobile-friendly: simple constraints, let browser choose resolution
      this.webControls = await reader.decodeFromConstraints(
        {
          audio: false,
          video: {
            facingMode: 'environment'
          }
        },
        videoEl,
        (result, _error, controls) => {
          if (result) {
            this.zone.run(() => {
              const scannedBarcode = result.getText();

              // Check if scanned barcode is too long
              if (scannedBarcode.length > 13) {
                this.alertService.showToast('Maximum 13 digit.', 3000, 'top');
                controls.stop();
                this.webScannerActive = false;
              } else if (this.editingId !== null) {
                // Barcode is valid - save it
                this.editValues[this.editingId] = scannedBarcode;
                const line = this.allLines.find(l => l.id === this.editingId);
                if (line) {
                  this.saveBarcode(line);
                }
                controls.stop();
                this.webScannerActive = false;
              }
            });
          }
        }
      );

    } catch (err: any) {
      this.zone.run(() => this.stopWebScan());
      console.error('Camera error:', err);
      this.alertService.showErrorToast('Camera failed. Try again.');
    }
  }

  stopWebScan() {
    this.webControls?.stop();
    this.webControls = null;
    const videoEl = this.webVideoEl?.nativeElement;
    if (videoEl?.srcObject) {
      (videoEl.srcObject as MediaStream).getTracks().forEach(t => t.stop());
      videoEl.srcObject = null;
    }
    this.webScannerActive = false;
  }

  filterDigits(lineId: number, event: Event) {
    const el = event.target as HTMLInputElement;
    const clean = el.value.replace(/\D/g, '').slice(0, 13);
    el.value = clean;
    this.editValues[lineId] = clean;
  }

  async goBack() {
    if (this.hasUnsavedChanges) {
      const confirmed = await this.showUnsavedAlert();
      if (!confirmed) return;
    }
    this.router.navigate(['/site/dashboard']);
  }
}
