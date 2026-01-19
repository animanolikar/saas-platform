import { Component, OnInit, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { finalize } from 'rxjs/operators';
import { AuthService } from '../../../core/auth/auth';
import { UserService } from '../../../core/services/user.service';

@Component({
    selector: 'app-student-profile',
    standalone: true,
    imports: [CommonModule, FormsModule],
    templateUrl: './student-profile.component.html',
})
export class StudentProfileComponent implements OnInit {
    user: any = null;
    loading = false;
    successMessage = '';
    errorMessage = '';

    formData = {
        firstName: '',
        lastName: '',
        email: '',
        role: ''
    };

    constructor(
        private authService: AuthService,
        private userService: UserService,
        private cdr: ChangeDetectorRef
    ) { }

    ngOnInit() {
        this.authService.currentUser$.subscribe(u => {
            if (u) {
                // Only update form if it's the first load or if ID matches
                // prevents overwriting local edits if sub fires again
                if (!this.user || this.user.id !== u.id) {
                    this.user = u;
                    this.formData = {
                        firstName: u.firstName,
                        lastName: u.lastName,
                        email: u.email,
                        role: u.role
                    };
                }
            }
        });
    }

    updateProfile() {
        if (!this.user) return;

        this.loading = true;
        this.successMessage = '';
        this.errorMessage = '';
        this.cdr.detectChanges(); // Trigger UI for 'Saving...'

        this.userService.updateUser(this.user.id, {
            firstName: this.formData.firstName,
            lastName: this.formData.lastName,
            role: this.user.role // Role doesn't change, but keep it compliant
        })
            .pipe(finalize(() => {
                this.loading = false;
                this.cdr.detectChanges();
            }))
            .subscribe({
                next: (updatedUser: any) => {
                    this.successMessage = 'Profile updated successfully!';

                    // Update global auth state
                    this.authService.updateUser(updatedUser);

                    // Update local state
                    this.user = { ...this.user, ...updatedUser };
                    this.formData.firstName = updatedUser.firstName;
                    this.formData.lastName = updatedUser.lastName;

                    // Auto hide success message
                    setTimeout(() => {
                        this.successMessage = '';
                        this.cdr.detectChanges();
                    }, 3000);
                },
                error: (err: any) => {
                    this.errorMessage = 'Failed to update profile. ' + (err.error?.message || 'Please try again.');
                    console.error('Profile update error:', err);
                    this.cdr.detectChanges();
                }
            });
    }
}
