import { Component, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router, RouterModule } from '@angular/router';
import { HttpClient } from '@angular/common/http';
import { environment } from '../../../environments/environment';
import { finalize } from 'rxjs/operators';

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

    constructor(private http: HttpClient, private cdr: ChangeDetectorRef) { }

    onSubmit() {
        if (!this.email) return;

        this.loading = true;
        this.message = '';
        this.error = '';

        this.http.post<{ message: string }>(`${environment.apiUrl}/auth/forgot-password`, { email: this.email })
            .pipe(finalize(() => {
                this.loading = false;
                this.cdr.detectChanges();
            }))
            .subscribe({
                next: (res) => {
                    this.message = 'Password reset link sent successfully! Please check your email.';
                },
                error: (err) => {
                    // For security, even if error, we often don't want to show it if it reveals user existence, 
                    // but here we will show a generic error or the backend message if safe.
                    this.error = 'An error occurred. Please try again.';
                }
            });
    }
}
