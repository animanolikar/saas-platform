import { Injectable } from '@angular/core';
import { BehaviorSubject } from 'rxjs';

export interface PageState {
    currentPage: number;
    pageSize: number;
    totalItems: number;
    totalPages: number;
    pagedItems: any[];
}

@Injectable({
    providedIn: 'root'
})
export class PaginationService {

    paginate(items: any[], currentPage: number = 1, pageSize: number = 10): PageState {
        // Calculate total pages
        const totalPages = Math.ceil(items.length / pageSize);

        // Ensure current page isn't out of range
        if (currentPage < 1) {
            currentPage = 1;
        } else if (currentPage > totalPages) {
            currentPage = totalPages;
        }

        // Calculate start and end index
        const startIndex = (currentPage - 1) * pageSize;
        const endIndex = Math.min(startIndex + pageSize - 1, items.length - 1);

        // Get new paged items
        const pagedItems = items.slice(startIndex, endIndex + 1);

        // Return object with all pager properties required by the view
        return {
            totalItems: items.length,
            currentPage: currentPage,
            pageSize: pageSize,
            totalPages: totalPages,
            pagedItems: pagedItems
        };
    }

    // Helper to generate page numbers array (e.g., [1, 2, 3, 4, 5])
    getPages(totalPages: number): number[] {
        return Array.from({ length: totalPages }, (_, i) => i + 1);
    }
}
