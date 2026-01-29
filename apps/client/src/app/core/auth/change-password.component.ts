import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { AuthService } from './auth';

@Component({
    selector: 'app-change-password',
    standalone: true,
    imports: [CommonModule, FormsModule],
    templateUrl: './change-password.component.html',
})
export class ChangePasswordComponent {
    password = '';
    loading = false;
    error = '';

    constructor(
        private http: HttpClient,
        private router: Router,
        private authService: AuthService
    ) { }

    onSubmit() {
        if (!this.password) return;

        this.loading = true;
        this.error = '';

        // We need to send the token. AuthService interceptor should handle it if implemented?
        // Usually AuthService.token should be set after login.
        // If login was successful (but flagged), we have the token.

        // Manual call or via Service? Let's use direct HTTP for now as AuthService doesn't have changePassword wrapper yet, 
        // or add it to AuthService. Let's add it to AuthService properly later, but for now direct is faster.
        // Wait, AuthService needs to provide headers.

        // Let's rely on Interceptor if it exists. Based on previous file reads, there is an interceptor.

        this.http.post<{ message: string }>('http://brahmand.co/api/auth/change-password', {
            newCode: this.password
        })
            .subscribe({
                next: (res) => {
                    this.loading = false;
                    // Updated successfully. Redirect to dashboard.
                    this.authService.currentUser$.subscribe(user => {
                        const role = user?.role;
                        if (role === 'STUDENT') {
                            this.router.navigate(['/student/dashboard']);
                        } else {
                            this.router.navigate(['/admin']);
                        }
                    });
                },
                error: (err) => {
                    this.loading = false;
                    this.error = err.error?.message || 'Failed to update password.';
                    if (err.status === 401) {
                        // Token expired or invalid
                        this.router.navigate(['/login']);
                    }
                }
            });
    }
}
