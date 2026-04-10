import { Injectable } from '@angular/core';
import {
  HttpInterceptor,
  HttpRequest,
  HttpHandler,
  HttpEvent
} from '@angular/common/http';
import { Observable } from 'rxjs';
import { finalize } from 'rxjs/operators';
import { IonLoaderService } from '../services/ionloader..service';

@Injectable()
export class LoaderInterceptor implements HttpInterceptor {

  private requestCount = 0;

  constructor(private loader: IonLoaderService) { }

  intercept(req: HttpRequest<any>, next: HttpHandler): Observable<HttpEvent<any>> {

    this.requestCount++;

    if (this.requestCount === 1) {
      this.loader.show('Loading...');
    }

    return next.handle(req).pipe(
      finalize(() => {
        this.requestCount--;

        if (this.requestCount === 0) {
          this.loader.hide();
        }
      })
    );
  }
}