import { Injectable } from '@angular/core';
import { CanActivate, Router } from '@angular/router';
import { AuthService } from '../services/auth.service';


@Injectable()
export class AuthGuard implements CanActivate {

    constructor(private authService: AuthService, private router: Router) { }

    canActivate(): boolean {
        if (this.authService.loggedIn()) {
            return true;
        }
       // this.alertify.error('Please Login...');
        this.router.navigate(['/login']);
        return false;
    }
}
