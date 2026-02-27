import { Component, OnInit, ChangeDetectorRef } from '@angular/core';
import { CommonModule, DecimalPipe, DatePipe } from '@angular/common';
import { ActivatedRoute, RouterModule, Router } from '@angular/router';
import { ExamsService } from '../../../core/services/exams.service';
import { ReportsService } from '../../../core/services/reports.service';
import { MathRenderPipe } from '../../../core/pipes/math-render.pipe';
import { marked } from 'marked';

@Component({
    selector: 'app-student-exam-result',
    standalone: true,
    imports: [CommonModule, RouterModule, DecimalPipe, DatePipe, MathRenderPipe],
    templateUrl: './exam-result.component.html',
})
export class StudentExamResultComponent implements OnInit {
    attemptId: string | null = null;
    attempt: any = null;
    loading = false;
    error: string | null = null;

    aiDiagnosisLoading = false;
    aiDiagnosisReport: string | null = null;
    canRegenerate = true;

    constructor(
        private route: ActivatedRoute,
        private router: Router,
        private examsService: ExamsService,
        private reportsService: ReportsService,
        private cdr: ChangeDetectorRef
    ) { }

    ngOnInit() {
        this.route.paramMap.subscribe(params => {
            this.attemptId = params.get('attemptId');
            if (this.attemptId) {
                this.loadAttemptDetails();
            } else {
                this.error = 'Invalid attempt ID';
            }
        });
    }

    loadAttemptDetails() {
        this.loading = true;
        this.error = null;
        this.examsService.getAttemptDetails(this.attemptId!).subscribe({
            next: (data) => {
                this.attempt = data;
                this.loading = false;
                this.generateAiFeedback();
                this.generateDiagnosis(false); // Auto-load (cached) analysis
                this.cdr.detectChanges();
            },
            error: (err) => {
                console.error('Failed to load details', err);
                this.error = 'Failed to load result details. Please try again.';
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

    aiCoachFeedback: string = '';

    generateAiFeedback() {
        if (!this.attempt || !this.attempt.result) return;

        const percentage = this.attempt.result.percentage || 0;
        let feedback = '';

        if (percentage >= 90) {
            feedback = "Outstanding performance! You've demonstrated mastery of this topic. Keep up the excellent work!";
        } else if (percentage >= 75) {
            feedback = "Great job! You have a solid understanding. Review the few incorrect answers to achieve perfection next time.";
        } else if (percentage >= 60) {
            feedback = "Good effort. You're on the right track, but there are some gaps. Focus on the questions you missed to improve your score.";
        } else if (percentage >= 40) {
            feedback = "You've passed, but there's room for improvement. We recommend reviewing the study material for the topics covered in the incorrect questions.";
        } else {
            feedback = "Don't be discouraged. Review the detailed solutions below to understand where you went wrong, and try again when you're ready.";
        }

        this.aiCoachFeedback = feedback;
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

    async generateDiagnosis(force = false) {
        if (!this.attemptId) return;
        this.aiDiagnosisLoading = true;

        this.reportsService.getTestAnalysis(this.attemptId, force).subscribe({
            next: async (res: any) => {
                this.aiDiagnosisReport = await marked.parse(res.content);
                this.canRegenerate = res.canRegenerate !== undefined ? res.canRegenerate : true;
                this.aiDiagnosisLoading = false;
                this.cdr.detectChanges();
            },
            error: (err) => {
                console.error(err);
                if (force) {
                    alert(err.error?.message || 'Failed to generate AI Diagnosis. You may have reached the maximum allowed regenerations.');
                }
                this.aiDiagnosisLoading = false;
                this.cdr.detectChanges();
            }
        });
    }
}
