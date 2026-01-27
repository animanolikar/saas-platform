import { Component, OnInit, ChangeDetectorRef } from '@angular/core';
import { CommonModule, DatePipe, DecimalPipe } from '@angular/common';
import { RouterModule } from '@angular/router';
import { ExamsService } from '../../../core/services/exams.service';

import { FormsModule } from '@angular/forms';

@Component({
    selector: 'app-student-results-list',
    standalone: true,
    imports: [CommonModule, RouterModule, DatePipe, DecimalPipe, FormsModule],
    templateUrl: './result-list.component.html',
})
export class StudentResultsListComponent implements OnInit {
    history: any[] = [];
    loading = false;

    searchTerm = '';
    currentPage = 1;
    pageSize = 10;

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

    get filteredHistory() {
        if (!this.searchTerm) return this.history;
        const term = this.searchTerm.toLowerCase();
        return this.history.filter(h => h.exam.title.toLowerCase().includes(term));
    }

    get paginatedHistory() {
        const start = (this.currentPage - 1) * this.pageSize;
        return this.filteredHistory.slice(start, start + this.pageSize);
    }

    get totalPages() {
        return Math.ceil(this.filteredHistory.length / this.pageSize);
    }

    onSearch() {
        this.currentPage = 1;
        this.cdr.detectChanges();
    }

    nextPage() {
        if (this.currentPage < this.totalPages) {
            this.currentPage++;
            this.cdr.detectChanges();
        }
    }

    prevPage() {
        if (this.currentPage > 1) {
            this.currentPage--;
            this.cdr.detectChanges();
        }
    }
}
