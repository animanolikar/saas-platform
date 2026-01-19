import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { AuthService } from './auth';
import { Router, RouterModule } from '@angular/router';

@Component({
    selector: 'app-login',
    standalone: true,
    imports: [CommonModule, FormsModule, RouterModule],
    templateUrl: './login.component.html',
    styleUrl: './login.component.css'
})
export class LoginComponent {
    email = '';
    password = '';
    loading = false;
    error = '';
    showPassword = false;
    currentYear = new Date().getFullYear();

    constructor(private authService: AuthService, private router: Router) { }

    onSubmit() {
        this.loading = true;
        this.error = '';

        this.authService.login({ email: this.email, password: this.password }).subscribe({
            next: (response: any) => {
                const user = response.user;
                if (user?.requiresPasswordChange) {
                    this.router.navigate(['/change-password']);
                    return;
                }

                if (user?.role === 'STUDENT') {
                    this.router.navigate(['/student/dashboard']);
                } else {
                    this.router.navigate(['/admin']);
                }
            },
            error: (err) => {
                this.loading = false;
                this.error = 'Invalid email or password';
                console.error(err);
            }
        });
    }
}
