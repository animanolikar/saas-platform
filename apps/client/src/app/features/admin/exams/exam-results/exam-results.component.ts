import { Component, OnInit, ChangeDetectorRef } from '@angular/core';
import { CommonModule, DecimalPipe, DatePipe } from '@angular/common';
import { ActivatedRoute, Router, RouterModule } from '@angular/router';
import { ExamsService } from '../../../../core/services/exams.service';

@Component({
    selector: 'app-exam-results',
    standalone: true,
    imports: [CommonModule, RouterModule, DecimalPipe, DatePipe],
    templateUrl: './exam-results.component.html',
})
export class ExamResultsComponent implements OnInit {
    examId: string | null = null;
    attempts: any[] = [];
    loading = false;
    examTitle = ''; // Ideally fetch exam details too, but for MVP we focus on attempts

    constructor(
        private route: ActivatedRoute,
        private router: Router,
        private examsService: ExamsService,
        private cdr: ChangeDetectorRef
    ) { }

    stats: any = null;

    ngOnInit() {
        this.route.paramMap.subscribe(params => {
            this.examId = params.get('id');
            console.log('ExamResults: Route Param ID:', this.examId);
            if (this.examId) {
                this.loadAttempts();
                this.loadStats();
            }
        });
    }

    loadAttempts() {
        console.log('ExamResults: Loading attempts for:', this.examId);
        this.loading = true;
        this.examsService.getExamAttempts(this.examId!).subscribe({
            next: (data) => {
                console.log('ExamResults: Data received:', data);
                this.attempts = data;
                this.loading = false;
                this.cdr.detectChanges(); // Force update
            },
            error: (err) => {
                console.error('ExamResults: Failed to load attempts', err);
                this.loading = false;
                this.cdr.detectChanges(); // Force update
            }
        });
    }

    loadStats() {
        this.examsService.getExamStats(this.examId!).subscribe({
            next: (data) => {
                this.stats = data;
                this.cdr.detectChanges();
            },
            error: (err) => console.error('Failed to load stats', err)
        });
    }

    viewDetails(attemptId: string) {
        this.router.navigate(['/admin/exams/results', attemptId]);
    }

    exportToCsv() {
        if (!this.attempts || this.attempts.length === 0) return;

        const headers = ['Student Name', 'Email', 'Score', 'Max Marks', 'Percentage', 'Status', 'Submitted At'];
        const rows = this.attempts.map(a => [
            `"${a.user.firstName} ${a.user.lastName}"`,
            `"${a.user.email}"`,
            a.totalScore,
            a.result?.maxMarks || 0,
            (a.result?.percentage || 0).toFixed(2) + '%',
            a.result?.passed ? 'PASSED' : 'FAILED',
            `"${new Date(a.submittedAt).toLocaleString()}"`
        ]);

        const csvContent = [
            headers.join(','),
            ...rows.map(r => r.join(','))
        ].join('\n');

        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.setAttribute('href', url);
        link.setAttribute('download', `exam_results_${this.examId}.csv`);
        link.style.visibility = 'hidden';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    }
}
