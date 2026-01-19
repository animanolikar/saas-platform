import { Component, OnInit, OnDestroy, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { ExamsService } from '../../../core/services/exams.service';

@Component({
    selector: 'app-admin-dashboard',
    standalone: true,
    imports: [CommonModule],
    templateUrl: './dashboard.component.html',
    styleUrl: './dashboard.component.css'
})
export class DashboardComponent implements OnInit, OnDestroy {
    stats: any = {
        totalUsers: 0,
        activeExams: 0,
        testsCompleted: 0,
        recentActivity: [],
        systemHealth: { activeSessions: 0, serverLoad: 0 }
    };
    loading = true;
    private refreshInterval: any;

    constructor(
        private examsService: ExamsService,
        private cdr: ChangeDetectorRef,
        private router: Router
    ) { }

    ngOnInit() {
        this.loadStats();
        // Refresh every 30 seconds
        this.refreshInterval = setInterval(() => {
            this.loadStats();
        }, 30000);
    }

    ngOnDestroy() {
        if (this.refreshInterval) {
            clearInterval(this.refreshInterval);
        }
    }

    loadStats() {
        this.examsService.getDashboardStats().subscribe({
            next: (data) => {
                this.stats = data;
                this.loading = false;
                this.cdr.detectChanges(); // Force update
            },
            error: (err) => {
                console.error('Failed to load dashboard stats', err);
                this.loading = false;
                this.cdr.detectChanges(); // Force update on error too
            }
        });
    }

    navigateToResults() {
        // Navigate to the full exam activity/results page
        this.router.navigate(['/admin/activity']);
    }
}
