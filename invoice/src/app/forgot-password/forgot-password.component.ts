import { Component } from '@angular/core';
import { Router } from '@angular/router';
import { ToastController } from '@ionic/angular';
import { AuthService } from '../core/services/auth.service';

@Component({
  selector: 'app-forgot-password',
  templateUrl: './forgot-password.component.html',
  styleUrls: ['./forgot-password.component.scss'],
  standalone:false
})
export class ForgotPasswordComponent {
  email: string = '';
  loading: boolean = false;

  constructor(
    private authService: AuthService,
    private router: Router,
    private toastController: ToastController
  ) {}

  async forgotPassword() {
    if (!this.email) {
      this.showToast('Please enter your email', 'danger');
      return;
    }

    this.loading = true;

    try {
      const response = await this.authService.forgotPassword(this.email).toPromise();
      
      if (response?.success) {
        this.showToast(response.message || 'Reset link sent to your email', 'success');
        this.email = '';
      } else {
        this.showToast(response?.message || 'Email not found', 'danger');
      }
    } catch (error: any) {
      this.showToast(error?.error?.message || 'Failed to send reset request', 'danger');
    } finally {
      this.loading = false;
    }
  }

  goBack() {
    this.router.navigate(['/login']);
  }

  private async showToast(message: string, color: string) {
    const toast = await this.toastController.create({
      message,
      duration: 3000,
      color,
      position: 'top'
    });
    await toast.present();
  }
}
