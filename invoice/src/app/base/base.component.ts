import { CommonModule } from '@angular/common';
import { Component, OnInit } from '@angular/core';
import { NavigationEnd, Router } from '@angular/router';
import { MenuController } from '@ionic/angular';
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
    { title: 'Home',            icon: 'home-outline',        url: '/site/home',               exact: true },
    { title: 'Dashboard',       icon: 'speedometer-outline', url: '/site/dashboard' },
    { title: 'Uploaded Files',  icon: 'document-outline',    url: '/site/home/uploadedfiles' },
    { title: 'Invoice Headers', icon: 'receipt-outline',     url: '/site/home/invoiceheaders' },
    { title: 'Vendors',         icon: 'storefront-outline',  url: '/site/home/vendors' },
  ];

  constructor(
    private router: Router,
    private menuCtrl: MenuController,
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
        this.menuCtrl.close('site-menu');
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
    this.menuCtrl.close('site-menu');
    this.router.navigateByUrl(url);
  }

  logout() {
    this.menuCtrl.close('site-menu');
    localStorage.clear();
    this.router.navigateByUrl('/login');
  }
}
