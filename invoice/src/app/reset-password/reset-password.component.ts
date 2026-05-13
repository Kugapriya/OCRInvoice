import { AfterViewInit, Component, OnInit, ViewChild } from '@angular/core';
import { Router } from '@angular/router';
import { IonInput, ToastController } from '@ionic/angular';
import { AuthService } from '../core/services/auth.service';

@Component({
  selector: 'app-reset-password',
  templateUrl: './reset-password.component.html',
  styleUrls: ['./reset-password.component.scss'],
  standalone: false
})
export class ResetPasswordComponent implements OnInit, AfterViewInit {
  @ViewChild('newPasswordInput') newPasswordInput!: IonInput;

  token: string = '';
  newPassword: string = '';
  confirmPassword: string = '';
  loading: boolean = false;
  passwordReset: boolean = false;
  showPassword: boolean = false;
  showConfirmPassword: boolean = false;
  errors: { newPassword: string; confirmPassword: string } = { newPassword: '', confirmPassword: '' };
  strengthPercent: number = 0;
  strengthClass: string = '';
  strengthLabel: string = '';

  constructor(
    private authService: AuthService,
    private router: Router,
    private toastController: ToastController
  ) { }

  ngOnInit() {
    this.token = history.state?.token || '';
    if (!this.token) {
      this.showToast('Invalid reset link', 'danger');
      this.router.navigate(['/login']);
    }
  }

  ngAfterViewInit() {
    setTimeout(() => this.newPasswordInput?.setFocus(), 350);
  }

  validatePasswords() {
    this.errors.newPassword = '';
    this.errors.confirmPassword = '';

    if (this.newPassword && this.newPassword.length < 6) {
      this.errors.newPassword = 'Password must be at least 6 characters';
    }
    if (this.confirmPassword && this.newPassword !== this.confirmPassword) {
      this.errors.confirmPassword = 'Passwords do not match';
    }

    this.updateStrength();
  }

  private updateStrength() {
    const p = this.newPassword;
    if (!p) { this.strengthPercent = 0; this.strengthClass = ''; this.strengthLabel = ''; return; }
    let score = 0;
    if (p.length >= 6) score++;
    if (p.length >= 10) score++;
    if (/[A-Z]/.test(p)) score++;
    if (/[0-9]/.test(p)) score++;
    if (/[^A-Za-z0-9]/.test(p)) score++;

    if (score <= 1) { this.strengthPercent = 25; this.strengthClass = 'weak'; this.strengthLabel = 'Weak'; }
    else if (score === 2) { this.strengthPercent = 50; this.strengthClass = 'fair'; this.strengthLabel = 'Fair'; }
    else if (score === 3) { this.strengthPercent = 75; this.strengthClass = 'good'; this.strengthLabel = 'Good'; }
    else { this.strengthPercent = 100; this.strengthClass = 'strong'; this.strengthLabel = 'Strong'; }
  }

  async resetPassword() {
    this.validatePasswords();

    if (!this.newPassword) {
      this.errors.newPassword = 'New password is required';
      return;
    }
    if (!this.confirmPassword) {
      this.errors.confirmPassword = 'Please confirm your password';
      return;
    }
    if (this.errors.newPassword || this.errors.confirmPassword) return;

    this.loading = true;

    try {
      const response: any = await this.authService.resetPassword({
        token: this.token,
        newPassword: this.newPassword,
        confirmPassword: this.confirmPassword
      }).toPromise();

      if (response?.success) {
        this.passwordReset = true;
        setTimeout(() => this.router.navigate(['/login']), 2500);
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
