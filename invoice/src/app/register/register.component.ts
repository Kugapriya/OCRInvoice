import { Component } from '@angular/core';
import { Router, RouterModule } from '@angular/router';
import { ToastController } from '@ionic/angular';
import { AuthService } from '../core/services/auth.service';

@Component({
  selector: 'app-register',
  templateUrl: './register.component.html',
  styleUrls: ['./register.component.scss'],
  standalone: false
})
export class RegisterComponent {
  model: any = {};
  loading = false;
  showPassword = false;
  showConfirm = false;

  constructor(
    private authService: AuthService,
    private router: Router,
    private toastController: ToastController
  ) {}

  async register() {
    if (!this.model.name?.trim()) {
      this.showToast('Full name is required', 'danger'); return;
    }
    if (!this.model.email?.trim()) {
      this.showToast('Email is required', 'danger'); return;
    }
    if (!this.model.password || this.model.password.length < 6) {
      this.showToast('Password must be at least 6 characters', 'danger'); return;
    }
    if (this.model.password !== this.model.confirmPassword) {
      this.showToast('Passwords do not match', 'danger'); return;
    }

    this.loading = true;
    try {
      const res = await this.authService.register({
        name: this.model.name.trim(),
        email: this.model.email.trim(),
        password: this.model.password,
        confirmPassword: this.model.confirmPassword
      }).toPromise();

      if (res?.success) {
        this.showToast('Account created! Please sign in.', 'success');
        this.router.navigate(['/login']);
      } else {
        this.showToast(res?.message || 'Registration failed', 'danger');
      }
    } catch (err: any) {
      this.showToast(err?.error?.message || 'Registration failed', 'danger');
    } finally {
      this.loading = false;
    }
  }

  private async showToast(message: string, color: string) {
    const toast = await this.toastController.create({
      message, duration: 3000, color, position: 'top'
    });
    await toast.present();
  }
}
