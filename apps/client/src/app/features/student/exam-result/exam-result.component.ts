import { Component, OnInit, ChangeDetectorRef } from '@angular/core';
import { CommonModule, DecimalPipe, DatePipe } from '@angular/common';
import { ActivatedRoute, RouterModule, Router } from '@angular/router';
import { ExamsService } from '../../../core/services/exams.service';

@Component({
    selector: 'app-student-exam-result',
    standalone: true,
    imports: [CommonModule, RouterModule, DecimalPipe, DatePipe],
    templateUrl: './exam-result.component.html',
})
export class StudentExamResultComponent implements OnInit {
    attemptId: string | null = null;
    attempt: any = null;
    loading = false;

    constructor(
        private route: ActivatedRoute,
        private router: Router,
        private examsService: ExamsService,
        private cdr: ChangeDetectorRef
    ) { }

    ngOnInit() {
        this.route.paramMap.subscribe(params => {
            this.attemptId = params.get('attemptId');
            if (this.attemptId) {
                this.loadAttemptDetails();
            }
        });
    }

    loadAttemptDetails() {
        this.loading = true;
        this.examsService.getAttemptDetails(this.attemptId!).subscribe({
            next: (data) => {
                this.attempt = data;
                this.loading = false;
                this.cdr.detectChanges();
            },
            error: (err) => {
                console.error('Failed to load details', err);
                this.loading = false;
                this.cdr.detectChanges();
            }
        });
    }

    getAnswerForQuestion(questionId: string) {
        return this.attempt?.answers.find((a: any) => a.questionId === questionId);
    }

    isOptionSelected(questionId: string, optionId: string) {
        const ans = this.getAnswerForQuestion(questionId);
        return ans?.selectedOptionId === optionId;
    }

    getDurationString(): string {
        if (!this.attempt || !this.attempt.startedAt || !this.attempt.submittedAt) {
            return '--';
        }
        const start = new Date(this.attempt.startedAt).getTime();
        const end = new Date(this.attempt.submittedAt).getTime();
        const diff = end - start;

        if (diff < 0) return '0s';

        const minutes = Math.floor(diff / 60000);
        const seconds = Math.floor((diff % 60000) / 1000);

        if (minutes > 0) return `${minutes}m ${seconds}s`;
        return `${seconds}s`;
    }
}
