import { Component } from '@angular/core';
import { Router } from '@angular/router';
import { ToastController } from '@ionic/angular';
import { AuthService } from '../core/services/auth.service';

@Component({
  selector: 'app-forgot-password',
  templateUrl: './forgot-password.component.html',
  styleUrls: ['./forgot-password.component.scss'],
  standalone: false
})
export class ForgotPasswordComponent {
  email: string = '';
  loading: boolean = false;
  fallbackOtp: string = '';

  constructor(
    private authService: AuthService,
    private router: Router,
    private toastController: ToastController
  ) {}

  async sendOtp() {
    if (!this.email || !this.email.trim()) {
      this.showToast('Please enter your email address', 'danger');
      return;
    }

    this.loading = true;
    this.fallbackOtp = '';
    try {
      const res = await this.authService.sendOtp(this.email.trim()).toPromise();
      if (res?.success) {
        localStorage.setItem('otp_email', this.email.trim());
        if (res.otp) {
          this.fallbackOtp = res.otp;
        } else {
          this.showToast(res.message || 'OTP sent to your email', 'success');
          this.router.navigate(['/verify-otp']);
        }
      } else {
        this.showToast(res?.message || 'Email not found', 'danger');
      }
    } catch (err: any) {
      this.showToast(err?.error?.message || 'Failed to send OTP', 'danger');
    } finally {
      this.loading = false;
    }
  }

  proceedWithOtp() {
    this.router.navigate(['/verify-otp']);
  }

  goBack() {
    this.router.navigate(['/login']);
  }

  private async showToast(message: string, color: string) {
    const toast = await this.toastController.create({
      message, duration: 3000, color, position: 'top'
    });
    await toast.present();
  }
}
