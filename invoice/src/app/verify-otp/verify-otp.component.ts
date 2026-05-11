import { Component, OnDestroy, OnInit, QueryList, ViewChildren, ElementRef } from '@angular/core';
import { Router } from '@angular/router';
import { ToastController } from '@ionic/angular';
import { firstValueFrom } from 'rxjs';
import { AuthService } from '../core/services/auth.service';

@Component({
  selector: 'app-verify-otp',
  templateUrl: './verify-otp.component.html',
  styleUrls: ['./verify-otp.component.scss'],
  standalone: false
})
export class VerifyOtpComponent implements OnInit, OnDestroy {
  @ViewChildren('otpInput') otpInputs!: QueryList<ElementRef>;

  email: string = '';
  otpBoxes = new Array(6);
  otpDigits: string[] = ['', '', '', '', '', ''];
  loading = false;
  resendCooldown = 0;
  private timer: any;

  constructor(
    private authService: AuthService,
    private router: Router,
    private toastController: ToastController
  ) {}

  ngOnInit() {
    this.email = localStorage.getItem('otp_email') || '';
    if (!this.email) this.router.navigate(['/forgot-password']);
    this.startCooldown(60);
  }

  ngOnDestroy() {
    clearInterval(this.timer);
  }

  onDigitInput(event: any, index: number) {
    const val = event.target.value.replace(/\D/g, '').slice(-1);
    this.otpDigits[index] = val;
    event.target.value = val;
    if (val && index < 5) {
      const inputs = this.otpInputs.toArray();
      inputs[index + 1]?.nativeElement.focus();
    }
  }

  onKeyDown(event: KeyboardEvent, index: number) {
    if (event.key === 'Backspace' && !this.otpDigits[index] && index > 0) {
      const inputs = this.otpInputs.toArray();
      inputs[index - 1]?.nativeElement.focus();
    }
  }

  onPaste(event: ClipboardEvent) {
    const text = event.clipboardData?.getData('text')?.replace(/\D/g, '').slice(0, 6) || '';
    if (text.length === 6) {
      this.otpDigits = text.split('');
      event.preventDefault();
    }
  }

  async verifyOtp() {
    const otp = this.otpDigits.join('');
    if (otp.length < 6) {
      this.showToast('Please enter the complete 6-digit code', 'danger');
      return;
    }

    this.loading = true;
    try {
      const res = await firstValueFrom(this.authService.verifyOtp(this.email, otp));
      if (res?.success) {
        localStorage.removeItem('otp_email');
        this.router.navigate(['/reset-password'], { queryParams: { token: res.token } });
      } else {
        this.showToast(res?.message || 'Invalid OTP', 'danger');
        this.otpDigits = ['', '', '', '', '', ''];
        setTimeout(() => this.otpInputs.toArray()[0]?.nativeElement.focus(), 50);
      }
    } catch (err: any) {
      this.showToast(err?.error?.message || 'Verification failed', 'danger');
    } finally {
      this.loading = false;
    }
  }

  async resendOtp() {
    if (this.resendCooldown > 0) return;
    this.loading = true;
    try {
      const res = await firstValueFrom(this.authService.sendOtp(this.email));
      if (res?.success) {
        this.showToast('New OTP sent to your email', 'success');
        this.otpDigits = ['', '', '', '', '', ''];
        this.startCooldown(60);
      } else {
        this.showToast(res?.message || 'Failed to resend OTP', 'danger');
      }
    } catch {
      this.showToast('Failed to resend OTP', 'danger');
    } finally {
      this.loading = false;
    }
  }

  goBack() {
    this.router.navigate(['/forgot-password']);
  }

  private startCooldown(seconds: number) {
    this.resendCooldown = seconds;
    this.timer = setInterval(() => {
      this.resendCooldown--;
      if (this.resendCooldown <= 0) clearInterval(this.timer);
    }, 1000);
  }

  private async showToast(message: string, color: string) {
    const toast = await this.toastController.create({
      message, duration: 3000, color, position: 'top'
    });
    await toast.present();
  }
}
