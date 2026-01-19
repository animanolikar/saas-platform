import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { BehaviorSubject, tap } from 'rxjs';
import { Router } from '@angular/router';
import { environment } from '../../../environments/environment';

@Injectable({
  providedIn: 'root'
})
export class AuthService {
  private apiUrl = `${environment.apiUrl}/auth`;
  private tokenKey = 'saas_token';
  private userKey = 'saas_user';
  private userSubject = new BehaviorSubject<any>(null);
  public currentUser$ = this.userSubject.asObservable();

  constructor(private http: HttpClient, private router: Router) {
    const token = localStorage.getItem(this.tokenKey);
    const user = localStorage.getItem(this.userKey);
    if (token) {
      if (user) {
        try {
          const parsedUser = JSON.parse(user);
          this.userSubject.next({ ...parsedUser, token });
        } catch (e) {
          console.error('Failed to parse user from storage', e);
          this.userSubject.next({ token });
        }
      } else {
        // Fallback if only token exists (e.g. legacy session)
        // ideally we might want to fetch profile here if we had an endpoint
        this.userSubject.next({ token });
      }
    }
  }

  login(credentials: any) {
    return this.http.post<{ accessToken: string, user: any }>(`${this.apiUrl}/login`, credentials).pipe(
      tap(response => {
        localStorage.setItem(this.tokenKey, response.accessToken);
        localStorage.setItem(this.userKey, JSON.stringify(response.user));
        // Store full user object
        this.userSubject.next({ ...response.user, token: response.accessToken });
      })
    );
  }

  logout() {
    localStorage.removeItem(this.tokenKey);
    localStorage.removeItem(this.userKey);
    this.userSubject.next(null);
    this.router.navigate(['/login']);
  }

  getToken(): string | null {
    return localStorage.getItem(this.tokenKey);
  }

  isAuthenticated(): boolean {
    return !!localStorage.getItem(this.tokenKey);
  }

  updateUser(user: any) {
    localStorage.setItem(this.userKey, JSON.stringify(user));
    const token = this.getToken();
    this.userSubject.next({ ...user, token });
  }
}
