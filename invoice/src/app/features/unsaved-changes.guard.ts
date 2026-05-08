import { inject } from '@angular/core';
import { CanDeactivateFn } from '@angular/router';
import { AlertController } from '@ionic/angular';
import { VendorService } from '../core/services/vendor.service';

export const unsavedChangesGuard: CanDeactivateFn<unknown> = async () => {
  const vendorService = inject(VendorService);
  const alertCtrl = inject(AlertController);

  if (!vendorService.hasUnsavedChanges()) return true;

  return new Promise<boolean>(async (resolve) => {
    const alert = await alertCtrl.create({
      header: 'Unsaved Changes',
      message: 'You have unsaved changes. Leave without saving?',
      buttons: [
        { text: 'Stay', role: 'cancel', handler: () => resolve(false) },
        { text: 'Leave', role: 'destructive', handler: () => resolve(true) }
      ]
    });
    await alert.present();
  });
};
