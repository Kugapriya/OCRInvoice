import { CommonModule } from '@angular/common';
import { AfterViewInit, Component, OnInit, ViewChild } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router, RouterModule } from '@angular/router';
import { IonInput, IonicModule, LoadingController } from '@ionic/angular';
import { AuthService } from '../core/services/auth.service';
import { AlertService } from '../core/services/alert.service';
import { ActivityService } from '../core/services/activity.service';

@Component({
  standalone: true,
  imports: [CommonModule, FormsModule, IonicModule, RouterModule],
  selector: 'app-login',
  templateUrl: './login.component.html',
  styleUrls: ['./login.component.scss'],
})
export class LoginComponent implements OnInit, AfterViewInit {
  @ViewChild('emailInput') emailInput!: IonInput;

  model: any = {};
  showPassword = false;

  constructor(
    private router: Router,
    private authService: AuthService,
    private alertService: AlertService,
    private loadingController: LoadingController,
    private activityService: ActivityService
  ) { }

  ngOnInit() { }

  ngAfterViewInit() {
    setTimeout(() => this.emailInput?.setFocus(), 350);
  }

  togglePassword() {
    this.showPassword = !this.showPassword;
  }

  login() {
    if (!this.model.username || this.model.username.trim() === '') {
      this.alertService.showErrorAlert('Error!!', 'Username is required');
      return;
    }
    if (!this.model.password || this.model.password.trim() === '') {
      this.alertService.showErrorAlert('Error!!', 'Password is required');
      return;
    }

    this.loadingController
      .create({ keyboardClose: true, message: 'Loading...' })
      .then(loadingEl => {
        loadingEl.present();

        this.authService.login(this.model).subscribe({
          next: () => {
            this.alertService.showErrorAlert('Success', 'Logged in successfully');
            loadingEl.dismiss();
            this.activityService.startHeartbeat();
            this.router.navigate(['/site']);
          },
          error: (err) => {
            loadingEl.dismiss();
            const errorMessage = err?.error?.message || 'Login failed. Please check username/password.';
            this.alertService.showErrorAlert('Error!!', errorMessage);
          }
        });
      });
  }
}
