import { Injectable } from '@angular/core';
import { LoadingController } from '@ionic/angular';

@Injectable({ providedIn: 'root' })
export class IonLoaderService {

  private loader: HTMLIonLoadingElement | null = null;

  constructor(private loadingCtrl: LoadingController) { }

  async show(message = 'Please wait...') {
    if (this.loader) return;

    this.loader = await this.loadingCtrl.create({
      message,
      spinner: 'crescent',
      backdropDismiss: false
    });

    await this.loader.present();
  }

  async hide() {
    if (this.loader) {
      await this.loader.dismiss();
      this.loader = null;
    }
  }
}