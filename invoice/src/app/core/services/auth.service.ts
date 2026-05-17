import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { JwtHelperService } from '@auth0/angular-jwt';
import { catchError, map, Observable, of } from 'rxjs';
import { environment } from 'src/environments/environment';

@Injectable({
  providedIn: 'root',
})
export class AuthService {
  baseUrl = environment.apiUrl + 'auth/';
  jwtHelper = new JwtHelperService();
  decodedToken: any;

  constructor(private http: HttpClient) {
    const token = localStorage.getItem('token');
    if (token) {
      this.decodedToken = this.jwtHelper.decodeToken(token);
    }
  }

  login(model: any): Observable<void> {
    return this.http.post(this.baseUrl + 'login', model).pipe(
      map((response: any) => {
        if (response) {
          localStorage.setItem('token', response.token);
          localStorage.setItem('customer', JSON.stringify(response));
          this.decodedToken = this.jwtHelper.decodeToken(response.token);
        }
      })
    );
  }

  loggedIn() {
    const token = localStorage.getItem('token');
    return !this.jwtHelper.isTokenExpired(token);
  }

  logout(): void {
    const token = localStorage.getItem('token');
    if (token) {
      this.http.post(this.baseUrl + 'logout', {})
        .pipe(catchError(() => of(null)))
        .subscribe();
    }
    localStorage.clear();
  }

  getLoggedInUsername() {
    return localStorage.getItem('username') || '';
  }

  sendOtp(email: string): Observable<any> {
    return this.http.post(`${this.baseUrl}forgot-password`, { email });
  }

  verifyOtp(email: string, otp: string): Observable<any> {
    return this.http.post(`${this.baseUrl}verify-otp`, { email, otp });
  }

  resetPassword(data: { token: string; newPassword: string; confirmPassword: string }): Observable<any> {
    return this.http.post(`${this.baseUrl}reset-password`, data);
  }
}
