import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { VendorsComponent } from './vendors/vendors.component';
import { VendorEditComponent } from './vendor-edit/vendor-edit.component';

const routes: Routes = [
  { path: 'vendors', component: VendorsComponent },
  { path: 'vendor-edit/:id', component: VendorEditComponent }
];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule]
})
export class FeaturesRoutingModule { }
