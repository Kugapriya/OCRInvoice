import { Component } from '@angular/core';
import { Router } from '@angular/router';
import { AuthService } from '../core/services/auth.service';
import { ActivityService } from '../core/services/activity.service';

@Component({
  selector: 'app-home',
  templateUrl: 'home.page.html',
  styleUrls: ['home.page.scss'],
  standalone: false,
})
export class HomePage {

  constructor(
    private router: Router,
    private authService: AuthService,
    private activityService: ActivityService
  ) { }
  // menuItems = [
  //   { title: 'Dashboard', icon: 'speedometer-outline', url: '/site/dashboard' },
  //   // { title: 'Customers', icon: 'people-outline', url: '/site/customers' }
  // ];


  // navigateTo(url: string) {
  //   this.router.navigate([url]);
  // }

  goToDashboard() {
    this.router.navigate(['/site/dashboard']);
  }

  menuItems = [
    {
      title: 'Dashboard',
      icon: 'speedometer-outline',
      color: '#ffffff',
      bgColor: '#3880ff',
      borderColor: '#1e5fd9',
      url: '/site/dashboard'
    },
    {
      title: 'Uploaded Files',
      icon: 'document-outline',
      color: '#ffffff',
      bgColor: '#2dd36f',
      borderColor: '#1ca64b',
      url: '/site/home/uploadedfiles'
    },
    {
      title: 'Invoice Headers',
      icon: 'receipt-outline',
      color: '#ffffff',
      bgColor: '#ff9f1c',
      borderColor: '#d98200',
      url: '/site/home/invoiceheaders'
    },
    {
      title: 'Vendors',
      icon: 'storefront-outline',
      color: '#ffffff',
      bgColor: '#169cb4',
      borderColor: '#0c7385',
      url: '/site/home/vendors'
    }
  ];

  navigateTo(url: string) {
    this.router.navigate([url]);
  }

  logout() {
    this.activityService.stopHeartbeat();
    this.authService.logout();
    this.router.navigate(['/login']);
  }

}
