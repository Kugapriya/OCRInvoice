import { Component, OnInit } from '@angular/core';
import { SwUpdate } from '@angular/service-worker';
import { ActivityService } from './core/services/activity.service';
import { AuthService } from './core/services/auth.service';

@Component({
  selector: 'app-root',
  templateUrl: 'app.component.html',
  styleUrls: ['app.component.scss'],
  standalone: false,
})
export class AppComponent implements OnInit {
  constructor(
    private swUpdate: SwUpdate,
    private activityService: ActivityService,
    private authService: AuthService
  ) {}

  ngOnInit() {
    if (this.authService.loggedIn()) {
      this.activityService.startHeartbeat();
    }

    if (this.swUpdate.isEnabled) {
      this.swUpdate.versionUpdates.subscribe(event => {
        if (event.type === 'VERSION_READY') {
          const confirmUpdate = confirm('New version available. Reload now?');
          if (confirmUpdate) window.location.reload();
        }
      });
    }
  }
}
