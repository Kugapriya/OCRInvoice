import { Injectable } from '@angular/core';
import { AlertController, ToastController } from '@ionic/angular';

@Injectable({
  providedIn: 'root',
})
export class AlertService {
  constructor(
    private alertCtrl: AlertController,
    private toastController: ToastController
  ) { }

  showErrorAlert(heading: string, msg: string, redirectUrl?: string) {
    this.alertCtrl
      .create({
        header: heading,
        message: msg,
        buttons: [
          {
            text: 'OK',
            handler: () => {
              if (redirectUrl) {
                // this.repository.navigate(redirectUrl);
              }
            }
          }
        ]
      })
      .then(alertEl => {
        alertEl.present();
      });

  }

  presentAlert(heading: string, msg: string, confirmAction: any) {
    this.alertCtrl.create({
      header: heading,
      message: msg,
      buttons: [
        {
          text: 'NO',
        },
        {
          text: 'YES',
          handler: confirmAction
        }
      ]
    }).then(alert => {
      alert.present();
    });
  }
  showExitAlert() {
    this.alertCtrl.create({
      header: 'Exit',
      message: 'Do you want to exit?',
      cssClass: 'alertDanger',
      buttons: [{
        text: 'cancel',
        role: 'cancel',
        cssClass: 'alert-danger'
      }, {
        text: 'exit',
        cssClass: 'alert-secondary',
        handler: () => {
          (navigator as any).app.exitApp();
        }
      }]
    }).then(alertEl => {
      alertEl.present();
    });
  }
  showErrorAlertForPasswordChange(heading: string, msg: string) {
    this.alertCtrl
      .create({
        header: heading,
        message: msg,
        buttons: [
          {
            text: 'OK',
            handler: () => {
              localStorage.removeItem('token');
              location.reload();
            }
          }
        ]
      })
      .then(alertEl => {
        alertEl.present();
      });

  }

  async showToast(message: string, duration: number, position: 'top' | 'bottom' | 'middle' = 'bottom'): Promise<void> {
    const toast = await this.toastController.create({
      message,
      duration,
      position,
      cssClass: 'custom-toast', // You can set the color to 'primary', 'secondary', etc.
    });
    toast.present();
  }

  async showErrorToast(message: string, duration = 3000, position: 'top' | 'bottom' | 'middle' = 'top') {
    return this.showCustomToast(message, 'toast-error', duration, position);
  }

  async showSuccessToast(message: string, duration = 3000, position: 'top' | 'bottom' | 'middle' = 'top') {
    return this.showCustomToast(message, 'toast-success', duration, position);
  }
  private async showCustomToast(message: string, cssClass: string, duration = 3000, position: 'top' | 'bottom' | 'middle' = 'bottom') {
    const toast = await this.toastController.create({
      message,
      duration,
      position,
      cssClass
    });
    toast.present();
  }
}

