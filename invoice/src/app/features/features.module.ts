import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { IonicModule } from '@ionic/angular';

import { FeaturesRoutingModule } from './features.routing.module';
import { InvoiceHeadersComponent } from './invoice-headers/invoice-headers.component';


@NgModule({
  declarations: [],
  imports: [
    CommonModule,
    IonicModule,
    FeaturesRoutingModule,
    InvoiceHeadersComponent  ]
})
export class FeaturesModule { }
