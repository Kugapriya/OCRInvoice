import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { IonicModule } from '@ionic/angular';
import { HttpClientModule } from '@angular/common/http';

import { FeaturesRoutingModule } from './features.routing.module';


@NgModule({
  declarations: [],
  imports: [
    CommonModule,
    IonicModule,
    HttpClientModule,
    FeaturesRoutingModule
  ]
})
export class FeaturesModule { }
