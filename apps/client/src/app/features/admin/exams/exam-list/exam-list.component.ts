import { Component, OnInit, AfterViewInit, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router, RouterModule } from '@angular/router';
import { ExamsService } from '../../../../core/services/exams.service';
import { TeamsService } from '../../../../core/services/teams.service';
import { UserService } from '../../../../core/services/user.service';
import { PaginationService, PageState } from '../../../../core/services/pagination.service';

declare var bootstrap: any;

@Component({
    selector: 'app-exam-list',
    standalone: true,
    imports: [CommonModule, FormsModule, RouterModule],
    templateUrl: './exam-list.component.html',
})
export class ExamListComponent implements OnInit, AfterViewInit {
    allExams: any[] = [];
    exams: any[] = [];
    loading = false;
    isEditing = false;
    currentExamId: string | null = null;
    private modalInstance: any;

    // Pagination
    pager: PageState = {} as PageState;
    currentPage = 1;
    pageSize = 10;
    pages: number[] = [];

    newExam = {
        title: '',
        description: '',
        durationSeconds: 3600,
        passPercentage: 40,
        settings: {
            defaultPositiveMarks: 1,
            defaultNegativeMarks: 0,
            isProctoringEnabled: false,
            maxAttempts: 1,
            allowResume: false
        }
    };
    tempDurationMinutes = 60; // Helper for UI input

    // Assignment Modal
    assignModalInstance: any;
    selectedExamForAssign: any = null;
    availableTeams: any[] = [];
    availableUsers: any[] = [];
    selectedTeamIds: Set<string> = new Set();
    selectedUserIds: Set<string> = new Set();
    assigning = false;

    constructor(
        private examsService: ExamsService,
        private teamsService: TeamsService,
        private userService: UserService,
        private cdr: ChangeDetectorRef,
        private router: Router,
        private paginationService: PaginationService
    ) { }

    ngOnInit() {
        this.loadExams();
    }

    ngAfterViewInit() {
        // Initialize modal once
        const element = document.getElementById('createExamModal');
        if (element) {
            this.modalInstance = new bootstrap.Modal(element);
        }
    }

    loadExams() {
        this.loading = true;
        this.examsService.getExams().subscribe({
            next: (data) => {
                console.log('Exams loaded:', data);
                this.allExams = data;
                this.setPage(1);
                this.loading = false;
                this.cdr.detectChanges();
            },
            error: (err) => {
                console.error('Error loading exams:', err);
                this.loading = false;
                this.cdr.detectChanges();
            }
        });
    }

    setPage(page: number) {
        if (page < 1 || (this.pager.totalPages && page > this.pager.totalPages)) {
            return;
        }
        this.currentPage = page;
        this.pager = this.paginationService.paginate(this.allExams, page, this.pageSize);
        this.exams = this.pager.pagedItems;
        this.pages = this.paginationService.getPages(this.pager.totalPages);
    }

    openCreateModal() {
        this.isEditing = false;
        this.currentExamId = null;
        this.newExam = {
            title: '',
            description: '',
            durationSeconds: 3600,
            passPercentage: 40,
            settings: {
                defaultPositiveMarks: 1,
                defaultNegativeMarks: 0,
                isProctoringEnabled: false,
                maxAttempts: 1,
                allowResume: false
            }
        };
        this.tempDurationMinutes = 60;
        this.showModal();
    }

    editExam(exam: any) {
        this.isEditing = true;
        this.currentExamId = exam.id;
        this.newExam = {
            title: exam.title,
            description: exam.description,
            durationSeconds: exam.durationSeconds,
            passPercentage: exam.passPercentage,
            settings: {
                defaultPositiveMarks: exam.settings?.defaultPositiveMarks || 1,
                defaultNegativeMarks: exam.settings?.defaultNegativeMarks || 0,
                isProctoringEnabled: exam.settings?.isProctoringEnabled || false,
                maxAttempts: exam.settings?.maxAttempts || 0,
                allowResume: exam.settings?.allowResume || false
            }
        };
        this.tempDurationMinutes = Math.floor(exam.durationSeconds / 60);
        this.showModal();
    }

    goToBuilder(examId: string) {
        this.router.navigate(['/admin/exams', examId, 'builder']);
    }

    private showModal() {
        if (this.modalInstance) {
            this.modalInstance.show();
        } else {
            // Fallback if view init failed or element was missing
            const element = document.getElementById('createExamModal');
            if (element) {
                this.modalInstance = new bootstrap.Modal(element);
                this.modalInstance.show();
            }
        }
    }

    submitExam() {
        if (!this.newExam.title) {
            alert('Please enter an exam title.');
            return;
        }

        // Convert minutes to seconds
        this.newExam.durationSeconds = this.tempDurationMinutes * 60;

        const request = this.isEditing && this.currentExamId
            ? this.examsService.updateExam(this.currentExamId, this.newExam)
            : this.examsService.createExam(this.newExam);

        const isEdit = this.isEditing; // Capture state
        request.subscribe({
            next: (res) => {
                console.log('Exam saved:', res);
                alert(isEdit ? 'Exam updated successfully!' : 'Exam created successfully!');

                if (this.modalInstance) {
                    this.modalInstance.hide();
                } else {
                    const element = document.getElementById('createExamModal');
                    if (element) {
                        element.classList.remove('show');
                        element.style.display = 'none';
                        document.body.classList.remove('modal-open');
                        const backdrop = document.querySelector('.modal-backdrop');
                        if (backdrop) backdrop.remove();
                    }
                }

                // Update Local State Immediately
                if (isEdit) {
                    const index = this.allExams.findIndex(e => e.id === res.id);
                    if (index !== -1) {
                        this.allExams[index] = res;
                    }
                } else {
                    this.allExams.unshift(res); // Add to top
                }

                // Refresh current page view without verification fetch
                this.setPage(this.currentPage);
                this.cdr.detectChanges();
            },
            error: (err) => {
                console.error('Error saving exam:', err);
                alert('Failed to save exam. Please try again.');
            }
        });
    }

    // --- Assignment Logic ---

    openAssignModal(exam: any) {
        this.selectedExamForAssign = exam;
        this.selectedTeamIds.clear();
        this.selectedUserIds.clear();

        // Load Data
        this.loadAssignmentData();

        // Show Modal
        const element = document.getElementById('assignExamModal');
        if (element) {
            this.assignModalInstance = new bootstrap.Modal(element);
            this.assignModalInstance.show();
        }
    }

    loadAssignmentData() {
        this.teamsService.getTeams().subscribe(teams => {
            this.availableTeams = teams;
            this.cdr.detectChanges();
        });
        this.userService.getUsers().subscribe(users => {
            this.availableUsers = users;
            this.cdr.detectChanges();
        });
    }

    // --- User Selection Logic ---
    userSearchTerm = '';

    get filteredUsers() {
        if (!this.userSearchTerm) return this.availableUsers;
        const term = this.userSearchTerm.toLowerCase();
        return this.availableUsers.filter(u =>
        (u.firstName?.toLowerCase().includes(term) ||
            u.lastName?.toLowerCase().includes(term) ||
            u.email?.toLowerCase().includes(term))
        );
    }

    toggleTeamSelection(teamId: string) {
        if (this.selectedTeamIds.has(teamId)) this.selectedTeamIds.delete(teamId);
        else this.selectedTeamIds.add(teamId);
    }

    toggleUserSelection(userId: string) {
        if (this.selectedUserIds.has(userId)) this.selectedUserIds.delete(userId);
        else this.selectedUserIds.add(userId);
    }

    toggleSelectAllUsers(event: any) {
        const isChecked = event.target.checked;
        if (isChecked) {
            this.filteredUsers.forEach(u => this.selectedUserIds.add(u.id));
        } else {
            this.filteredUsers.forEach(u => this.selectedUserIds.delete(u.id));
        }
    }

    isAllVisibleUsersSelected(): boolean {
        const visible = this.filteredUsers;
        if (visible.length === 0) return false;
        return visible.every(u => this.selectedUserIds.has(u.id));
    }

    assignExam() {
        if (!this.selectedExamForAssign) return;
        if (this.selectedTeamIds.size === 0 && this.selectedUserIds.size === 0) {
            alert('Please select at least one team or user.');
            return;
        }

        this.assigning = true;
        const payload = {
            teamIds: Array.from(this.selectedTeamIds),
            userIds: Array.from(this.selectedUserIds)
        };

        this.examsService.assignExam(this.selectedExamForAssign.id, payload).subscribe({
            next: () => {
                alert('Exam assigned successfully!');
                this.assigning = false;
                if (this.assignModalInstance) this.assignModalInstance.hide();
            },
            error: (err) => {
                console.error('Assignment failed', err);
                alert('Failed to assign exam.');
                this.assigning = false;
            }
        });
    }
}
