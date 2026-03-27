import { HTTP_INTERCEPTORS, HttpEvent, HttpHandler, HttpInterceptor, HttpRequest } from "@angular/common/http";
import { Injectable } from "@angular/core";
import { catchError, Observable, throwError } from "rxjs";


@Injectable({
  providedIn: 'root',
})
export class ErrorInterceptor implements HttpInterceptor {
  constructor(
    //private authenticationService: AuthenticationService
  ) { }

  intercept(req: HttpRequest<unknown>, next: HttpHandler): Observable<HttpEvent<unknown>> {
    return next.handle(req).pipe(
      catchError(error => {
        if (error) {
          switch (error.status) {
            case 0:
              error.statusText = 'Your network is unavailable.';
              break;
            case 400:
              // if (error.error.errors) {
              //     error.error.errors.forEach((err: string) => {
              //         error.statusText += `${err} <br/>`;
              //     });
              // } else {
              //     error.statusText = error.error.message ?? error.error;
              // }
              error.statusText = error.error.title;
              break;
            case 401:
              error.statusText = error.error.title;
              //this.authenticationService.logoutBackendAsync();
              break;
            case 404:
              error.statusText = error.error.message;
              break;
            case 500:
              error.statusText = error.error.message;
              break;
            case 503:
              error.statusText = 'Service Unavailable';
              break;
            case 504:
              error.statusText = error.statusText;
              break;
            case 413:
              error.statusText = error.statusText;
              break;
            default:
              error.statusText = error.status + ' - Something unexpected went wrong';
              break;
          }

          // if (!TruthyCheck.isEmpty(errorMessage)) {
          //     return throwError(errorMessage);
          // }
        }
        return throwError(error.statusText);
      })
    );
  }
}


export const ErrorInterceptorProvider = {
  provide: HTTP_INTERCEPTORS,
  useClass: ErrorInterceptor,
  multi: true
};
