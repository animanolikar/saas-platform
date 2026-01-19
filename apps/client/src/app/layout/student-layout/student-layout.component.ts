import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule, Router } from '@angular/router';
import { AuthService } from '../../core/auth/auth';

declare var bootstrap: any;

@Component({
    selector: 'app-student-layout',
    standalone: true,
    imports: [CommonModule, RouterModule],
    templateUrl: './student-layout.component.html',
})
export class StudentLayoutComponent {
    logoutModal: any;
    user: any = null;
    isDarkMode = false;

    constructor(private authService: AuthService, private router: Router) {
        this.authService.currentUser$.subscribe(u => this.user = u);

        // Initialize Theme
        const storedTheme = localStorage.getItem('theme');
        if (storedTheme === 'dark') {
            this.setTheme('dark');
        } else {
            this.setTheme('light');
        }
    }

    toggleTheme() {
        const newTheme = this.isDarkMode ? 'light' : 'dark';
        this.setTheme(newTheme);
    }

    private setTheme(theme: string) {
        this.isDarkMode = theme === 'dark';
        document.documentElement.setAttribute('data-bs-theme', theme);
        localStorage.setItem('theme', theme);
    }

    openLogoutModal() {
        const element = document.getElementById('logoutModal');
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
