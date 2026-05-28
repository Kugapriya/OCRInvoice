import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { unsavedChangesGuard } from './unsaved-changes.guard';

const routes: Routes = [
  // { path: 'vendors', component: VendorsComponent, canDeactivate: [unsavedChangesGuard] }
];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule]
})
export class FeaturesRoutingModule { }
