import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { HttpClient } from '@angular/common/http';
import { environment } from '../../../../environments/environment';

@Component({
    selector: 'app-billing',
    standalone: true,
    imports: [CommonModule, FormsModule],
    templateUrl: './billing.component.html',
    styleUrls: ['./billing.component.css']
})
export class BillingComponent implements OnInit {
    loading = false;
    savingRazorpay = false;
    savingPhonepe = false;
    error = '';
    success = '';

    razorpay = {
        provider: 'RAZORPAY',
        isActive: false,
        apiKey: '',
        apiSecret: ''
    };

    phonepe = {
        provider: 'PHONEPE',
        isActive: false,
        apiKey: '', // Merchant ID
        apiSecret: '' // Salt / Key
    };

    constructor(private http: HttpClient) { }

    ngOnInit(): void {
        this.loadSettings();
    }

    loadSettings() {
        this.loading = true;
        this.http.get<any>(`${environment.apiUrl}/payments/settings`).subscribe({
            next: (res) => {
                if (res.razorpay) this.razorpay = res.razorpay;
                if (res.phonepe) this.phonepe = res.phonepe;
                this.loading = false;
            },
            error: (err) => {
                console.error('Failed to load payment settings', err);
                this.error = 'Failed to load settings from server.';
                this.loading = false;
            }
        });
    }

    saveRazorpay() {
        this.savingRazorpay = true;
        this.error = '';
        this.success = '';
        this.http.post(`${environment.apiUrl}/payments/settings`, this.razorpay).subscribe({
            next: () => {
                this.success = 'Razorpay credentials saved successfully.';
                this.savingRazorpay = false;
            },
            error: (err) => {
                console.error(err);
                this.error = 'Failed to save Razorpay settings.';
                this.savingRazorpay = false;
            }
        });
    }

    savePhonepe() {
        this.savingPhonepe = true;
        this.error = '';
        this.success = '';
        this.http.post(`${environment.apiUrl}/payments/settings`, this.phonepe).subscribe({
            next: () => {
                this.success = 'PhonePe credentials saved successfully.';
                this.savingPhonepe = false;
            },
            error: (err) => {
                console.error(err);
                this.error = 'Failed to save PhonePe settings.';
                this.savingPhonepe = false;
            }
        });
    }
}
