import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { environment } from 'src/environments/environment';

const baseUrl = environment.apiUrl + 'activity';

@Injectable({ providedIn: 'root' })
export class ActivityService {

  private heartbeatInterval: any = null;

  constructor(private http: HttpClient) {}

  log(activityType: string, detail?: string, customerId?: string) {
    this.http.post(`${baseUrl}/log`, { activityType, detail, customerId }).subscribe();
  }

  startHeartbeat() {
    if (this.heartbeatInterval) return;
    this.sendHeartbeat();
    this.heartbeatInterval = setInterval(() => this.sendHeartbeat(), 3 * 60 * 1000);
  }

  stopHeartbeat() {
    if (this.heartbeatInterval) {
      clearInterval(this.heartbeatInterval);
      this.heartbeatInterval = null;
    }
  }

  private sendHeartbeat() {
    this.http.post(`${baseUrl}/heartbeat`, {}).subscribe();
  }
}
