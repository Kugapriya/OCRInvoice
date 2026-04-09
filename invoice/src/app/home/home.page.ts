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
    // { title: 'Customers', icon: 'people-outline', url: '/site/customers' }
  ];


  navigateTo(url: string) {
    this.router.navigate([url]);
  }

  goToDashboard() {
    this.router.navigate(['/site/dashboard']);
  }
}
