import { Component, OnInit, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { QuestionsService } from '../../../../core/services/questions.service';
import { PaginationService, PageState } from '../../../../core/services/pagination.service';

declare var bootstrap: any;

import { QuillModule } from 'ngx-quill';

import { MathRenderPipe } from '../../../../core/pipes/math-render.pipe';

@Component({
    selector: 'app-question-list',
    standalone: true,
    imports: [CommonModule, FormsModule, QuillModule, MathRenderPipe],
    templateUrl: './question-list.html',
})
export class QuestionListComponent implements OnInit {
    allQuestions: any[] = [];
    questions: any[] = [];
    loading = false;
    saving = false;
    error = '';
    success = '';

    // Pagination
    pager: PageState = {} as PageState;
    currentPage = 1;
    pageSize = 10;
    pages: number[] = [];

    // New Question Form Model
    newQuestion: any = {
        content: { text: '' },
        type: 'MCQ_SINGLE',
        difficulty: 'MEDIUM',
        explanation: '',
        options: [
            { text: '', isCorrect: false },
            { text: '', isCorrect: false },
            { text: '', isCorrect: false },
            { text: '', isCorrect: false }
        ],
        tags: []
    };

    tagInput = '';
    currentQuestionId: string | null = null;

    constructor(
        private questionsService: QuestionsService,
        private cdr: ChangeDetectorRef,
        private paginationService: PaginationService
    ) { }

    ngOnInit() {
        this.loadQuestions();
    }

    loadQuestions() {
        this.loading = true;
        this.questionsService.getQuestions().subscribe({
            next: (data) => {
                this.allQuestions = data;
                this.setPage(1);
                this.loading = false;
                this.cdr.detectChanges();
            },
            error: (err) => {
                this.error = 'Failed to load questions';
                this.loading = false;
                this.cdr.detectChanges();
            }
        });
    }

    setPage(page: number) {
        if (page < 1 || (this.pager.totalPages && page > this.pager.totalPages)) {
            return;
        }
        this.currentPage = page;
        this.pager = this.paginationService.paginate(this.allQuestions, page, this.pageSize);
        this.questions = this.pager.pagedItems;
        this.pages = this.paginationService.getPages(this.pager.totalPages);
    }

    openCreateModal() {
        this.currentQuestionId = null;
        this.newQuestion = {
            content: { text: '', imageUrl: '' },
            type: 'MCQ_SINGLE',
            difficulty: 'MEDIUM',
            explanation: '',
            options: [
                { text: '', isCorrect: false },
                { text: '', isCorrect: false },
                { text: '', isCorrect: false },
                { text: '', isCorrect: false }
            ],
            tags: []
        };
        this.tagInput = '';

        if (typeof bootstrap !== 'undefined') {
            const modal = bootstrap.Modal.getOrCreateInstance(document.getElementById('createQuestionModal'));
            modal.show();
        }
    }

    openEditModal(q: any) {
        this.currentQuestionId = q.id;
        // Deep copy to avoid modifying list in place before save
        this.newQuestion = JSON.parse(JSON.stringify({
            content: q.content,
            type: q.type,
            difficulty: q.difficulty,
            explanation: q.explanation || '',
            options: q.options ? q.options.map((o: any) => ({ ...o })) : [],
            tags: q.tags ? q.tags.map((t: any) => t.tag.name) : []
        }));
        this.tagInput = '';

        if (typeof bootstrap !== 'undefined') {
            const modal = bootstrap.Modal.getOrCreateInstance(document.getElementById('createQuestionModal'));
            modal.show();
        }
    }

    addTag() {
        if (this.tagInput.trim()) {
            this.newQuestion.tags.push(this.tagInput.trim());
            this.tagInput = '';
        }
    }

    removeTag(index: number) {
        this.newQuestion.tags.splice(index, 1);
    }

    toggleCorrectOption(index: number) {
        if (this.newQuestion.type === 'MCQ_SINGLE') {
            this.newQuestion.options.forEach((opt: any, i: number) => {
                opt.isCorrect = i === index;
            });
        } else if (this.newQuestion.type === 'MCQ_MULTI') {
            this.newQuestion.options[index].isCorrect = !this.newQuestion.options[index].isCorrect;
        }
    }

    saveQuestion() {
        this.saving = true;

        if (!this.newQuestion.content.text) {
            alert('Question text is required');
            this.saving = false;
            return;
        }

        const action = this.currentQuestionId
            ? this.questionsService.updateQuestion(this.currentQuestionId, this.newQuestion)
            : this.questionsService.createQuestion(this.newQuestion);

        action.subscribe({
            next: () => {
                this.saving = false;
                this.success = this.currentQuestionId ? 'Question updated successfully!' : 'Question created successfully!';
                this.currentQuestionId = null;

                const modal = bootstrap.Modal.getInstance(document.getElementById('createQuestionModal'));
                modal.hide();

                this.loadQuestions();
                // Ensure new item is visible or just reload
                this.cdr.detectChanges();
            },
            error: (err) => {
                this.saving = false;
                this.error = 'Failed to save question';
                console.error(err);
                this.cdr.detectChanges();
            }
        });
    }

    onFileSelected(event: any) {
        const file: File = event.target.files[0];
        if (file) {
            this.loading = true;
            this.questionsService.importQuestions(file).subscribe({
                next: (res) => {
                    this.loading = false;
                    let msg = `Imported ${res.count} questions successfully.`;
                    if (res.skipped > 0) {
                        msg += ` Skipped ${res.skipped} duplicates.`;
                    }
                    this.success = msg;

                    if (res.errors && res.errors.length > 0) {
                        alert('Some rows failed:\n' + res.errors.join('\n'));
                    }
                    this.loadQuestions();
                },
                error: (err) => {
                    this.loading = false;
                    this.error = 'Failed to import questions';
                    console.error(err);
                    this.cdr.detectChanges();
                }
            });
        }
    }
}
