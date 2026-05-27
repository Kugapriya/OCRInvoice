import { CanDeactivateFn } from '@angular/router';

export interface CanDeactivateBarcode {
  canDeactivate(): Promise<boolean> | boolean;
}

export const unsavedBarcodeGuard: CanDeactivateFn<CanDeactivateBarcode> = (component) => {
  return component.canDeactivate();
};
