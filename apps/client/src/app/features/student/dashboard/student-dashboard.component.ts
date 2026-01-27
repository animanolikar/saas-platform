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
                this.availableExams = data.filter((ex: any) =>
                    !ex.attempts?.length || ex.attempts[0].status === 'IN_PROGRESS'
                );
                this.attemptedExams = data.filter((ex: any) =>
                    ex.attempts?.length && ['SUBMITTED', 'EVALUATED'].includes(ex.attempts[0].status)
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
}
