import { Component, OnInit, OnDestroy, ChangeDetectorRef, HostListener } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router } from '@angular/router';
import { ExamsService } from '../../../core/services/exams.service';
import { interval, Subscription } from 'rxjs';

@Component({
    selector: 'app-exam-runner',
    standalone: true,
    imports: [CommonModule],
    templateUrl: './exam-runner.component.html',
    styleUrls: ['./exam-runner.component.css']
})
export class ExamRunnerComponent implements OnInit, OnDestroy {
    examId: string | null = null;
    exam: any = null;
    loading = true;

    currentQuestionIndex = 0;
    answers: { [questionId: string]: string } = {}; // questionId -> optionId
    markedForReview: Set<string> = new Set(); // Set of questionIds

    timerSubscription: Subscription | null = null;
    timeRemaining = 0; // seconds

    // Time Tracking
    questionTimeMap: { [key: string]: number } = {}; // milliseconds
    currentQuestionStartTime: number = Date.now();

    // Proctoring
    warningCount = 0;
    maxWarnings = 3;
    isSubmitting = false;
    telemetryEvents: any[] = [];

    // Webcam
    isProctoringEnabled = false;
    cameraStream: MediaStream | null = null;
    cameraError = false;

    constructor(
        private route: ActivatedRoute,
        private router: Router,
        private examsService: ExamsService,
        private cdr: ChangeDetectorRef
    ) { }

    // 1. Prevent Refresh / Tab Close
    @HostListener('window:beforeunload', ['$event'])
    unloadNotification($event: any) {
        if (!this.isSubmitting) {
            $event.returnValue = "Are you sure? Your exam progress will be lost.";
        }
    }

    // 2. Detect Tab Switch / Focus Loss
    @HostListener('window:blur')
    onWindowBlur() {
        if (this.loading || this.isSubmitting) return;

        this.warningCount++;
        const remaining = this.maxWarnings - this.warningCount;

        // Log Event
        this.telemetryEvents.push({
            type: 'FOCUS_LOST',
            timestamp: new Date().toISOString(),
            warningCount: this.warningCount
        });

        if (this.warningCount >= this.maxWarnings) {
            alert('PROCTORING VIOLATION: You have switched tabs too many times. Your exam is being auto-submitted.');
            this.forceSubmit();
        } else {
            alert(`WARNING: Tab switching is NOT allowed!\n\nYou have ${remaining} warnings left before the exam is terminated.`);
        }
    }

    // 3. Disable Context Menu
    @HostListener('contextmenu', ['$event'])
    onRightClick(event: MouseEvent) {
        event.preventDefault();
    }

    // 4. Disable Copy/Paste
    @HostListener('copy', ['$event'])
    @HostListener('paste', ['$event'])
    blockCopyPaste(event: ClipboardEvent) {
        event.preventDefault();
        alert('Copy/Paste is disabled during the exam.');
    }

    // 5. Block Refresh Shortcuts (F5, Ctrl+R, Cmd+R)
    @HostListener('window:keydown', ['$event'])
    onKeyDown(event: KeyboardEvent) {
        if (
            (event.key === 'F5') ||
            (event.ctrlKey && event.key === 'r') ||
            (event.metaKey && event.key === 'r')
        ) {
            event.preventDefault();
            alert('Refreshing the page is disabled during the exam.');
        }
    }

    ngOnInit() {
        this.examId = this.route.snapshot.paramMap.get('id');
        if (this.examId) {
            this.loadExam();
        }
    }

    loadExam() {
        this.loading = true;
        this.examsService.startExam(this.examId!).subscribe({
            next: (data) => {
                this.exam = data;

                // RESTORE ANSWERS
                const savedAnswers = localStorage.getItem(`yukti_answers_${this.examId}`);
                if (savedAnswers) {
                    try {
                        this.answers = JSON.parse(savedAnswers);
                    } catch (e) {
                        console.error('Failed to restore answers', e);
                    }
                }

                // RESTORE MARKED FOR REVIEW
                const savedReview = localStorage.getItem(`yukti_review_${this.examId}`);
                if (savedReview) {
                    try {
                        const reviewArray = JSON.parse(savedReview);
                        this.markedForReview = new Set(reviewArray);
                    } catch (e) {
                        console.error('Failed to restore review state', e);
                    }
                }

                // Calculate remaining time based on server start time
                if (data.attemptStartTime) {
                    const startTime = new Date(data.attemptStartTime).getTime();
                    const now = new Date().getTime();
                    const elapsedSeconds = Math.floor((now - startTime) / 1000);
                    this.timeRemaining = data.durationSeconds - elapsedSeconds;
                } else {
                    this.timeRemaining = data.durationSeconds;
                }

                // Check Proctoring Settings
                if (this.exam.settings?.isProctoringEnabled) {
                    this.isProctoringEnabled = true;
                    this.initializeCamera();
                } else {
                    // Standard Timer Start
                    this.checkTimeAndStart();
                }

                this.loading = false;
                this.cdr.detectChanges();
            },
            error: (err) => {
                console.error('Failed to start exam', err);
                const msg = err.error?.message || 'Failed to start exam.';
                if (msg.includes('already submitted')) {
                    alert('You have already submitted this exam.');
                } else {
                    alert(msg);
                }
                this.router.navigate(['/student/dashboard']);
            }
        });
    }

    checkTimeAndStart() {
        if (this.timeRemaining <= 0) {
            this.timeRemaining = 0;
            alert('Time Expired! Submitting Exam...');
            this.submitExam();
        } else {
            this.startTimer();
        }
    }

    async initializeCamera() {
        try {
            this.cameraStream = await navigator.mediaDevices.getUserMedia({ video: true, audio: false });
            // Start timer ONLY after camera is ready
            this.checkTimeAndStart();

            // Monitor stream logic (basic)
            this.cameraStream.getVideoTracks()[0].onended = () => {
                alert('Camera disconnected! Please reconnect immediately.');
                // Ideally pause exam here, but for MVP just warn
            };
        } catch (err) {
            console.error('Camera access denied:', err);
            this.cameraError = true;
            alert('CRITICAL: Camera access is REQUIRED for this exam. Please allow camera access and refresh the page.');
        }
    }

    startTimer() {
        this.timerSubscription = interval(1000).subscribe(() => {
            if (this.timeRemaining > 0) {
                this.timeRemaining--;
                if (this.timeRemaining === 0) {
                    this.submitExam(); // Auto submit
                }
                this.cdr.detectChanges(); // Update timer UI
            }
        });
    }

    get formatTime() {
        const mins = Math.floor(this.timeRemaining / 60);
        const secs = this.timeRemaining % 60;
        return `${mins}:${secs < 10 ? '0' : ''}${secs}`;
    }

    selectOption(questionId: string, optionId: string) {
        this.answers[questionId] = optionId;
        // SAVE ANSWERS
        localStorage.setItem(`yukti_answers_${this.examId}`, JSON.stringify(this.answers));
    }

    toggleMarkForReview(questionId: string) {
        if (this.markedForReview.has(questionId)) {
            this.markedForReview.delete(questionId);
        } else {
            this.markedForReview.add(questionId);
        }
        // Save Review State
        localStorage.setItem(`yukti_review_${this.examId}`, JSON.stringify(Array.from(this.markedForReview)));
    }

    isMarkedForReview(questionId: string): boolean {
        return this.markedForReview.has(questionId);
    }

    isOptionSelected(questionId: string, optionId: string) {
        return this.answers[questionId] === optionId;
    }

    trackTime() {
        if (!this.exam) return;
        const currentQ = this.exam.questions[this.currentQuestionIndex];
        if (!currentQ) return;

        const now = Date.now();
        const duration = now - this.currentQuestionStartTime;
        this.questionTimeMap[currentQ.question.id] = (this.questionTimeMap[currentQ.question.id] || 0) + duration;
        this.currentQuestionStartTime = now;
    }

    nextQuestion() {
        if (this.currentQuestionIndex < this.exam.questions.length - 1) {
            this.trackTime();
            this.currentQuestionIndex++;
            this.currentQuestionStartTime = Date.now(); // Reset for next
        }
    }

    prevQuestion() {
        if (this.currentQuestionIndex > 0) {
            this.trackTime();
            this.currentQuestionIndex--;
            this.currentQuestionStartTime = Date.now(); // Reset for next
        }
    }

    submitExam() {
        if (!confirm('Are you sure you want to submit?')) return;
        this.forceSubmit();
    }

    forceSubmit() {
        if (this.isSubmitting) return; // Prevent double submit
        this.isSubmitting = true;

        this.trackTime(); // Capture final seconds

        const finalAnswers: any = {};
        if (this.exam && this.exam.questions) {
            this.exam.questions.forEach((q: any) => {
                const qid = q.question.id;
                finalAnswers[qid] = {
                    optionId: this.answers[qid] || null,
                    timeSpentMs: this.questionTimeMap[qid] || 0
                };
            });
        }

        this.examsService.submitExam(this.examId!, finalAnswers, this.telemetryEvents).subscribe({
            next: (res) => {
                console.log('Result:', res);
                // Clean up local storage
                localStorage.removeItem(`yukti_answers_${this.examId}`);

                const pass = res.result.passed ? 'PASSED' : 'FAILED';
                const percentage = res.result.percentage.toFixed(1);
                alert(`Exam Submitted!\n\nScore: ${res.totalScore} / ${res.result.maxMarks}\nGrade: ${pass} (${percentage}%)`);
                this.router.navigate(['/student/dashboard']);
            },
            error: (err) => {
                console.error('Submit error:', err);
                alert('Failed to submit exam.');
                this.router.navigate(['/student/dashboard']);
            }
        });
    }

    ngOnDestroy() {
        if (this.timerSubscription) {
            this.timerSubscription.unsubscribe();
        }
        if (this.cameraStream) {
            this.cameraStream.getTracks().forEach(track => track.stop());
        }
    }
}
