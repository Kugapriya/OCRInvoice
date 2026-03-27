import { Component, OnInit } from '@angular/core';
import { RepositoryService } from '../core/services/repository.service';
import { Router, RouterModule } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { IonicModule } from '@ionic/angular';
import { CommonModule } from '@angular/common';
import { Store } from '../_model/store';
import { Customer } from '../_model/customer';

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
  //     localStorage.clear();

  //     this.router.navigate(['/site/dashboard']).then(() => {
  //       location.reload();
  //     });
  //   } else {
  //     this.router.navigate(['/site/dashboard']);
  //   }
  // }

  // setStore(store: Store) {
  //   const selSite = this.repository.selectedStore;

  //   this.repository.setStore(store);
  //   this.repository.getCustomerByStore(this.repository.loggedInUser!.username, store.storeId!).subscribe((res: Customer) => {
  //       localStorage.setItem('cust', JSON.stringify(res));
  //       if (selSite && selSite.storeId !== store.storeId) {
  //         this.router.navigate(['/site/dashboard']).then(() => {
  //           location.reload();
  //         });
  //       } else {
  //         this.router.navigate(['/site/dashboard']);
  //       }
  //     }, error => {
  //       console.error(error);
  //     });
  // }
  setStore(store: Store) {
    const selSite = this.repository.selectedStore;
    this.repository.setStore(store);

    const username = this.repository.loggedInUser?.username;

    if (!username || !store.storeId) {
      console.error('Missing username or storeId');
      return;
    }

    this.repository.getCustomerByStore(username, store.storeId).subscribe((res: Customer | null) => {
        if (!res) {
          console.log('Customer not found for selected store');
          return;
        }

        localStorage.setItem('cust', JSON.stringify(res));
        if (selSite && selSite.storeId !== store.storeId) {
          this.router.navigate(['/site/dashboard']);
        } else {
          this.router.navigate(['/site/dashboard']);
        }

      }, error => {
        console.error(error);
      });
  }
}
