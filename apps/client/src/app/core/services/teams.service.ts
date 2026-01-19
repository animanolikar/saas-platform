import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';

@Injectable({
    providedIn: 'root'
})
export class TeamsService {
    private apiUrl = `${environment.apiUrl}/teams`;

    constructor(private http: HttpClient) { }

    getTeams(): Observable<any[]> {
        return this.http.get<any[]>(this.apiUrl);
    }

    createTeam(name: string, description: string, academicYear?: string, batch?: string): Observable<any> {
        return this.http.post(this.apiUrl, { name, description, academicYear, batch });
    }

    addMember(teamId: string, userId: string, role: string): Observable<any> {
        return this.http.post(`${this.apiUrl}/${teamId}/members`, { userId, role });
    }

    removeMember(teamId: string, memberId: string): Observable<any> {
        // Backend expects DELETE /teams/:teamId/members/:memberId
        // Assuming memberId refers to the User ID for simplicity, or we might need the membership ID.
        // Let's verify backend logic. Backend removeMember takes (orgId, teamId, memberId)
        // AND checks `where: { userId: memberId }`. So we pass USER ID.
        return this.http.delete(`${this.apiUrl}/${teamId}/members/${memberId}`);
    }

    getTeam(id: string): Observable<any> {
        return this.http.get<any>(`${this.apiUrl}/${id}`);
    }
}
