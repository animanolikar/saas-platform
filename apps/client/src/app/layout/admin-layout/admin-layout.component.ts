import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { AuthService } from '../../core/auth/auth';

declare var bootstrap: any;

@Component({
    selector: 'app-admin-layout',
    standalone: true,
    imports: [CommonModule, RouterModule],
    templateUrl: './admin-layout.component.html',
    styleUrls: ['./admin-layout.component.css'],
})
export class AdminLayoutComponent {
    today = new Date();
    logoutModal: any;

    constructor(private authService: AuthService) { }

    logout() {
        const element = document.getElementById('adminLogoutModal');
        if (element) {
            this.logoutModal = new bootstrap.Modal(element);
            this.logoutModal.show();
        }
    }

    confirmLogout() {
        if (this.logoutModal) {
            this.logoutModal.hide();
        }
        this.authService.logout();
    }
}
