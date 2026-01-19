import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';

@Injectable({
    providedIn: 'root'
})
export class UserService {
    private apiUrl = `${environment.apiUrl}/users`;

    constructor(private http: HttpClient) { }

    getUsers(year?: string, batch?: string): Observable<any[]> {
        let params = new HttpParams();
        if (year) params = params.set('year', year);
        if (batch) params = params.set('batch', batch);
        return this.http.get<any[]>(this.apiUrl, { params });
    }

    getFilters(): Observable<{ academicYears: string[], batches: string[] }> {
        return this.http.get<{ academicYears: string[], batches: string[] }>(`${this.apiUrl}/filters`);
    }

    uploadUsers(file: File): Observable<any> {
        const formData = new FormData();
        formData.append('file', file);
        return this.http.post(`${this.apiUrl}/bulk-upload`, formData);
    }

    updateUser(id: string, data: any): Observable<any> {
        return this.http.patch(`${this.apiUrl}/${id}`, data);
    }

    createUser(data: any): Observable<any> {
        return this.http.post(this.apiUrl, data);
    }
}
