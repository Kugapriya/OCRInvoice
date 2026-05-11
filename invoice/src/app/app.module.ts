import { NgModule, CUSTOM_ELEMENTS_SCHEMA } from '@angular/core';
import { BrowserModule } from '@angular/platform-browser';
import { RouteReuseStrategy } from '@angular/router';

import { IonicModule, IonicRouteStrategy } from '@ionic/angular';

import { AppComponent } from './app.component';
import { AppRoutingModule } from './app-routing.module';
import { CoreModule } from './core/core.module';
import { SharedModule } from './shared/shared.module';
import { HTTP_INTERCEPTORS, HttpClientModule } from '@angular/common/http';
import { environment } from 'src/environments/environment';
import { ServiceWorkerModule } from '@angular/service-worker';
import { JwtHelperService, JwtModule } from '@auth0/angular-jwt';
import { AuthGuard } from './core/_guards/auth.guard';
import { AuthUserResolver } from './_resolvers/auth-user.resolver';
import { AuthService } from './core/services/auth.service';
import { RepositoryService } from './core/services/repository.service';
import { ForgotPasswordComponent } from './forgot-password/forgot-password.component';
import { ResetPasswordComponent } from './reset-password/reset-password.component';
import { VerifyOtpComponent } from './verify-otp/verify-otp.component';
import { FormsModule } from '@angular/forms';
import { LoaderInterceptor } from './core/interceptors/loader-interceptor.service';
import { FeaturesModule } from './features/features.module';


export function tokenGetter() {
  return localStorage.getItem('token');
}

@NgModule({
  declarations: [AppComponent,
    ForgotPasswordComponent,
    ResetPasswordComponent,
    VerifyOtpComponent
    // StoresComponent
  ],
  imports: [BrowserModule, IonicModule.forRoot(), AppRoutingModule,
    HttpClientModule,
    CoreModule,
    SharedModule,
    FormsModule,
    FeaturesModule,
    JwtModule.forRoot({
      config: {
        tokenGetter,
        allowedDomains: [environment.apiDomain],
        disallowedRoutes: [environment.apiUrl + 'auth']
      }
    }),
    ServiceWorkerModule.register('ngsw-worker.js', { enabled: environment.production }),
    // ServiceWorkerModule.register('ngsw-worker.js', {
    //   enabled: !isDevMode(),
    //   // Register the ServiceWorker as soon as the application is stable
    //   // or after 30 seconds (whichever comes first).
    //   registrationStrategy: 'registerWhenStable:30000'
    // })
  ],
  providers: [{ provide: RouteReuseStrategy, useClass: IonicRouteStrategy },
    AuthService,
    RepositoryService,
    AuthUserResolver,
    AuthGuard,
  {
    provide: HTTP_INTERCEPTORS,
    useClass: LoaderInterceptor,
    multi: true
  }
  ],
  schemas: [CUSTOM_ELEMENTS_SCHEMA],
  bootstrap: [AppComponent],
})
export class AppModule { }
