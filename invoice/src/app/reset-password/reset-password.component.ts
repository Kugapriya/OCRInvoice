import { Component, OnInit } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { ToastController } from '@ionic/angular';
import { AuthService } from '../core/services/auth.service';

@Component({
  selector: 'app-reset-password',
  templateUrl: './reset-password.component.html',
  styleUrls: ['./reset-password.component.scss'],
  standalone: false
})
export class ResetPasswordComponent implements OnInit {
  token: string = '';
  newPassword: string = '';
  confirmPassword: string = '';
  loading: boolean = false;
  passwordReset: boolean = false;
  showPassword: boolean = false;
  showConfirmPassword: boolean = false;

  constructor(
    private authService: AuthService,
    private route: ActivatedRoute,
    private router: Router,
    private toastController: ToastController
  ) { }

  ngOnInit() {
    this.token = decodeURIComponent(this.route.snapshot.queryParams['token'] || '');
    if (!this.token) {
      this.showToast('Invalid reset link', 'danger');
      this.router.navigate(['/login']);
    }
  }

  async resetPassword() {
    if (!this.newPassword || !this.confirmPassword) {
      this.showToast('Please fill all fields', 'danger');
      return;
    }
    if (this.newPassword !== this.confirmPassword) {
      this.showToast('Passwords do not match', 'danger');
      return;
    }
    this.loading = true;

    try {
      const response: any = await this.authService.resetPassword({
        token: this.token,
        newPassword: this.newPassword,
        confirmPassword: this.confirmPassword
      }).toPromise();

      if (response?.success) {
        this.showToast('Password reset successfully', 'success');
        setTimeout(() => this.router.navigate(['/login']), 2000);
      } else {
        this.showToast(response?.message || 'Failed to reset password', 'danger');
      }
    } catch (err: any) {
      this.showToast(err?.error?.message || 'Failed to reset password', 'danger');
    } finally {
      this.loading = false;
    }
  }


  togglePasswordVisibility() {
    this.showPassword = !this.showPassword;
  }

  toggleConfirmPasswordVisibility() {
    this.showConfirmPassword = !this.showConfirmPassword;
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
