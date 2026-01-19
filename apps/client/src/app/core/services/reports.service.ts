import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';

@Injectable({
    providedIn: 'root'
})
export class ReportsService {
    private apiUrl = `${environment.apiUrl}/reports`;

    constructor(private http: HttpClient) { }

    getPerformanceTrend(userId?: string): Observable<any[]> {
        const params: any = {};
        if (userId) params.userId = userId;
        return this.http.get<any[]>(`${this.apiUrl}/student/performance`, { params });
    }

    getTopicAnalysis(userId?: string): Observable<any[]> {
        const params: any = {};
        if (userId) params.userId = userId;
        return this.http.get<any[]>(`${this.apiUrl}/student/topics`, { params });
    }

    getDashboardSummary(userId?: string): Observable<any> {
        const params: any = {};
        if (userId) params.userId = userId;
        return this.http.get<any>(`${this.apiUrl}/student/summary`, { params });
    }

    getFullReport(userId?: string): Observable<{ content: string }> {
        const params: any = {};
        if (userId) params.userId = userId;
        return this.http.get<{ content: string }>(`${this.apiUrl}/student/full-report`, { params });
    }
}
