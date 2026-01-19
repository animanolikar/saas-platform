import { Component, OnInit, ChangeDetectorRef } from '@angular/core';
import { CommonModule, DatePipe, DecimalPipe } from '@angular/common';
import { RouterModule } from '@angular/router';
import { ExamsService } from '../../../core/services/exams.service';

@Component({
    selector: 'app-student-results-list',
    standalone: true,
    imports: [CommonModule, RouterModule, DatePipe, DecimalPipe],
    templateUrl: './result-list.component.html',
})
export class StudentResultsListComponent implements OnInit {
    history: any[] = [];
    loading = false;

    constructor(
        private examsService: ExamsService,
        private cdr: ChangeDetectorRef
    ) { }

    ngOnInit() {
        this.loading = true;
        this.examsService.getHistory().subscribe({
            next: (data) => {
                this.history = data;
                this.loading = false;
                this.cdr.detectChanges();
            },
            error: (err) => {
                console.error('Error loading history', err);
                this.loading = false;
            }
        });
    }
}
