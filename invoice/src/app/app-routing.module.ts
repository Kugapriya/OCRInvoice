import { NgModule } from '@angular/core';
import { PreloadAllModules, RouterModule, Routes } from '@angular/router';
import { DashboardComponent } from './dashboard/dashboard.component';
import { StoreListResolver } from './_resolvers/store-list.resolver';
import { StoresComponent } from './stores/stores.component';
import { AuthUserResolver } from './_resolvers/auth-user.resolver';
import { BaseComponent } from './base/base.component';
import { UploadedFilesComponent } from './features/uploaded-files/uploaded-files.component';
import { AuthGuard } from './core/_guards/auth.guard';
import { ForgotPasswordComponent } from './forgot-password/forgot-password.component';
import { ResetPasswordComponent } from './reset-password/reset-password.component';
import { InvoiceHeadersComponent } from './features/invoice-headers/invoice-headers.component';
import { VendorEditComponent } from './features/vendor-edit/vendor-edit.component';
import { VendorsComponent } from './features/vendors/vendors.component';

// const routes: Routes = [
//   { path: '', redirectTo: 'login', pathMatch: 'full' },

//   { path: 'login', loadChildren: () => import('./login/login.module').then(m => m.LoginModule) },

//   { path: 'site', component: StoresComponent, resolve: { stores: StoreListResolver, authUser: AuthUserResolver} },

//   // { path: 'site/dashboard', component: DashboardComponent },
//   // { path: 'site/home', loadChildren: () => import('./home/home.module').then(m => m.HomePageModule) },
//   // { path: 'site/customers', component: CustomerProfileComponent },

//   { path: '**', redirectTo: 'login' }
// ];
const routes: Routes = [
  { path: '', redirectTo: 'login', pathMatch: 'full' },

  { path: 'login', loadChildren: () => import('./login/login.module').then(m => m.LoginModule) },

  { path: 'forgot-password', component: ForgotPasswordComponent },

  { path: 'reset-password', component: ResetPasswordComponent },

  {
    path: 'site', canActivate: [AuthGuard], runGuardsAndResolvers: 'always',
    children: [
      {
        path: '',
        component: StoresComponent,
        pathMatch: 'full',
        resolve: { stores: StoreListResolver, authUser: AuthUserResolver }
      },

      { path: 'dashboard', component: DashboardComponent },

      {
        path: 'home', runGuardsAndResolvers: 'always',
        component: BaseComponent,
        children: [
          { path: '', loadChildren: () => import('./home/home.module').then(m => m.HomePageModule) },
          // { path: 'customers', component: CustomerProfileComponent },
          { path: 'uploadedfiles', component: UploadedFilesComponent },
          {path: 'invoiceheaders', component: InvoiceHeadersComponent},
          {path: 'vendors', component: VendorsComponent},
          {path: 'vendor-edit/:id', component: VendorEditComponent}
        ]
      }
    ]
  },

  { path: '**', redirectTo: 'login' }
];

@NgModule({
  imports: [
    RouterModule.forRoot(routes, { preloadingStrategy: PreloadAllModules })
  ],
  exports: [RouterModule]
})
export class AppRoutingModule { }
