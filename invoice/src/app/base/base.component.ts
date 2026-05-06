import { CommonModule } from '@angular/common';
import { Component, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { IonicModule } from '@ionic/angular';
import { RepositoryService } from '../core/services/repository.service';

@Component({
  selector: 'app-base',
  templateUrl: './base.component.html',
  styleUrls: ['./base.component.scss'],
  imports: [IonicModule, CommonModule]
})
export class BaseComponent implements OnInit {

  constructor(private router: Router, public repository: RepositoryService) { }

  ngOnInit() {
    this.repository.loadSelectedStoreFromStorage();
    this.repository.loadCustomerIdFromStorage();
  }

  menuItems = [
    { title: 'Dashboard', icon: 'speedometer-outline', url: '/site/dashboard' },
    { title: 'Uploaded Files', icon: 'document-outline', url: '/site/home/uploadedfiles' },
    { title: 'Invoice Headers', icon: 'receipt-outline', url: '/site/home/invoiceheaders' },
    { title: 'Vendors', icon: 'storefront-outline', url: '/site/home/vendors' },
    { title: 'Logout', icon: 'log-out-outline', url: 'logout' }
  ];

  navigateTo(url: string) {
    if (url === 'logout') {
      this.logout();
    } else {
      this.router.navigateByUrl(url);
    }
  }
  logout() {
    localStorage.clear();
    this.router.navigateByUrl('/login');
  }
}
