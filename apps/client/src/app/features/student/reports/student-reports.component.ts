import { Component, OnInit, ChangeDetectorRef, ViewEncapsulation, Input } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReportsService } from '../../../core/services/reports.service';
import { ExamsService } from '../../../core/services/exams.service';
import { RouterModule } from '@angular/router';
import { BaseChartDirective } from 'ng2-charts';
import { ChartConfiguration, ChartOptions } from 'chart.js';
import { marked } from 'marked';
import { DomSanitizer, SafeHtml } from '@angular/platform-browser';

@Component({
  selector: 'app-student-reports',
  standalone: true,
  imports: [CommonModule, BaseChartDirective, RouterModule],
  templateUrl: './student-reports.component.html',
  encapsulation: ViewEncapsulation.None,
  styles: [`
    @media print {
      /* 1. Global Reset for Print */
      body {
        background: white !important;
        height: auto !important;
        overflow: visible !important;
      }
      
      /* 2. Reset Parent Layouts */
      app-root, app-student-layout, .main-content, .overflow-auto {
        display: block !important;
        height: auto !important;
        overflow: visible !important;
        position: static !important;
      }

      /* 3. Hide UI Elements */
      app-student-layout > div.d-flex > div:first-child { 
        display: none !important; 
      }
      header, .navbar, .no-print {
        display: none !important;
      }

      /* 4. Position the Report */
      #printable-report {
        display: block !important;
        position: absolute !important;
        left: 0 !important;
        top: 0 !important;
        width: 100% !important;
        margin: 0 !important;
        padding: 0 !important;
        background: white !important;
        z-index: 10000 !important;
      }
      
      /* 5. Content Styling */
      h1, h2, h3, p, li {
        color: black !important;
        page-break-inside: auto !important;
      }
      
      .paper-document {
        padding: 0 !important;
        margin: 0 !important;
        border: none !important;
        box-shadow: none !important;
        max-width: 100% !important;
        width: 100% !important;
      }

      /* 6. Fixed Header & Footer */
      .print-header {
        position: fixed;
        top: 0;
        left: 0;
        width: 100%;
        height: 50px;
        background: white;
        border-bottom: 2px solid #eee;
        display: flex;
        align-items: center;
        justify-content: space-between;
        z-index: 10001 !important;
      }
      .print-footer {
        position: fixed;
        bottom: 0;
        left: 0;
        width: 100%;
        height: 30px;
        background: white;
        border-top: 1px solid #eee;
        display: flex;
        align-items: center;
        justify-content: center;
        z-index: 10001 !important;
        font-size: 10px;
        color: #666;
      }

      #printable-report {
        padding-top: 100px !important;
        padding-bottom: 40px !important;
      }
      
      .page-break {
        page-break-before: always;
      }
    }
    
    @page {
      margin: 1.5cm;
      size: auto;
    }
    .markdown-content h1 { font-size: 2rem; color: #2c3e50; margin-top: 2rem; border-bottom: 2px solid #eee; padding-bottom: 0.5rem; }
    .markdown-content h2 { font-size: 1.5rem; color: #34495e; margin-top: 2rem; border-left: 5px solid #4e73df; padding-left: 1rem; }
    .markdown-content h3 { font-size: 1.25rem; color: #4e73df; margin-top: 1.5rem; }
    .markdown-content ul { padding-left: 1.5rem; line-height: 1.7; }
    .markdown-content li { margin-bottom: 0.75rem; color: #4a5568; }
    .markdown-content p { line-height: 1.8; color: #2d3748; font-size: 1.05rem; margin-bottom: 1.5rem; }
    .markdown-content strong { color: #2c3e50; font-weight: 700; }
    .markdown-content blockquote { border-left: 4px solid #1cc88a; padding-left: 1rem; font-style: italic; color: #555; background: #f8f9fa; padding: 1rem; border-radius: 4px; }
    
    .markdown-content table { width: 100%; border-collapse: collapse; margin-bottom: 1.5rem; }
    .markdown-content th { background-color: #f8f9fa; color: #4e73df; font-weight: 600; padding: 12px; border: 1px solid #dee2e6; text-align: left; }
    .markdown-content td { padding: 12px; border: 1px solid #dee2e6; color: #2d3748; }
    .markdown-content tr:nth-child(even) { background-color: #f8f9fa; }
    
    .paper-document {
        background: white;
        padding: 40px;
        border-radius: 4px;
        box-shadow: 0 4px 6px rgba(0,0,0,0.1);
        max-width: 900px;
        margin: 0 auto;
    }
  `]
})
export class StudentReportsComponent implements OnInit {
  @Input() userId?: string;

  activeTab: 'overview' | 'detailed' = 'overview';
  loading = false;
  today = new Date();
  summaryData: any = null;

  // Performance Chart (Line)
  performanceData: ChartConfiguration<'line'>['data'] = {
    labels: [],
    datasets: [
      {
        data: [],
        label: 'Score (%)',
        fill: true,
        tension: 0.4,
        borderColor: '#4e73df',
        backgroundColor: 'rgba(78, 115, 223, 0.05)',
        pointBackgroundColor: '#4e73df'
      }
    ]
  };
  performanceOptions: ChartOptions<'line'> = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: { display: false },
      tooltip: { mode: 'index', intersect: false }
    },
    scales: {
      y: {
        min: 0,
        max: 100,
        grid: { display: true },
        title: { display: true, text: 'Score (%)', font: { weight: 'bold' } }
      },
      x: {
        grid: { display: false },
        title: { display: true, text: 'Exam Date', font: { weight: 'bold' } }
      }
    }
  };

  // Topic Radar Chart
  topicData: ChartConfiguration<'radar'>['data'] = {
    labels: [],
    datasets: [
      { data: [], label: 'Topic Mastery' }
    ]
  };
  topicOptions: ChartOptions<'radar'> = {
    responsive: true,
    scales: {
      r: {
        angleLines: { display: true },
        suggestedMin: 0,
        suggestedMax: 100
      }
    }
  };

  // AI Report
  reportContent: SafeHtml = '';
  reportLoading = false;
  reportHistory: any[] = [];
  selectedReportId: string | null = null;

  // History Modal
  historyModalVisible = false;
  examHistory: any[] = [];

  // Explainer Modal
  explainerVisible = false;

  constructor(
    private reportsService: ReportsService,
    private examsService: ExamsService,
    private sanitizer: DomSanitizer,
    private cdr: ChangeDetectorRef
  ) { }

  openExplainer() {
    this.explainerVisible = true;
  }

  closeExplainer() {
    this.explainerVisible = false;
  }

  openExamHistory(mode: 'view' | 'select' = 'view') {
    this.historyModalVisible = true;
    this.isSelectionMode = mode === 'select';
    this.selectedAttempts.clear(); // Reset selection on open

    if (this.examHistory.length === 0) {
      this.examsService.getHistory().subscribe(history => {
        this.examHistory = history;
        this.cdr.markForCheck();
      });
    }
  }

  closeExamHistory() {
    this.historyModalVisible = false;
    this.isSelectionMode = false;
  }

  getCurrentUserId(): string | null {
    if (this.userId) return this.userId;
    try {
      const userStr = localStorage.getItem('saas_user');
      if (userStr) {
        const user = JSON.parse(userStr);
        return user.id;
      }
    } catch (e) { console.error('Error parsing user', e); }
    return null;
  }

  ngOnInit() {
    this.loadOverviewData();
    this.loadHistory();
  }

  loadHistory() {
    this.reportsService.getReportHistory(this.userId).subscribe(history => {
      this.reportHistory = history;
      // If no report selected and history exists, load the latest one
      if (!this.selectedReportId && this.reportHistory.length > 0) {
        this.viewReport(this.reportHistory[0]);
      }
      this.cdr.markForCheck();
    });
  }

  viewReport(report: any) {
    this.activeTab = 'detailed';
    this.selectedReportId = report.id;
    this.reportLoading = true;
    this.cdr.markForCheck();

    this.reportsService.getReportById(report.id, this.userId).subscribe({
      next: (res) => {
        this.setReportContent(res.content);
        this.reportLoading = false;
        this.cdr.markForCheck();
      },
      error: () => {
        this.reportLoading = false;
        this.reportContent = 'Failed to load report.';
        this.cdr.markForCheck();
      }
    });
  }

  loadOverviewData() {
    this.loading = true;

    // Load Summary
    this.reportsService.getDashboardSummary(this.userId).subscribe(summary => {
      this.summaryData = summary;
    });

    this.reportsService.getPerformanceTrend(this.userId).subscribe(trend => {
      const labels = trend.map(t => new Date(t.date).toLocaleDateString());

      // 1. Base Dataset: Overall Score
      const datasets: ChartConfiguration<'line'>['data']['datasets'] = [
        {
          data: trend.map(t => t.percentage),
          label: 'Overall Score (%)',
          fill: false,
          tension: 0.4,
          borderColor: '#4e73df',
          backgroundColor: '#4e73df',
          pointBackgroundColor: '#4e73df',
          borderWidth: 3
        }
      ];

      // 2. Extract Unique Tags across all exams
      const allTags = new Set<string>();
      trend.forEach(t => {
        if (t.tagScores) {
          t.tagScores.forEach((ts: any) => allTags.add(ts.tag));
        }
      });

      // 3. Create Dataset for each Tag
      const colors = ['#1cc88a', '#36b9cc', '#f6c23e', '#e74a3b', '#858796', '#6610f2', '#fd7e14', '#20c9a6'];
      let colorIndex = 0;

      allTags.forEach(tag => {
        const data = trend.map(t => {
          const tagScore = t.tagScores?.find((ts: any) => ts.tag === tag);
          return tagScore ? tagScore.percentage : null; // Use null for gaps if tag wasn't in that exam
        });

        // Only add line if it has some data
        if (data.some(d => d !== null)) {
          datasets.push({
            data: data as number[],
            label: tag,
            fill: false,
            tension: 0.4,
            borderColor: colors[colorIndex % colors.length],
            backgroundColor: colors[colorIndex % colors.length],
            pointBackgroundColor: colors[colorIndex % colors.length],
            borderDash: [5, 5], // Dashed line for tags to differentiate from main
            borderWidth: 2
          });
          colorIndex++;
        }
      });

      this.performanceData = { labels, datasets };

      // Update Legend to be visible now that we have multiple lines
      this.performanceOptions.plugins!.legend!.display = true;

      this.cdr.markForCheck();
    });

    this.reportsService.getTopicAnalysis(this.userId).subscribe(topics => {
      this.topicData.labels = topics.map(t => t.tag);
      this.topicData.datasets[0].data = topics.map(t => t.percentage);
      this.topicData.datasets[0].label = 'Mastery (%)';
      this.topicData.datasets[0].backgroundColor = 'rgba(28, 200, 138, 0.2)';
      this.topicData.datasets[0].borderColor = '#1cc88a';

      this.loading = false;
      this.cdr.markForCheck();
    });
    this.loading = false;
    this.cdr.markForCheck();
  }

  // --- Custom Analysis Logic ---
  isSelectionMode = false;
  selectedAttempts = new Set<string>();
  customReportGenerating = false;

  toggleAttemptSelection(id: string) {
    if (this.selectedAttempts.has(id)) {
      this.selectedAttempts.delete(id);
    } else {
      this.selectedAttempts.add(id);
    }
    this.cdr.markForCheck();
  }

  generateCustomReport() {
    if (this.selectedAttempts.size === 0) return;

    this.closeExamHistory();
    this.activeTab = 'detailed';
    this.reportLoading = true;
    this.selectedReportId = null; // Clear selection as we are generating new
    this.cdr.markForCheck();

    const attempts = Array.from(this.selectedAttempts);
    this.reportsService.getCustomAnalysis(attempts, this.userId).subscribe({
      next: (res) => {
        this.setReportContent(res.content);
        this.reportLoading = false;
        this.selectedAttempts.clear();
        this.loadHistory();
        this.cdr.markForCheck();
      },
      error: () => {
        this.reportLoading = false;
        this.reportContent = 'Failed to generate custom analysis. Please try again.';
        this.cdr.markForCheck();
      }
    });
  }
  // -----------------------------

  generateReport(force = false) {
    this.activeTab = 'detailed';
    const uid = this.getCurrentUserId();

    // If forcing generation, ignore current state
    if (force) {
      this.performGeneration(uid);
      return;
    }

    // If we are already viewing a report, do nothing (just switch tab)
    if (this.selectedReportId) return;

    // If we have history, view the latest
    if (this.reportHistory.length > 0) {
      this.viewReport(this.reportHistory[0]);
      return;
    }

    // Otherwise, generate new (first time)
    this.performGeneration(uid);
  }

  private performGeneration(uid: string | null) {
    this.reportLoading = true;
    this.cdr.markForCheck();

    this.reportsService.getFullReport(this.userId).subscribe({
      next: (res) => {
        this.setReportContent(res.content);
        this.reportLoading = false;
        // Refresh history to include the new one
        this.loadHistory();
        this.cdr.markForCheck();
      },
      error: () => {
        this.reportLoading = false;
        this.reportContent = 'Failed to generate report. Please try again.';
        this.cdr.markForCheck();
      }
    });
  }

  private setReportContent(markdown: string) {
    const rawMarkup = marked.parse(markdown);
    if (rawMarkup instanceof Promise) {
      rawMarkup.then(s => {
        this.reportContent = this.sanitizer.bypassSecurityTrustHtml(s);
        this.cdr.markForCheck();
      })
    } else {
      this.reportContent = this.sanitizer.bypassSecurityTrustHtml(rawMarkup);
      this.cdr.markForCheck();
    }
  }

  printReport() {
    window.print();
  }
}
