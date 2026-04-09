import { Injectable } from '@angular/core';
import { CanActivate, Router } from '@angular/router';
import { AuthService } from '../services/auth.service';
import { AlertService } from '../services/alert.service';


@Injectable()
export class AuthGuard implements CanActivate {

    constructor(private authService: AuthService, private router: Router, private alertify: AlertService) { }

    canActivate(): boolean {
        if (this.authService.loggedIn()) {
            return true;
        }
        //    this.alertify.error('Please Login...');
        this.router.navigate(['/login']);
        return false;
    }
}
