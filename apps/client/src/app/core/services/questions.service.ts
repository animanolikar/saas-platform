import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';

@Injectable({
    providedIn: 'root'
})
export class QuestionsService {
    private apiUrl = `${environment.apiUrl}/questions`;

    constructor(private http: HttpClient) { }

    getQuestions(): Observable<any[]> {
        return this.http.get<any[]>(this.apiUrl);
    }

    createQuestion(data: any): Observable<any> {
        return this.http.post<any>(this.apiUrl, data);
    }

    updateQuestion(id: string, data: any): Observable<any> {
        return this.http.put<any>(`${this.apiUrl}/${id}`, data);
    }

    importQuestions(file: File): Observable<any> {
        const formData = new FormData();
        formData.append('file', file);
        return this.http.post<any>(`${this.apiUrl}/import`, formData);
    }
}
