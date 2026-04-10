import { Component } from '@angular/core';
import { Router } from '@angular/router';

@Component({
  selector: 'app-home',
  templateUrl: 'home.page.html',
  styleUrls: ['home.page.scss'],
  standalone: false,
})
export class HomePage {

  constructor(private router: Router) { }
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
  }
];

  navigateTo(url: string) {
    this.router.navigate([url]);
  }

}
