import { Component, OnInit, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ExamsService } from '../../../core/services/exams.service';
import { PaginationService, PageState } from '../../../core/services/pagination.service';

@Component({
    selector: 'app-activity-list',
    standalone: true,
    imports: [CommonModule],
    templateUrl: './activity-list.html',
    styles: [`
        .avatar-sm { width: 40px; height: 40px; }
    `]
})
export class ActivityListComponent implements OnInit {
    allActivities: any[] = [];
    activities: any[] = [];
    loading = true;
    pager: PageState = {} as PageState;
    currentPage = 1;
    pageSize = 10;
    pages: number[] = [];

    constructor(
        private examsService: ExamsService,
        private paginationService: PaginationService,
        private cdr: ChangeDetectorRef
    ) { }

    ngOnInit() {
        this.loadData();
    }

    loadData() {
        this.loading = true;
        this.examsService.getAllActivity().subscribe({
            next: (data: any[]) => {
                this.allActivities = data;
                this.setPage(1);
                this.loading = false;
                this.cdr.detectChanges();
            },
            error: (err: any) => {
                console.error('Failed to load activity', err);
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
        this.pager = this.paginationService.paginate(this.allActivities, page, this.pageSize);
        this.activities = this.pager.pagedItems;
        this.pages = this.paginationService.getPages(this.pager.totalPages);
    }
}
