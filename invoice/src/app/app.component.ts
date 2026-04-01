import { Component, OnInit } from '@angular/core';
import { SwUpdate } from '@angular/service-worker';

@Component({
  selector: 'app-root',
  templateUrl: 'app.component.html',
  styleUrls: ['app.component.scss'],
  standalone: false,
})
export class AppComponent implements OnInit {
  constructor(private swUpdate: SwUpdate) { }
  ngOnInit() {
    if (this.swUpdate.isEnabled) {
      this.swUpdate.versionUpdates.subscribe(event => {
        console.log('Update event:', event);

        if (event.type === 'VERSION_READY') {
          const confirmUpdate = confirm('New version available. Reload now?');

          if (confirmUpdate) {
            window.location.reload();
          }
        }
      });
    }
  }
}
