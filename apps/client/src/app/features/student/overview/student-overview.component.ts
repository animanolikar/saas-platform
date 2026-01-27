import { Component, OnInit, ChangeDetectorRef, NgZone } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ExamsService } from '../../../core/services/exams.service';
import { RouterModule } from '@angular/router';

@Component({
    selector: 'app-student-overview',
    standalone: true,
    imports: [CommonModule, RouterModule],
    templateUrl: './student-overview.component.html',
})
export class StudentOverviewComponent implements OnInit {
    loading = false;
    stats = {
        total: 0,
        completed: 0,
        pending: 0,
        averageScore: 0
    };
    recentExams: any[] = [];
    user: any = null;

    constructor(
        private examsService: ExamsService,
        private cdr: ChangeDetectorRef,
        private ngZone: NgZone
    ) { }

    ngOnInit() {
        this.loading = true;
        // In a real app, user details might come from a UserService or Auth store
        const userStr = localStorage.getItem('user');
        if (userStr) {
            this.user = JSON.parse(userStr);
        }

        this.examsService.getAvailableExams().subscribe({
            next: (exams) => {
                this.ngZone.run(() => {
                    this.calculateStats(exams);
                    this.loading = false;
                    this.cdr.detectChanges();
                });
            },
            error: (err) => {
                this.ngZone.run(() => {
                    console.error('Error loading exams for overview', err);
                    this.loading = false;
                    this.cdr.detectChanges();
                });
            }
        });
    }

    calculateStats(exams: any[]) {
        let total = 0;
        let completed = 0;
        let pending = 0;
        let totalScore = 0;
        let evaluatedCount = 0;

        // Sort by interaction (most recent first) - primitive check
        // Ideally backend provides this or we check 'createdAt' of attempt
        const processedExams = exams.map(e => {
            const attempt = e.attempts?.[0];
            return {
                ...e,
                status: attempt ? attempt.status : 'Pending',
                lastActivity: attempt ? (attempt.submittedAt ? new Date(attempt.submittedAt) : new Date(attempt.startedAt)) : new Date(e.createdAt) // approximate
            };
        });

        processedExams.sort((a, b) => b.lastActivity.getTime() - a.lastActivity.getTime());
        this.recentExams = processedExams.slice(0, 3); // Top 3

        processedExams.forEach(e => {
            total++;
            const attempt = e.attempts?.[0];

            if (attempt) {
                // console.log('Exam:', e.title, 'Status:', attempt.status, 'Score:', attempt.score);
                if (['SUBMITTED', 'EVALUATED'].includes(attempt.status)) {
                    completed++;
                    // Backend returns 'result' object with 'percentage'
                    // OR 'totalScore'. Since UI shows %, we prefer result.percentage.
                    const res = attempt.result as any;

                    if (res && res.percentage !== undefined && res.percentage !== null) {
                        const p = Number(res.percentage);
                        if (!isNaN(p)) {
                            totalScore += p;
                            evaluatedCount++;
                        }
                    } else if (attempt.totalScore !== undefined) {
                        // Fallback to totalScore if percentage missing (though likely raw score)
                        const s = Number(attempt.totalScore);
                        if (!isNaN(s)) {
                            // This might be raw score, but strictly better than 0.
                            // Ideally we want percentage.
                            totalScore += s;
                            evaluatedCount++;
                        }
                    } // else if attempt.score (legacy?)
                } else {
                    pending++; // IN_PROGRESS
                }
            } else {
                pending++; // No attempt yet
            }
        });

        console.log('Total Score:', totalScore, 'Evaluated Count:', evaluatedCount);
        this.stats = {
            total,
            completed,
            pending,
            averageScore: evaluatedCount > 0 ? Math.round(totalScore / evaluatedCount) : 0
        };
    }
}
