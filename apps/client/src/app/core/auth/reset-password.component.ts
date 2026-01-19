import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router, RouterModule } from '@angular/router';
import { HttpClient } from '@angular/common/http';

@Component({
    selector: 'app-reset-password',
    standalone: true,
    imports: [CommonModule, FormsModule, RouterModule],
    templateUrl: './reset-password.component.html',
})
export class ResetPasswordComponent implements OnInit {
    password = '';
    token = '';
    loading = false;
    success = '';
    error = '';

    constructor(
        private route: ActivatedRoute,
        private http: HttpClient
    ) { }

    ngOnInit() {
        this.token = this.route.snapshot.queryParams['token'];
        if (!this.token) {
            this.error = 'Invalid reset link. Token missing.';
        }
    }

    onSubmit() {
        if (!this.password || !this.token) return;

        this.loading = true;
        this.success = '';
        this.error = '';

        this.http.post<{ message: string }>('http://localhost:3000/api/auth/reset-password', {
            token: this.token,
            newCode: this.password
        })
            .subscribe({
                next: (res) => {
                    this.loading = false;
                    this.success = 'Password has been reset successfully!';
                },
                error: (err) => {
                    this.loading = false;
                    this.error = err.error?.message || 'Failed to reset password. Link may be expired.';
                }
            });
    }
}
