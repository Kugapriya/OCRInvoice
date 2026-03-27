import { NgModule } from '@angular/core';
import { PreloadAllModules, RouterModule, Routes } from '@angular/router';
import { DashboardComponent } from './dashboard/dashboard.component';
import { StoreListResolver } from './_resolvers/store-list.resolver';
import { StoresComponent } from './stores/stores.component';
import { AuthUserResolver } from './_resolvers/auth-user.resolver';

const routes: Routes = [
  { path: '', redirectTo: 'login', pathMatch: 'full' },

  { path: 'login', loadChildren: () => import('./login/login.module').then(m => m.LoginModule) },

  { path: 'site', component: StoresComponent, resolve: { stores: StoreListResolver, authUser: AuthUserResolver} },

  { path: 'site/dashboard', component: DashboardComponent },
  { path: 'site/home', loadChildren: () => import('./home/home.module').then(m => m.HomePageModule) },

  { path: '**', redirectTo: 'login' }
];

@NgModule({
  imports: [
    RouterModule.forRoot(routes, { preloadingStrategy: PreloadAllModules })
  ],
  exports: [RouterModule]
})
export class AppRoutingModule { }
