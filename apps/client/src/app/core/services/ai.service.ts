
import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, of } from 'rxjs';
import { catchError, map } from 'rxjs/operators';

import { environment } from '../../../environments/environment';

@Injectable({
    providedIn: 'root'
})
export class AiService {
    private apiUrl = `${environment.apiUrl}/ai/math`;

    constructor(private http: HttpClient) { }

    convertTextToLatex(text: string): Observable<string> {
        return this.http.post<{ latex: string }>(`${this.apiUrl}/text`, { text }).pipe(
            map(res => res.latex),
            catchError(err => {
                console.error('AI Text Conversion Failed', err);
                return of(text); // Fallback to original text
            })
        );
    }

    convertImageToLatex(imageBase64: string): Observable<string> {
        return this.http.post<{ latex: string }>(`${this.apiUrl}/image`, { image: imageBase64 }).pipe(
            map(res => res.latex),
            catchError(err => {
                console.error('AI Image Conversion Failed', err);
                throw err; // Re-throw to handle in UI
            })
        );
    }
}
