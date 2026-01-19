import { Component, OnInit, ChangeDetectorRef } from '@angular/core';
import { CommonModule, DecimalPipe, DatePipe } from '@angular/common';
import { ActivatedRoute, RouterModule } from '@angular/router';
import { ExamsService } from '../../../../../core/services/exams.service';

@Component({
    selector: 'app-result-detail',
    standalone: true,
    imports: [CommonModule, RouterModule, DecimalPipe, DatePipe],
    templateUrl: './result-detail.component.html',
})
export class ResultDetailComponent implements OnInit {
    attemptId: string | null = null;
    attempt: any = null;
    loading = false;

    constructor(
        private route: ActivatedRoute,
        private examsService: ExamsService,
        private cdr: ChangeDetectorRef
    ) { }

    ngOnInit() {
        this.route.paramMap.subscribe(params => {
            this.attemptId = params.get('attemptId');
            console.log('ResultDetail: Route Param ID:', this.attemptId);
            if (this.attemptId) {
                this.loadAttemptDetails();
            }
        });
    }

    loadAttemptDetails() {
        console.log('ResultDetail: Loading details for:', this.attemptId);
        this.loading = true;
        this.examsService.getAttemptDetails(this.attemptId!).subscribe({
            next: (data) => {
                console.log('ResultDetail: Data received:', data);
                this.attempt = data;
                this.loading = false;
                this.cdr.detectChanges(); // Force update
            },
            error: (err) => {
                console.error('ResultDetail: Failed to load details', err);
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
}
