import { Component, OnInit, ChangeDetectorRef } from '@angular/core';
import { CommonModule, DatePipe, DecimalPipe } from '@angular/common';
import { ExamsService } from '../../../core/services/exams.service';
import { ReportsService } from '../../../core/services/reports.service';
import { ActivatedRoute, RouterModule } from '@angular/router';
import { BaseChartDirective } from 'ng2-charts';
import { ChartConfiguration, ChartOptions, ChartType } from 'chart.js';
import { forkJoin } from 'rxjs';

@Component({
    selector: 'app-parent-report',
    standalone: true,
    imports: [CommonModule, RouterModule, DatePipe, DecimalPipe, BaseChartDirective],
    templateUrl: './parent-report.component.html',
    styles: [`
        .chart-container { position: relative; height: 300px; width: 100%; }
        .participation-card { transition: transform 0.2s; }
        .participation-card:hover { transform: translateY(-5px); }
    `]
})
export class ParentReportComponent implements OnInit {
    loading = true;
    history: any[] = [];
    assignments: any[] = [];

    // Section A: Participation
    participation = { completed: 0, inProgress: 0, pending: 0 };

    // Section B: Score Trend
    scoreTrend: any[] = [];

    // Section C: Efficiency (Scatter)
    efficiencyData: any[] = [];

    // Section D: Improvement Scope
    improvementScope = { current: 0, lost: 0, recoverable: 0 };

    // Section E: Topic Analysis
    topicAnalysis: any[] = [];

    // Section F: Prediction
    prediction = { current: 0, potential: 0 };

    // New: Parent Mindset Insights
    overallStatus: 'Analyzing...' | 'Improving' | 'Consistent' | 'Needs Attention' = 'Analyzing...';
    behaviorInsight = '';
    aiSuggestion = '';
    nextSteps: string[] = [];
    loadingNextSteps = false;

    // Chart Configuration
    public lineChartType: ChartType = 'line';
    public bubbleChartType: ChartType = 'bubble';

    public lineChartData: ChartConfiguration['data'] = { datasets: [], labels: [] };
    public bubbleChartData: ChartConfiguration['data'] = { datasets: [] };

    public lineChartOptions: ChartConfiguration['options'] = {
        responsive: true,
        maintainAspectRatio: false,
        plugins: { legend: { display: false } },
        scales: {
            y: { min: 0, max: 100, title: { display: true, text: 'Score %' } }
        }
    };

    public bubbleChartOptions: ChartConfiguration['options'] = {
        responsive: true,
        maintainAspectRatio: false,
        plugins: { legend: { display: false } },
        scales: {
            x: { title: { display: true, text: 'Speed (Questions/Min)' }, min: 0, max: 5 },
            y: { title: { display: true, text: 'Accuracy %' }, min: 0, max: 100 }
        }
    };

    constructor(
        private examsService: ExamsService,
        private reportsService: ReportsService,
        private cdr: ChangeDetectorRef,
        private route: ActivatedRoute
    ) { }

    ngOnInit() {
        // Subscribe to params to force reload if navigating from same component (though unlikely for this route)
        // Or just load on init. 
        // If the user says "click on parent report menu" and it doesn't reload, it might be RouteReuseStrategy or just SPA behavior.
        // We can force load.
        this.route.params.subscribe(() => {
            this.loading = true;
            this.loadData();
        });
    }

    loadData() {
        this.loading = true;
        // Use forkJoin to wait for all critical data
        forkJoin({
            history: this.examsService.getHistory(),
            assignments: this.examsService.getAvailableExams(),
            topics: this.reportsService.getTopicAnalysis(),
            recommendations: this.reportsService.getParentRecommendations() // Add this to init
        }).subscribe({
            next: (results) => {
                this.history = results.history;
                this.assignments = results.assignments;

                // Store Topics directly (no need to fetch again in calcTopicAnalysis)
                this.topicAnalysis = results.topics.map(item => ({
                    topic: item.tag,
                    accuracy: item.percentage
                })).sort((a, b) => a.accuracy - b.accuracy);

                // Store Recommendations directly
                if (results.recommendations && results.recommendations.recommendations) {
                    this.nextSteps = results.recommendations.recommendations;
                }

                // Calculate Sync Metrics
                this.calculateMetricsSync();

                // Fetch AI Insight for LATEST exam (if any)
                const completed = this.history.filter(h => ['SUBMITTED', 'EVALUATED'].includes(h.status));
                if (completed.length > 0) {
                    const latest = completed.sort((a, b) => new Date(b.submittedAt).getTime() - new Date(a.submittedAt).getTime())[0];
                    this.reportsService.getTestAnalysis(latest.id).subscribe({
                        next: (res) => {
                            if (res && res.content) {
                                this.aiSuggestion = "AI Note: Detailed analysis suggests reviewing the 'Concept Gaps' in the full report.";
                            }
                            this.loading = false;
                            this.cdr.detectChanges();
                        },
                        error: () => {
                            console.log("AI fetch failed");
                            this.loading = false;
                            this.cdr.detectChanges();
                        }
                    });
                } else {
                    this.loading = false;
                    this.cdr.detectChanges();
                }
            },
            error: (err) => {
                console.error('Error loading parent report data', err);
                this.loading = false;
                this.cdr.detectChanges();
            }
        });
    }

    calculateMetricsSync() {
        this.calcParticipation();
        this.calcScoreTrend();
        this.calcEfficiency();
        this.calcImprovementScope();
        this.calcPrediction(); // Sync
        this.determineOverallStatus();

        // Remove calcTopicAnalysis call as it is now loaded in forkJoin
        // Remove generateNextSteps call as it is now loaded in forkJoin (or we can call a sync version if we want fallback)
        if (this.nextSteps.length === 0) {
            this.fallbackNextSteps(); // Only fallback if AI failed/empty
        }
    }

    determineOverallStatus() {
        if (this.history.length < 2) {
            this.overallStatus = 'Consistent';
            return;
        }
        const recent = this.scoreTrend.slice(-3);
        if (recent.length >= 2) {
            const last = recent[recent.length - 1].score;
            const prev = recent[recent.length - 2].score;
            if (last > prev + 5) this.overallStatus = 'Improving';
            else if (last < prev - 5) this.overallStatus = 'Needs Attention';
            else this.overallStatus = 'Consistent';
        }
    }

    generateNextSteps() {
        this.nextSteps = [];
        this.loadingNextSteps = true; // Add loading state if needed in UI, or just wait

        // Call AI Endpoint
        this.reportsService.getParentRecommendations().subscribe({
            next: (res) => {
                if (res && res.recommendations && res.recommendations.length > 0) {
                    this.nextSteps = res.recommendations;
                } else {
                    this.fallbackNextSteps();
                }
                this.loadingNextSteps = false;
            },
            error: (err) => {
                console.error('Failed to fetch parent recommendations', err);
                this.fallbackNextSteps();
                this.loadingNextSteps = false;
            }
        });
    }

    fallbackNextSteps() {
        // Fallback to static logic if API fails
        this.nextSteps = [];
        if (this.efficiencyData.length > 0) {
            const totalSpeed = this.efficiencyData.reduce((sum, item) => sum + item.speed, 0);
            const avgSpeed = totalSpeed / this.efficiencyData.length;
            if (avgSpeed > 3) {
                this.nextSteps.push("Encourage reading questions twice to reduce rushing.");
                this.behaviorInsight = "Overall, tends to answer quickly (Rushed).";
            } else if (avgSpeed < 0.5) {
                this.nextSteps.push("Practice time-bound quizzes to improve speed.");
                this.behaviorInsight = "Overall, takes time to think deeply (Slow).";
            } else {
                this.behaviorInsight = "Maintains a balanced pace overall.";
            }
        }

        const weakTopic = this.topicAnalysis.find(t => t.accuracy < 60);
        if (weakTopic) {
            this.nextSteps.push(`Spend 15 mins reviewing ${weakTopic.topic} concepts together.`);
        } else {
            this.nextSteps.push("Challenge with harder questions to unlock full potential.");
        }

        if (this.participation.pending > 2) {
            this.nextSteps.push("Schedule a dedicated time this weekend to catch up on pending exams.");
        }
    }

    calcParticipation() {
        this.participation.completed = this.history.filter(h => ['SUBMITTED', 'EVALUATED'].includes(h.status)).length;
        this.participation.inProgress = this.history.filter(h => h.status === 'IN_PROGRESS').length;
        const startedExamIds = new Set(this.history.map(h => h.examId));
        this.participation.pending = this.assignments.filter(e => !startedExamIds.has(e.id)).length;
    }

    calcScoreTrend() {
        const completed = this.history
            .filter(h => ['SUBMITTED', 'EVALUATED'].includes(h.status) && h.result?.percentage !== undefined)
            .sort((a, b) => new Date(a.submittedAt).getTime() - new Date(b.submittedAt).getTime());

        const scores = completed.map(h => h.result.percentage);
        const labels = completed.map(h => {
            const date = new Date(h.submittedAt);
            return `${date.getDate()}/${date.getMonth() + 1}`;
        });

        this.lineChartData = {
            datasets: [{
                data: scores,
                label: 'Score %',
                backgroundColor: 'rgba(13, 110, 253, 0.2)',
                borderColor: '#0d6efd',
                pointBackgroundColor: '#fff',
                pointBorderColor: '#0d6efd',
                pointHoverBackgroundColor: '#0d6efd',
                pointHoverBorderColor: '#fff',
                fill: 'origin',
                tension: 0.3
            }],
            labels: labels
        };
        this.scoreTrend = completed.map(h => ({
            date: h.submittedAt,
            score: h.result.percentage,
            title: h.exam.title
        }));
    }

    calcEfficiency() {
        const completed = this.history.filter(h => ['SUBMITTED', 'EVALUATED'].includes(h.status));

        this.efficiencyData = completed.map(h => {
            // REAL Calculation: Speed = Questions / Time (Minutes)
            let timeMins = 1;

            if (h.startedAt && h.submittedAt) {
                const diff = new Date(h.submittedAt).getTime() - new Date(h.startedAt).getTime();
                timeMins = Math.max(0.1, diff / 60000); // 0.1 min min to avoid huge speed
            } else if (h.exam?.duration) {
                timeMins = h.exam.duration / 60; // duration is usually seconds
                if (timeMins < 1) timeMins = 1;
            }

            // Estimate Questions count: Use _count.answers from backend query
            // Fallback to 10 if unknown
            const qCount = h._count?.answers || h.exam?.questions?.length || h.exam?.questionsCount || 10;

            const speed = parseFloat((qCount / timeMins).toFixed(2));
            const accuracy = h.result?.percentage || 0;

            return { title: h.exam.title, speed: speed, score: accuracy };
        });

        const bubbleData = this.efficiencyData.map(d => ({
            x: d.speed,
            y: d.score,
            r: 10
        }));

        this.bubbleChartData = {
            datasets: [{
                data: bubbleData,
                label: 'Efficiency',
                backgroundColor: 'rgba(25, 135, 84, 0.6)',
                borderColor: '#198754',
                hoverBackgroundColor: '#198754',
                hoverBorderColor: '#fff',
            }]
        };
    }

    fetchLatestAiInsight(attemptId: string) {
        this.reportsService.getTestAnalysis(attemptId).subscribe({
            next: (res) => {
                if (res && res.content) {
                    this.aiSuggestion = "AI Note: Detailed analysis suggests reviewing the 'Concept Gaps' in the full report.";
                }
            },
            error: () => { console.log("AI fetch failed"); }
        });
    }

    calcImprovementScope() {
        if (this.history.length === 0) return;
        const latest = this.history
            .filter(h => ['SUBMITTED', 'EVALUATED'].includes(h.status))
            .sort((a, b) => new Date(b.submittedAt).getTime() - new Date(a.submittedAt).getTime())[0];

        if (latest && latest.result) {
            this.improvementScope.current = latest.result.percentage || 0;
            this.improvementScope.lost = 100 - this.improvementScope.current;
            this.improvementScope.recoverable = Math.round(this.improvementScope.lost * 0.4);
        }
    }

    calcTopicAnalysis() {
        this.reportsService.getTopicAnalysis().subscribe({
            next: (data) => {
                this.topicAnalysis = data.map(item => ({
                    topic: item.tag,
                    accuracy: item.percentage
                })).sort((a, b) => a.accuracy - b.accuracy); // Sort by accuracy (ascending) to show weak areas first
            },
            error: (err) => console.error('Failed to load topic analysis', err)
        });
    }

    calcPrediction() {
        this.prediction.current = this.improvementScope.current;
        this.prediction.potential = Math.min(95, this.prediction.current + this.improvementScope.recoverable);
    }
}
