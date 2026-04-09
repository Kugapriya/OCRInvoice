import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { JwtHelperService } from '@auth0/angular-jwt';
import { map, Observable } from 'rxjs';
import { environment } from 'src/environments/environment';

@Injectable({
  providedIn: 'root',
})
export class AuthService {
  baseUrl = environment.apiUrl + 'auth/';
  jwtHelper = new JwtHelperService();
  decodedToken: any;
  constructor(private http: HttpClient) { }

  login(model: any): Observable<void> {
    return this.http.post(this.baseUrl + 'login', model)
      .pipe(
        map((response: any) => {
          const user = response;
          if (user) {
            localStorage.setItem('token', user.token);
             localStorage.setItem('customer', JSON.stringify(response));
            this.decodedToken = this.jwtHelper.decodeToken(user.token);
          }
        })
      );
  }
  register(model: any) {
    return this.http.post(this.baseUrl + 'register', model);
  }

  loggedIn() {
    const token = localStorage.getItem('token');
    return !this.jwtHelper.isTokenExpired(token);
  }

  getLoggedInUsername() {
    return localStorage.getItem('username') || '';
  }
  forgotPassword(email: string): Observable<any> {
    const url = `${this.baseUrl}forgot-password/${email}`;
    return this.http.post(url, { email }); // send email in body too if needed
  }

  resetPassword(data: { token: string, newPassword: string, confirmPassword: string }) {
    return this.http.post(`${this.baseUrl}reset-password`, data);
  }
}
