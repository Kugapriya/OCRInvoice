import { CUSTOM_ELEMENTS_SCHEMA, NgModule, Optional, SkipSelf } from '@angular/core';
import { CommonModule } from '@angular/common';
import { SharedModule } from '../shared/shared.module';
import { FormsModule } from '@angular/forms';
import { RouterModule } from '@angular/router';
import { HttpClientModule } from '@angular/common/http';
import { IonicModule } from '@ionic/angular';
import { TokenInterceptorProvider } from './interceptors/token-interceptor.service';
import { ErrorInterceptorProvider } from './interceptors/error.interceptor';

@NgModule({
  declarations: [],
  imports: [
    CommonModule,
    SharedModule,
    FormsModule,
    RouterModule,
    HttpClientModule,
    IonicModule.forRoot()
  ],
  providers: [
    //AuthUserResolver,
    //AuthGuard,
    TokenInterceptorProvider,
    ErrorInterceptorProvider,
    //AlertService,
    // AuthService,
    // RepositoryService
  ],
  exports: [
    IonicModule
  ],
  schemas: [CUSTOM_ELEMENTS_SCHEMA]
})
export class CoreModule {
  constructor(@Optional() @SkipSelf() parentModule: CoreModule) {
    if (parentModule) {
      throw new Error('CoreModule has already been loaded. You should only import Core modules in the AppModule only.');
    }
  }
}

