import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';

@Injectable({
    providedIn: 'root'
})
export class ExamsService {
    private apiUrl = `${environment.apiUrl}/exams`;

    constructor(private http: HttpClient) { }

    getExams(): Observable<any[]> {
        return this.http.get<any[]>(this.apiUrl);
    }

    getExam(id: string): Observable<any> {
        return this.http.get<any>(`${this.apiUrl}/${id}`);
    }

    createExam(exam: any): Observable<any> {
        return this.http.post<any>(this.apiUrl, exam);
    }

    updateExam(id: string, exam: any): Observable<any> {
        return this.http.put<any>(`${this.apiUrl}/${id}`, exam);
    }

    addQuestion(examId: string, data: any): Observable<any> {
        return this.http.post<any>(`${this.apiUrl}/${examId}/questions`, data);
    }

    removeQuestion(examId: string, examQuestionId: string): Observable<any> {
        return this.http.delete<any>(`${this.apiUrl}/${examId}/questions/${examQuestionId}`);
    }

    publishExam(examId: string): Observable<any> {
        return this.http.put<any>(`${this.apiUrl}/${examId}`, { status: 'PUBLISHED' });
    }

    startExam(examId: string): Observable<any> {
        return this.http.get<any>(`${this.apiUrl}/${examId}/start`);
    }

    submitExam(examId: string, answers: any, telemetry: any[] = []): Observable<any> {
        return this.http.post<any>(`${this.apiUrl}/${examId}/submit`, { answers, telemetry });
    }

    saveProgress(examId: string, answers: any): Observable<any> {
        return this.http.post<any>(`${this.apiUrl}/${examId}/save`, { answers });
    }

    getHistory(): Observable<any[]> {
        return this.http.get<any[]>(`${this.apiUrl}/history`);
    }

    getExamAttempts(examId: string): Observable<any[]> {
        return this.http.get<any[]>(`${this.apiUrl}/${examId}/attempts`);
    }

    getAttemptDetails(attemptId: string): Observable<any> {
        return this.http.get<any>(`${this.apiUrl}/attempts/${attemptId}`);
    }

    getDashboardStats(): Observable<any> {
        return this.http.get<any>(`${this.apiUrl}/dashboard-stats`);
    }

    getAllActivity(): Observable<any[]> {
        return this.http.get<any[]>(`${this.apiUrl}/activity`);
    }

    reorderQuestions(examId: string, sectionId: string | null, questionIds: string[]): Observable<any> {
        return this.http.put<any>(`${this.apiUrl}/${examId}/reorder-questions`, { sectionId, questionIds });
    }

    createSection(examId: string, data: any): Observable<any> {
        return this.http.post<any>(`${this.apiUrl}/sections/${examId}`, data);
    }

    updateSection(sectionId: string, data: any): Observable<any> {
        return this.http.put<any>(`${this.apiUrl}/sections/${sectionId}`, data);
    }

    deleteSection(sectionId: string): Observable<any> {
        return this.http.delete<any>(`${this.apiUrl}/sections/${sectionId}`);
    }

    assignExam(examId: string, payload: { teamIds: string[], userIds: string[] }): Observable<any> {
        return this.http.post<any>(`${this.apiUrl}/${examId}/assign`, payload);
    }

    getAvailableExams(): Observable<any[]> {
        return this.http.get<any[]>(`${this.apiUrl}/student/available`);
    }

    getExamStats(examId: string): Observable<any> {
        return this.http.get<any>(`${this.apiUrl}/${examId}/stats`);
    }
}
