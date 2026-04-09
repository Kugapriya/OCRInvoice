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

  ngOnInit() { }

  menuItems = [
    { title: 'Dashboard', icon: 'speedometer-outline', url: '/site/dashboard' },
    { title: 'Uploaded Files', icon: 'document-outline', url: '/site/home/uploadedfiles' },

  ];

  navigateTo(url: string) {
    this.router.navigateByUrl(url);
  }
}
