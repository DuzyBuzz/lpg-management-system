import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterOutlet, RouterLink, RouterLinkActive } from '@angular/router';

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [
    CommonModule,
    RouterOutlet,
    RouterLink,
    RouterLinkActive
  ],
  templateUrl: './dashboard.html',
  styleUrls: ['./dashboard.scss']
})
export class Dashboard {
  // If you were using snapshotPeriod elsewhere, keep this variable
  public snapshotPeriod = 'January 2026';

  // user dropdown state (used by the header user avatar menu)
  public isUserDropdownOpen = false;

  toggleUserDropdown() {
    this.isUserDropdownOpen = !this.isUserDropdownOpen;
  }

  // optionally expose a method to close—useful if you later add click-away logic
  closeUserDropdown() {
    this.isUserDropdownOpen = false;
  }
}
