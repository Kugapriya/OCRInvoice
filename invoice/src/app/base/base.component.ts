import { CommonModule } from '@angular/common';
import { Component, OnInit } from '@angular/core';
import { NavigationEnd, Router } from '@angular/router';
import { IonicModule } from '@ionic/angular';
import { RepositoryService } from '../core/services/repository.service';
import { filter } from 'rxjs/operators';
import { SharedModule } from '../shared/shared.module';

@Component({
  selector: 'app-base',
  templateUrl: './base.component.html',
  styleUrls: ['./base.component.scss'],
  imports: [IonicModule, CommonModule, SharedModule]
})
export class BaseComponent implements OnInit {

  currentUrl = '';

  mainMenuItems = [
    { title: 'Home',      icon: 'home-outline',        activeIcon: 'home',        url: '/site/home',               exact: true },
    { title: 'Dashboard', icon: 'speedometer-outline', activeIcon: 'speedometer', url: '/site/dashboard' },
    { title: 'Files',     icon: 'document-outline',    activeIcon: 'document',    url: '/site/home/uploadedfiles' },
    { title: 'Invoices',  icon: 'receipt-outline',     activeIcon: 'receipt',     url: '/site/home/invoiceheaders' },
    { title: 'Vendors',   icon: 'storefront-outline',  activeIcon: 'storefront',  url: '/site/home/vendors' },
  ];

  constructor(
    private router: Router,
    public repository: RepositoryService
  ) {
    if (!this.repository.loggedInUser) {
      const stored = localStorage.getItem('customer');
      if (stored) {
        try {
          const parsed = JSON.parse(stored);
          this.repository.loggedInUser = parsed?.user || parsed;
        } catch {}
      }
    }
  }

  ngOnInit() {
    this.repository.loadSelectedStoreFromStorage();
    this.repository.loadCustomerIdFromStorage();

    this.currentUrl = this.router.url;
    this.router.events
      .pipe(filter(e => e instanceof NavigationEnd))
      .subscribe((e: any) => {
        this.currentUrl = e.urlAfterRedirects;
      });
  }

  isActive(item: { url: string; exact?: boolean }): boolean {
    return item.exact
      ? this.currentUrl === item.url
      : this.currentUrl.startsWith(item.url);
  }

  get currentPageTitle(): string {
    const match = this.mainMenuItems.find(i => this.isActive(i));
    return match ? match.title : 'DocMate';
  }

  navigateTo(url: string) {
    this.router.navigateByUrl(url);
  }

  logout() {
    localStorage.clear();
    this.router.navigateByUrl('/login');
  }
}
