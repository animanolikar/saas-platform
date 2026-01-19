import { Component, OnInit, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { PaginationService, PageState } from '../../../core/services/pagination.service';

declare var bootstrap: any;
import { UserService } from '../../../core/services/user.service';

import { StudentReportsComponent } from '../../student/reports/student-reports.component';

@Component({
  selector: 'app-user-list',
  standalone: true,
  imports: [CommonModule, FormsModule, StudentReportsComponent],
  templateUrl: './user-list.html',
  styleUrls: ['./user-list.css'],
})
export class UserListComponent implements OnInit {
  allUsers: any[] = [];
  users: any[] = [];
  loading = false;
  uploading = false;
  error = '';
  success = '';

  // Pagination
  pager: PageState = {} as PageState;
  currentPage = 1;
  pageSize = 10;
  pages: number[] = [];

  constructor(
    private userService: UserService,
    private cdr: ChangeDetectorRef,
    private paginationService: PaginationService
  ) { }

  ngOnInit(): void {
    console.log('UserListComponent initialized');
    this.loadUsers();
  }

  loadUsers() {
    console.log('Loading users...');
    this.loading = true;
    this.userService.getUsers().subscribe({
      next: (data) => {
        console.log('Users loaded:', data);
        this.allUsers = data;
        this.setPage(1);
        this.loading = false;
        this.cdr.detectChanges(); // Force view update
      },
      error: (err) => {
        console.error('Error loading users:', err);
        this.loading = false;
        this.error = 'Failed to load users';
        this.cdr.detectChanges(); // Force view update
      }
    });
  }

  onFileSelected(event: any) {
    const file: File = event.target.files[0];
    if (file) {
      this.uploading = true;
      this.error = '';
      this.success = '';

      this.userService.uploadUsers(file).subscribe({
        next: (res) => {
          this.uploading = false;
          this.success = `Uploaded successfully: ${res.message}`;
          this.success = `Uploaded successfully: ${res.message}`;
          this.loadUsers();
          this.cdr.detectChanges();
        },
        error: (err) => {
          console.error(err);
          this.uploading = false;
          this.error = err.error?.message || 'Upload failed';
        }
      });
    }
  }

  downloadSampleCsv() {
    const csvContent = 'firstName,lastName,email,role\nJohn,Doe,john@example.com,STUDENT\nJane,Smith,jane@example.com,STAFF';
    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'sample_users.csv';
    a.click();
    window.URL.revokeObjectURL(url);
  }

  selectedUser: any = null;
  selectedReportUserId: string | null = null;
  saving = false;

  viewReport(user: any) {
    this.selectedReportUserId = user.id;
    if (typeof bootstrap !== 'undefined') {
      const modalEl = document.getElementById('viewReportModal');
      if (modalEl) {
        const modal = bootstrap.Modal.getOrCreateInstance(modalEl);
        modal.show();
      }
    }
  }

  editUser(user: any) {
    console.log('Edit clicked for:', user);
    this.selectedUser = { ...user };

    // Check if bootstrap is defined
    if (typeof bootstrap !== 'undefined') {
      const modalEl = document.getElementById('editUserModal');
      if (modalEl) {
        console.log('Modal element found, opening...');
        const modal = bootstrap.Modal.getOrCreateInstance(modalEl);
        modal.show();
      } else {
        console.error('Modal element with ID "editUserModal" not found in DOM');
      }
    } else {
      console.error('Bootstrap global variable is NOT defined');
      alert('System Error: Bootstrap not loaded properly');
    }
  }

  saveUser() {
    if (!this.selectedUser) return;

    this.saving = true;
    this.userService.updateUser(this.selectedUser.id, this.selectedUser).subscribe({
      next: () => {
        this.saving = false;
        this.success = 'User updated successfully!';
        // Close modal
        const modalEl = document.getElementById('editUserModal');
        const modal = bootstrap.Modal.getInstance(modalEl);
        modal.hide();

        this.loadUsers();
        // this.cdr.detectChanges(); already called in loadUsers
      },
      error: (err) => {
        console.error(err);
        this.saving = false;
        this.error = 'Failed to update user';
        this.cdr.detectChanges();
      }
    });
  }

  // Add User Logic
  newUser: any = {
    firstName: '',
    lastName: '',
    email: '',
    role: 'STUDENT',
    academicYear: '',
    batch: ''
  };

  openAddUserModal() {
    this.newUser = { firstName: '', lastName: '', email: '', role: 'STUDENT', academicYear: '', batch: '' };
    if (typeof bootstrap !== 'undefined') {
      const modalEl = document.getElementById('addUserModal');
      if (modalEl) {
        const modal = bootstrap.Modal.getOrCreateInstance(modalEl);
        modal.show();
      }
    }
  }

  saveNewUser() {
    if (!this.newUser.email || !this.newUser.firstName || !this.newUser.lastName) {
      alert('Please fill in all required fields');
      return;
    }

    this.saving = true;
    this.userService.createUser(this.newUser).subscribe({
      next: (res) => {
        this.saving = false;
        this.success = `User created successfully! Temp Password: ${res.tempPassword}`; // Show temp password in success message

        const modalEl = document.getElementById('addUserModal');
        const modal = bootstrap.Modal.getInstance(modalEl);
        modal.hide();

        this.loadUsers();
      },
      error: (err) => {
        console.error(err);
        this.saving = false;
        this.error = err.error?.message || 'Failed to create user';
        this.cdr.detectChanges();
      }
    });
  }

  deleteUser(user: any) {
    if (confirm(`Are you sure you want to delete ${user.firstName}?`)) {
      alert('Delete functionality coming soon!');
    }
  }

  setPage(page: number) {
    if (page < 1 || (this.pager.totalPages && page > this.pager.totalPages)) {
      return;
    }
    this.currentPage = page;
    this.pager = this.paginationService.paginate(this.allUsers, page, this.pageSize);
    this.users = this.pager.pagedItems;
    this.pages = this.paginationService.getPages(this.pager.totalPages);
  }
}
