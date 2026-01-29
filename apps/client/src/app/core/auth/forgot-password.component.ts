import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router, RouterModule } from '@angular/router';
import { HttpClient } from '@angular/common/http';

@Component({
    selector: 'app-forgot-password',
    standalone: true,
    imports: [CommonModule, FormsModule, RouterModule],
    templateUrl: './forgot-password.component.html',
})
export class ForgotPasswordComponent {
    email = '';
    loading = false;
    message = '';
    error = '';

    constructor(private http: HttpClient) { }

    onSubmit() {
        if (!this.email) return;

        this.loading = true;
        this.message = '';
        this.error = '';

        // this.http.post<{ message: string }>('http://localhost:3000/api/auth/forgot-password', { email: this.email })
        this.http.post<{ message: string }>('http://brahmand.co/api/auth/forgot-password', { email: this.email })


            .subscribe({
                next: (res) => {
                    this.loading = false;
                    this.message = res.message;
                },
                error: (err) => {
                    this.loading = false;
                    // Ideally check err.status, but for security usually we shouldn't reveal much.
                    // API returns success even if not found usually, but here implemented otherwise?
                    // AuthService returns success mostly.
                    this.error = 'An error occurred. Please try again.';
                }
            });
    }
}
