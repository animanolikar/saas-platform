import { Component, OnInit, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router, RouterModule } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { DragDropModule, CdkDragDrop, moveItemInArray } from '@angular/cdk/drag-drop';
import { lastValueFrom } from 'rxjs';
import { ExamsService } from '../../../../core/services/exams.service';
import { QuestionsService } from '../../../../core/services/questions.service';

import { MathRenderPipe } from '../../../../core/pipes/math-render.pipe';
import { QuillModule } from 'ngx-quill';

declare var bootstrap: any;

@Component({
  selector: 'app-exam-builder',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterModule, DragDropModule, MathRenderPipe, QuillModule],
  templateUrl: './exam-builder.component.html'
})
export class ExamBuilderComponent implements OnInit {
  examId: string | null = null;
  exam: any = null;

  // Question Bank
  allQuestions: any[] = [];
  filteredQuestions: any[] = [];
  searchQuery = '';

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
  savingQuestion = false;

  // UI State
  loading = false;
  adding = false;
  activeSectionId: string | 'GENERAL' | undefined = undefined;
  currentQuestionsList: any[] = []; // Stable reference for Drag & Drop

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private examsService: ExamsService,
    private questionsService: QuestionsService,
    private cdr: ChangeDetectorRef
  ) { }

  ngOnInit() {
    this.examId = this.route.snapshot.paramMap.get('id');
    if (this.examId) {
      this.loadData();
    }
  }

  // --- Drag & Drop ---
  drop(event: CdkDragDrop<any[]>) {
    if (event.previousContainer === event.container) {
      moveItemInArray(event.container.data, event.previousIndex, event.currentIndex);

      // Prepare Payload
      const questionsList = event.container.data;
      const orderedIds = questionsList.map((eq: any) => eq.id);
      const sectionId = this.activeSectionId === 'GENERAL' ? null : this.activeSectionId;

      console.log(`[ExamBuilder] Reordering. Section: ${sectionId}`, orderedIds);

      // Sync Backend
      const cleanSectionId = sectionId || null;
      this.examsService.reorderQuestions(this.examId!, cleanSectionId, orderedIds).subscribe({
        next: () => console.log('Order saved successfully'),
        error: (err) => {
          console.error('Failed to save order', err);
          alert('Failed to save new order.');
        }
      });

      this.cdr.detectChanges();
    }
  }

  loadData() {
    this.loading = true;

    // Load Exam
    this.examsService.getExam(this.examId!).subscribe({
      next: (exam) => {
        this.exam = exam;

        // Initialize Active Section only once
        if (this.activeSectionId === undefined) {
          if (this.exam.sections?.length > 0) {
            this.activeSectionId = this.exam.sections[0].id;
          } else {
            this.activeSectionId = 'GENERAL';
          }
        }

        this.updateCurrentList();
        this.checkLoading();
      },
      error: (err) => console.error(err)
    });

    // Load All Questions
    this.questionsService.getQuestions().subscribe({
      next: (questions) => {
        this.allQuestions = questions;
        this.filterQuestions();
        this.checkLoading();
      },
      error: (err) => console.error(err)
    });
  }

  tags: string[] = [];
  selectedTag: string | null = null;

  checkLoading() {
    if (this.exam && this.allQuestions) {
      this.extractTags(); // Extract tags once questions are loaded
      this.loading = false;
      this.cdr.detectChanges();
    }
  }

  extractTags() {
    const tagSet = new Set<string>();
    this.allQuestions.forEach(q => {
      if (q.tags) {
        q.tags.forEach((t: any) => {
          if (t.tag?.name) tagSet.add(t.tag.name);
        });
      }
    });
    this.tags = Array.from(tagSet).sort();
  }

  selectTag(tag: string | null) {
    this.selectedTag = this.selectedTag === tag ? null : tag; // Toggle
    this.filterQuestions();
  }

  filterQuestions() {
    let filtered = this.allQuestions;

    // Filter by Tag
    if (this.selectedTag) {
      filtered = filtered.filter(q =>
        q.tags && q.tags.some((t: any) => t.tag?.name === this.selectedTag)
      );
    }

    // Filter by Search Query
    if (this.searchQuery) {
      const lower = this.searchQuery.toLowerCase();
      filtered = filtered.filter(q =>
        (q.content?.text && q.content.text.toLowerCase().includes(lower)) ||
        (q.tags && q.tags.some((t: any) => t.tag?.name?.toLowerCase().includes(lower)))
      );
    }

    this.filteredQuestions = filtered;
  }

  // --- Bulk Selection Logic ---
  selectedBankQuestions: Set<string> = new Set();

  toggleQuestionSelection(questionId: string) {
    if (this.selectedBankQuestions.has(questionId)) {
      this.selectedBankQuestions.delete(questionId);
    } else {
      this.selectedBankQuestions.add(questionId);
    }
  }

  isQuestionSelected(questionId: string): boolean {
    return this.selectedBankQuestions.has(questionId);
  }

  selectAllFiltered() {
    this.filteredQuestions.forEach(q => {
      if (!this.isQuestionAdded(q.id)) {
        this.selectedBankQuestions.add(q.id);
      }
    });
  }

  deselectAll() {
    this.selectedBankQuestions.clear();
  }

  get selectedCount(): number {
    return this.selectedBankQuestions.size;
  }

  addSelectedQuestions() {
    if (this.selectedCount === 0 || this.adding) return;

    if (!confirm(`Add ${this.selectedCount} questions to ${this.activeSectionId === 'GENERAL' ? 'General' : 'Current Section'}?`)) return;

    this.adding = true;
    const questionsToAdd = this.allQuestions.filter(q => this.selectedBankQuestions.has(q.id));
    const currentSectionId = this.activeSectionId === 'GENERAL' ? null : this.activeSectionId;

    // We'll add them one by one for now as the service likely doesn't support bulk add yet, 
    // or we can loop through them. Ideally backend should support bulk, but loop is safer without backend changes.
    // Actually, let's check if we can parallelize or sequence them.

    let completed = 0;
    let errors = 0;

    // Create an array of observables/promises
    const tasks = questionsToAdd.map(q => {
      const payload = {
        questionId: q.id,
        sectionId: currentSectionId,
        marks: this.exam.settings?.defaultPositiveMarks || 1,
        negativeMarks: this.exam.settings?.defaultNegativeMarks || 0,
        order: (this.exam.questions?.length || 0) + (this.exam.sections?.flatMap((s: any) => s.questions || []).length || 0) + 1 // Rough order
      };
      return lastValueFrom(this.examsService.addQuestion(this.examId!, payload));
    });

    Promise.allSettled(tasks).then((results) => {
      results.forEach((res, index) => {
        if (res.status === 'fulfilled') {
          const addedQ = res.value;
          const originalQ = questionsToAdd[index];
          // Optimistic Update clone
          const fullQuestionDetails = { ...addedQ, question: originalQ };
          if (currentSectionId) {
            const sec = this.exam.sections.find((s: any) => s.id === currentSectionId);
            if (sec) {
              if (!sec.questions) sec.questions = [];
              sec.questions.push(fullQuestionDetails);
            }
          } else {
            if (!this.exam.questions) this.exam.questions = [];
            this.exam.questions.push(fullQuestionDetails);
          }
        } else {
          console.error('Failed to add question', res.reason);
          errors++;
        }
      });

      this.adding = false;
      this.selectedBankQuestions.clear(); // Clear selection after adding
      this.updateCurrentList();
      this.cdr.detectChanges();

      if (errors > 0) {
        alert(`Added ${tasks.length - errors} questions. Failed to add ${errors} questions.`);
      } else {
        // success toast?
      }
    });
  }

  // --- Bulk Remove Logic (Section) ---
  selectedSectionQuestions: Set<string> = new Set();

  toggleSectionQuestionSelection(examQuestionId: string) {
    if (this.selectedSectionQuestions.has(examQuestionId)) {
      this.selectedSectionQuestions.delete(examQuestionId);
    } else {
      this.selectedSectionQuestions.add(examQuestionId);
    }
  }

  isSectionQuestionSelected(examQuestionId: string): boolean {
    return this.selectedSectionQuestions.has(examQuestionId);
  }

  selectAllSectionQuestions() {
    this.currentQuestionsList.forEach(q => this.selectedSectionQuestions.add(q.id));
  }

  deselectAllSectionQuestions() {
    this.selectedSectionQuestions.clear();
  }

  get selectedSectionCount(): number {
    return this.selectedSectionQuestions.size;
  }

  removeSelectedQuestions() {
    if (this.selectedSectionCount === 0) return;
    if (!confirm(`Remove ${this.selectedSectionCount} questions from this section?`)) return;

    const questionsToRemove = Array.from(this.selectedSectionQuestions);
    const tasks = questionsToRemove.map(id =>
      lastValueFrom(this.examsService.removeQuestion(this.examId!, id))
    );

    Promise.allSettled(tasks).then((results) => {
      // Optimistic Update
      questionsToRemove.forEach(id => {
        // Check General
        if (this.exam.questions) {
          this.exam.questions = this.exam.questions.filter((q: any) => q.id !== id);
        }
        // Check Sections
        if (this.exam.sections) {
          this.exam.sections.forEach((sec: any) => {
            if (sec.questions) {
              sec.questions = sec.questions.filter((q: any) => q.id !== id);
            }
          });
        }
      });

      this.selectedSectionQuestions.clear();
      this.updateCurrentList();
      this.cdr.detectChanges();
    });
  }

  isQuestionAdded(questionId: string): boolean {
    if (!this.exam) return false;

    // Check main questions
    if (this.exam.questions?.some((eq: any) => eq.questionId === questionId)) return true;

    // Check sections
    if (this.exam.sections?.some((sec: any) =>
      sec.questions?.some((eq: any) => eq.questionId === questionId)
    )) return true;

    return false;
  }

  createSection() {
    const title = prompt('Enter Section Title (e.g., Physics):');
    if (!title) return;

    this.examsService.createSection(this.examId!, { title }).subscribe({
      next: () => this.loadData(),
      error: (err) => alert('Failed to create section')
    });
  }

  deleteSection(sectionId: string) {
    console.log(`[ExamBuilder] Requesting delete for section: ${sectionId}`);
    if (!confirm('Delete this section? Questions will be moved to unassigned.')) return;

    this.examsService.deleteSection(sectionId).subscribe({
      next: () => {
        console.log(`[ExamBuilder] Section deleted: ${sectionId}`);
        if (this.activeSectionId === sectionId) this.activeSectionId = 'GENERAL';
        this.loadData();
      },
      error: (err) => {
        console.error('[ExamBuilder] Delete Section Failed:', err);
        alert(`Failed to delete section: ${err.error?.message || err.statusText || 'Unknown error'}`);
      }
    });
  }

  updateCurrentList() {
    if (!this.exam) return;

    if (this.activeSectionId === 'GENERAL') {
      this.currentQuestionsList = this.exam.questions || [];
    } else {
      const sec = this.exam.sections.find((s: any) => s.id === this.activeSectionId);
      this.currentQuestionsList = sec ? (sec.questions || []) : [];
    }
  }

  setActiveSection(sectionId: string | 'GENERAL') {
    this.activeSectionId = sectionId;
    this.updateCurrentList();
  }

  addQuestion(question: any) {
    if (!this.examId || this.adding) return;
    this.adding = true;

    const currentSectionId = this.activeSectionId === 'GENERAL' ? null : this.activeSectionId;
    console.log(`[ExamBuilder] Adding Question ${question.id} to Section: ${currentSectionId} (Active: ${this.activeSectionId})`);

    const payload = {
      questionId: question.id,
      sectionId: currentSectionId, // Use active section (or null for General)
      marks: this.exam.settings?.defaultPositiveMarks || 1,
      negativeMarks: this.exam.settings?.defaultNegativeMarks || 0,
      order: (this.exam.questions?.length || 0) + 1 // Simple ordering
    };

    this.examsService.addQuestion(this.examId, payload).subscribe({
      next: (newExamQuestion) => {
        // Optimistic UI Update: Construct the full object locally

        // 1. Get the Question Details from our local bank so we can display it instantly
        // The backend returns the ExamQuestion created, but without the 'question' relation populated.
        // We manually attach it.
        const fullQuestionDetails = {
          ...newExamQuestion,
          question: question
        };

        // 2. Add to Local State
        if (currentSectionId) {
          const sec = this.exam.sections.find((s: any) => s.id === currentSectionId);
          if (sec) {
            if (!sec.questions) sec.questions = [];
            sec.questions.push(fullQuestionDetails);
          }
        } else {
          // General
          if (!this.exam.questions) this.exam.questions = [];
          this.exam.questions.push(fullQuestionDetails);
        }

        this.adding = false;

        const sectionName = currentSectionId ? this.getSectionName(currentSectionId) : 'General';
        console.log(`[ExamBuilder] Successfully added to ${sectionName} (Optimistic Update)`);

        this.updateCurrentList();
        this.cdr.detectChanges();
      },
      error: (err) => {
        console.error('[ExamBuilder] Add Question Failed:', err);
        alert('Failed to add question');
        this.adding = false;
      }
    });
  }

  removeQuestion(eq: any) {
    if (!confirm('Remove this question from exam?')) return;

    // DEBUG: Check what we are trying to remove
    console.log(`[ExamBuilder] Removing Question. EQ ID: ${eq.id}, Q ID: ${eq.question?.id}`);

    this.examsService.removeQuestion(this.examId!, eq.id).subscribe({
      next: () => {
        console.log(`[ExamBuilder] Successfully removed question: ${eq.id} (Optimistic Update)`);

        // Optimistic UI Removal
        // Check General
        if (this.exam.questions) {
          this.exam.questions = this.exam.questions.filter((q: any) => q.id !== eq.id);
        }
        // Check Sections
        if (this.exam.sections) {
          this.exam.sections.forEach((sec: any) => {
            if (sec.questions) {
              sec.questions = sec.questions.filter((q: any) => q.id !== eq.id);
            }
          });
        }

        this.updateCurrentList();
        this.cdr.detectChanges();
      },
      error: (err) => {
        console.error('[ExamBuilder] Remove Question Failed:', err);
        alert(`Failed to remove question: ${err.error?.message || 'Unknown error'}`);
      }
    });
  }

  publishExam() {
    if (!confirm('Are you sure you want to PUBLISH this exam? It will be visible to users.')) return;

    this.examsService.publishExam(this.examId!).subscribe({
      next: () => {
        alert('Exam Published Successfully!');
        this.router.navigate(['/admin/exams']); // Go back to list
      },
      error: (err) => {
        console.error(err);
        alert('Failed to publish exam.');
      }
    });
  }

  getSectionName(sectionId: string): string {
    const sec = this.exam?.sections?.find((s: any) => s.id === sectionId);
    return sec ? sec.title : 'Unknown Section';
  }

  getSectionQuestions(sectionId: string) {
    if (!this.exam?.sections) return [];
    const sec = this.exam.sections.find((s: any) => s.id === sectionId);
    return sec ? sec.questions : [];
  }

  trackByQuestionId(index: number, item: any): string {
    return item.id;
  }


  // Edit Section
  editingSection: any = null;
  editSectionData = { title: '', durationSeconds: 0, cutoffMarks: 0 };

  editSection(section: any) {
    this.editingSection = section;
    this.editSectionData = {
      title: section.title,
      durationSeconds: section.durationSeconds || 0,
      cutoffMarks: section.cutoffMarks || 0
    };
    // Open Modal
    if (typeof bootstrap !== 'undefined') {
      const modalEl = document.getElementById('editSectionModal');
      if (modalEl) {
        const modal = bootstrap.Modal.getOrCreateInstance(modalEl);
        modal.show();
      }
    }
  }

  saveSection() {
    if (!this.editingSection || !this.editSectionData.title) return;

    this.examsService.updateSection(this.editingSection.id, {
      title: this.editSectionData.title,
      durationSeconds: this.editSectionData.durationSeconds || null,
      cutoffMarks: this.editSectionData.cutoffMarks || null
    }).subscribe({
      next: () => {
        // Optimistic Update or Reload
        const sec = this.exam.sections.find((s: any) => s.id === this.editingSection.id);
        if (sec) {
          sec.title = this.editSectionData.title;
          sec.durationSeconds = this.editSectionData.durationSeconds;
          sec.cutoffMarks = this.editSectionData.cutoffMarks;
        }
        this.closeEditSectionModal();
      },
      error: (err) => {
        console.error(err);
        alert('Failed to update section');
      }
    });
  }

  closeEditSectionModal() {
    if (typeof bootstrap !== 'undefined') {
      const modalEl = document.getElementById('editSectionModal');
      if (modalEl) {
        const modal = bootstrap.Modal.getOrCreateInstance(modalEl);
        modal.hide();
      }
    }
    this.editingSection = null;
  }


  // Edit Exam Settings
  editExamData = { title: '', durationSeconds: 0, passPercentage: 0, scheduledAt: '', maxAttempts: 0, allowResume: false };
  tempDurationMinutes = 60;

  openEditExamModal() {
    if (!this.exam) return;
    this.editExamData = {
      title: this.exam.title,
      durationSeconds: this.exam.durationSeconds,
      passPercentage: this.exam.passPercentage,
      scheduledAt: this.exam.scheduledAt ? new Date(this.exam.scheduledAt).toISOString().slice(0, 16) : '',
      maxAttempts: this.exam.settings?.maxAttempts || 0, // 0 means unlimited
      allowResume: this.exam.settings?.allowResume || false
    };
    this.tempDurationMinutes = Math.floor(this.exam.durationSeconds / 60);

    if (typeof bootstrap !== 'undefined') {
      const modalEl = document.getElementById('editExamModal');
      if (modalEl) {
        const modal = bootstrap.Modal.getOrCreateInstance(modalEl);
        modal.show();
      }
    }
  }

  closeEditExamModal() {
    if (typeof bootstrap !== 'undefined') {
      const modalEl = document.getElementById('editExamModal');
      if (modalEl) {
        const modal = bootstrap.Modal.getOrCreateInstance(modalEl);
        modal.hide();
      }
    }
  }

  saveExamSettings() {
    if (!this.exam || !this.editExamData.title) return;

    const payload = {
      title: this.editExamData.title,
      durationSeconds: this.tempDurationMinutes * 60,
      passPercentage: this.editExamData.passPercentage,
      scheduledAt: this.editExamData.scheduledAt ? new Date(this.editExamData.scheduledAt).toISOString() : null,
      settings: {
        ...this.exam.settings,
        maxAttempts: this.editExamData.maxAttempts,
        allowResume: this.editExamData.allowResume
      },
      // Preserve other fields
      description: this.exam.description,
      instructions: this.exam.instructions,
      status: this.exam.status
    };

    this.examsService.updateExam(this.exam.id, payload).subscribe({
      next: (updatedExam: any) => {
        this.exam = { ...this.exam, ...updatedExam };
        alert('Exam Settings Updated!');
        this.closeEditExamModal();
      },
      error: (err: any) => {
        console.error(err);
        alert('Failed to update exam settings');
      }
    });
  }

  // --- Create Question directly in Builder ---

  openCreateQuestionModal() {
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
    this.savingQuestion = true;

    if (!this.newQuestion.content.text) {
      alert('Question text is required');
      this.savingQuestion = false;
      return;
    }

    // 1. Create Question in Bank
    this.questionsService.createQuestion(this.newQuestion).subscribe({
      next: (createdQuestion) => {
        // 2. Add to Exam immediately
        this.addQuestion(createdQuestion);

        this.savingQuestion = false;

        // Hide Modal
        if (typeof bootstrap !== 'undefined') {
          const modal = bootstrap.Modal.getInstance(document.getElementById('createQuestionModal'));
          modal.hide();
        }

        // Refresh Bank list
        this.allQuestions.unshift(createdQuestion);
        this.filterQuestions();
        this.extractTags();
        this.cdr.detectChanges();
      },
      error: (err) => {
        console.error(err);
        alert('Failed to create question.');
        this.savingQuestion = false;
      }
    });
  }
}
