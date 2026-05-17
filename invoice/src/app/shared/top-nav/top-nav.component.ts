import { CommonModule } from '@angular/common';
import { Component, Input, OnDestroy, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { AlertController, IonicModule } from '@ionic/angular';
import { RepositoryService } from '../../core/services/repository.service';
import { AuthService } from '../../core/services/auth.service';
import { ActivityService } from '../../core/services/activity.service';

@Component({
  standalone: true,
  imports: [CommonModule, IonicModule],
  selector: 'app-top-nav',
  templateUrl: './top-nav.component.html',
  styleUrls: ['./top-nav.component.scss'],
})
export class TopNavComponent implements OnInit, OnDestroy {
  @Input() showDetails = false;

  customerId = '';
  localDate = '';
  localTime = '';
  localDay = '';

  private timer: any;

  constructor(
    private router: Router,
    private alertController: AlertController,
    public repository: RepositoryService,
    private authService: AuthService,
    private activityService: ActivityService
  ) {}

  ngOnInit() {
    this.repository.loadSelectedStoreFromStorage();
    this.repository.loadCustomerIdFromStorage();

    this.customerId = this.repository.customerId || '';
    if (!this.customerId) {
      const cust = localStorage.getItem('cust') || '';
      try { this.customerId = cust ? JSON.parse(cust).customerId : ''; } catch {}
    }

    if (this.showDetails) {
      this.updateTime();
      this.timer = setInterval(() => this.updateTime(), 1000);
    }
  }

  ngOnDestroy() {
    clearInterval(this.timer);
  }

  private updateTime() {
    const now = new Date();
    this.localDate = new Intl.DateTimeFormat(undefined, { day: '2-digit', month: '2-digit', year: 'numeric' }).format(now);
    this.localTime = new Intl.DateTimeFormat(undefined, { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false }).format(now);
    this.localDay = new Intl.DateTimeFormat(undefined, { weekday: 'long' }).format(now);
  }

  get isStorePage(): boolean {
    return this.router.url === '/site';
  }

  get selectedStoreIdDisplay(): string {
    return this.repository.selectedStore?.storeId || localStorage.getItem('storeId') || '';
  }

  get selectedStoreNameDisplay(): string {
    return this.repository.selectedStore?.storeName || localStorage.getItem('storeName') || '';
  }

  async confirmLogout() {
    const alert = await this.alertController.create({
      header: 'Log Out',
      message: 'Are you sure you want to log out?',
      cssClass: 'logout-alert',
      buttons: [
        { text: 'Cancel', role: 'cancel' },
        {
          text: 'Log Out',
          role: 'confirm',
          cssClass: 'logout-confirm-btn',
          handler: () => {
            this.activityService.stopHeartbeat();
            this.authService.logout();
            this.router.navigateByUrl('/login');
          }
        }
      ]
    });
    await alert.present();
  }
}
