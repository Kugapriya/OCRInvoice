import { CommonModule } from '@angular/common';
import { HttpClient } from '@angular/common/http';
import { Component, OnInit } from '@angular/core';
import { FormBuilder, FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { IonicModule, LoadingController } from '@ionic/angular';
import { RepositoryService } from '../core/services/repository.service';
import { AuthService } from '../core/services/auth.service';
import { AlertService } from '../core/services/alert.service';

@Component({
  standalone: true,
  imports: [CommonModule, FormsModule, IonicModule],
  selector: 'app-login',
  templateUrl: './login.component.html',
  styleUrls: ['./login.component.scss'],
})
export class LoginComponent implements OnInit {

  username = '';
  password = '';

  fullName: string = '';
  email: string = '';
  isLoading: boolean = false;
  model: any = {};
  //want to remove repository service
  constructor(private fb: FormBuilder, private router: Router, private http: HttpClient,
    private authService: AuthService, public repository: RepositoryService,
    private alertService: AlertService, private loadingController: LoadingController) {
  }
  ngOnInit() { }

  // login() {
  //   this.authService.login(this.model).subscribe({
  //     next: (res: any) => {
  //       localStorage.setItem('user', JSON.stringify(res));
  //       if (this.repository.loggedInUser) {
  //         this.repository.loggedInUser.username = this.model.username;
  //       }
  //       this.router.navigate(['/site']);
  //     },
  //     error: (err) => console.error('Login failed', err)
  //   });
  // }
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
          next: (res: any) => {
            // this.repository.loggedInUser!.username = this.model.username;
            this.alertService.showErrorAlert('Success', 'Logged in successfully');
            loadingEl.dismiss();
            this.router.navigate(['/site']);
          },
          error: (err) => {
            loadingEl.dismiss();
            let errorMessage = err?.error?.message || 'Login failed. Please check username/password.';
            this.alertService.showErrorAlert('Error!!', errorMessage);
          }
        });
      });
  }
}