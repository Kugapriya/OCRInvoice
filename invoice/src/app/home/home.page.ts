import { Component } from '@angular/core';
import { Router } from '@angular/router';

@Component({
  selector: 'app-home',
  templateUrl: 'home.page.html',
  styleUrls: ['home.page.scss'],
  standalone: false,
})
export class HomePage {

  constructor(private router: Router) {}
  menuItems = [
    { title: 'Dashboard', icon: 'speedometer-outline', url: '/site/dashboard' },
    // title: 'Invoices', icon: 'document-text-outline', url: '/invoices' },
    { title: 'Customers', icon: 'people-outline', url: '/customers' },
    // { title: 'Settings', icon: 'settings-outline', url: '/settings' },
    // { title: 'Profile', icon: 'person-outline', url: '/profile' }
  ];


  navigateTo(url: string) {
    this.router.navigate([url]);
  }

  goToDashboard() {
    this.router.navigate(['/site/dashboard']);
  }
}
