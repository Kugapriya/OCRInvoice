import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { IonicModule } from '@ionic/angular';
import { HttpClientModule } from '@angular/common/http';

import { FeaturesRoutingModule } from './features.routing.module';
import { InvoiceHeadersComponent } from './invoice-headers/invoice-headers.component';
import { VendorsComponent } from './vendors/vendors.component';
import { VendorEditComponent } from './vendor-edit/vendor-edit.component';


@NgModule({
  declarations: [],
  imports: [
    CommonModule,
    IonicModule,
    HttpClientModule,
    FeaturesRoutingModule,
    InvoiceHeadersComponent,
    VendorsComponent,
    VendorEditComponent
  ]
})
export class FeaturesModule { }
