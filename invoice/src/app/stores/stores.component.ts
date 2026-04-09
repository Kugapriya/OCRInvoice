import { Component, OnInit } from '@angular/core';
import { RepositoryService } from '../core/services/repository.service';
import { Router, RouterModule } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { IonicModule } from '@ionic/angular';
import { CommonModule } from '@angular/common';
import { Store } from '../_model/store';

@Component({
  standalone: true,
  imports: [CommonModule, FormsModule, IonicModule, RouterModule],
  selector: 'app-stores',
  templateUrl: './stores.component.html',
  styleUrls: ['./stores.component.scss'],
})
export class StoresComponent implements OnInit {
  searchText: string = '';
  filteredStores: Store[] = [];
  constructor(public repository: RepositoryService,
    private router: Router) { }

  ngOnInit() {
    this.loadStores();
  }

  loadStores() {
    this.repository.getStores(this.repository.loggedInUser!.username).subscribe(
      (response: Store[]) => {
        this.repository.stores = response;
        this.filteredStores = [...(this.repository.stores || [])];
      },
      error => {
        console.error(error);
      }
    );
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

    this.repository.customerId = store.customerId;
    localStorage.setItem('selectedStore', JSON.stringify(store));
    localStorage.setItem('cust', JSON.stringify({ customerId: store.customerId }));
    this.router.navigate(['/site/dashboard']);
  }
}