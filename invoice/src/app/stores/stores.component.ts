import { Component, OnInit } from '@angular/core';
import { RepositoryService } from '../core/services/repository.service';
import { AuthService } from '../core/services/auth.service';
import { AlertService } from '../core/services/alert.service';
import { Router, RouterModule } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { IonicModule } from '@ionic/angular';
import { CommonModule } from '@angular/common';
import { Store } from '../_model/store';
import { SharedModule } from '../shared/shared.module';

@Component({
  standalone: true,
  imports: [CommonModule, FormsModule, IonicModule, RouterModule, SharedModule],
  selector: 'app-stores',
  templateUrl: './stores.component.html',
  styleUrls: ['./stores.component.scss'],
})
export class StoresComponent implements OnInit {
  searchText: string = '';
  filteredStores: Store[] = [];
  constructor(public repository: RepositoryService,
    private router: Router, private authService: AuthService,
    private alertService: AlertService) { }

  ngOnInit() {
    this.loadStores();
  }

  loadStores() {
    const username = this.repository.loggedInUser?.username || this.authService.decodedToken?.nameid;
    if (!username) return;
    this.repository.getStores(username).subscribe({
      next: (response: Store[]) => {
        this.repository.stores = response;
        this.filteredStores = [...(this.repository.stores || [])];
      },
      error: () => this.alertService.showErrorToast('Failed to load stores')
    });
  }

  filterStores() {
    const search = this.searchText.trim().toLowerCase();

    const stores = this.repository.stores || [];

    if (!search) {
      this.filteredStores = [...stores];
      return;
    }

    this.filteredStores = stores.filter((store: Store) =>
      store.storeName?.toLowerCase().includes(search) ||
      store.storeId?.toLowerCase().includes(search)
    );
  }

  // setStore(store: Store) {
  //   const selSite = this.repository.selectedStore;
  //   this.repository.setStore(store);

  //   if (selSite && selSite.storeId !== store.storeId) {
  //     // localStorage.clear();

  //     this.router.navigate(['/site/dashboard']).then(() => {
  //       location.reload();
  //     });
  //   } else {
  //     this.router.navigate(['/site/dashboard']);
  //   }
  // }

  setStore(store: Store) {
    this.repository.selectedStore = store;
    this.repository.setStore(store);

    if (store.customerId) {
      this.repository.setCustomerIdFromStore(store.customerId);
    }

    localStorage.setItem('selectedStore', JSON.stringify(store));
    this.router.navigate(['/site/dashboard']);
  }
}