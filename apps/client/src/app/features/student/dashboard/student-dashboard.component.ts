import { Component, OnInit, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ExamsService } from '../../../core/services/exams.service';
import { RouterModule } from '@angular/router';

@Component({
    selector: 'app-student-dashboard',
    standalone: true,
    imports: [CommonModule, RouterModule],
    templateUrl: './student-dashboard.component.html',
})
export class StudentDashboardComponent implements OnInit {
    availableExams: any[] = [];
    attemptedExams: any[] = [];
    loading = false;

    constructor(
        private examsService: ExamsService,
        private cdr: ChangeDetectorRef
    ) { }

    now = new Date();
    private timerSub: any;

    ngOnInit() {
        this.loading = true;

        // Load Available Exams
        this.examsService.getAvailableExams().subscribe({
            next: (data) => {
                this.availableExams = data.filter((ex: any) => {
                    const attempts = ex.attempts || [];
                    const submittedCount = attempts.filter((a: any) => ['SUBMITTED', 'EVALUATED'].includes(a.status)).length;
                    const inProgress = attempts.some((a: any) => a.status === 'IN_PROGRESS');
                    const max = ex.settings?.maxAttempts ? parseInt(ex.settings.maxAttempts, 10) : 0;

                    if (inProgress) return true; // Can resume
                    if (max === 0) return true; // Unlimited attempts
                    if (submittedCount < max) return true; // Can start new attempt
                    return false;
                });

                this.attemptedExams = data.filter((ex: any) =>
                    ex.attempts?.some((a: any) => ['SUBMITTED', 'EVALUATED'].includes(a.status))
                );

                this.loading = false;
                this.startTimer();
                this.cdr.detectChanges();
            },
            error: (err) => {
                console.error('Error loading exams', err);
                this.loading = false;
            }
        });
    }

    ngOnDestroy() {
        if (this.timerSub) clearInterval(this.timerSub);
    }

    startTimer() {
        this.timerSub = setInterval(() => {
            this.now = new Date();
            this.cdr.detectChanges();
        }, 1000);
    }

    isExamLocked(exam: any): boolean {
        if (!exam.scheduledAt) return false;
        return new Date(exam.scheduledAt) > this.now;
    }

    getCountdown(exam: any): string | null {
        if (!exam.scheduledAt) return null;
        const start = new Date(exam.scheduledAt).getTime();
        const diff = start - this.now.getTime();

        if (diff <= 0) return null;

        const hours = Math.floor(diff / (1000 * 60 * 60));
        const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
        const seconds = Math.floor((diff % (1000 * 60)) / 1000);

        if (hours > 24) {
            return new Date(exam.scheduledAt).toLocaleString(); // Just show date if far away
        }

        return `Starts in ${hours}h ${minutes}m ${seconds}s`;
    }

    hasInProgressAttempt(exam: any): boolean {
        return exam.attempts?.some((a: any) => a.status === 'IN_PROGRESS');
    }

    getLatestAttemptId(exam: any): string | null {
        if (!exam.attempts || exam.attempts.length === 0) return null;
        return exam.attempts[0].id;
    }
}
