import { Injectable, BadRequestException, NotFoundException } from '@nestjs/common';
import { PrismaService } from '@saas-platform/prisma';
import { AiService } from '@saas-platform/backend-ai';
import { EmailService } from '@saas-platform/email';

@Injectable()
export class ExamsService {
    constructor(
        private prisma: PrismaService,
        private aiService: AiService,
        private emailService: EmailService
    ) { }

    async create(orgId: string, data: any) {
        return (this.prisma as any).exam.create({
            data: {
                organizationId: orgId,
                title: data.title,
                description: data.description,
                instructions: data.instructions,
                durationSeconds: data.durationSeconds || 3600,
                passPercentage: data.passPercentage || 40.0,
                scheduledAt: data.scheduledAt ? new Date(data.scheduledAt) : null,
                status: 'DRAFT',
                settings: data.settings || {},
            },
        });
    }

    async findAll(orgId: string) {
        return (this.prisma as any).exam.findMany({
            where: { organizationId: orgId },
            orderBy: { createdAt: 'desc' },
            include: {
                _count: {
                    select: { questions: true, attempts: true },
                },
            },
        });
    }

    async findOne(orgId: string, id: string) {
        const exam = await (this.prisma as any).exam.findFirst({
            where: { id, organizationId: orgId },
            include: {
                sections: {
                    orderBy: { order: 'asc' },
                    include: {
                        questions: {
                            orderBy: { order: 'asc' },
                            include: { question: true },
                        },
                    },
                },
                questions: {
                    where: { sectionId: null }, // Questions not in a section
                    orderBy: { order: 'asc' },
                    include: { question: true },
                },
                attempts: { // Needed if we want to check previous attempts easily
                    select: { id: true, userId: true, status: true, startedAt: true }
                }
            },
        });
        if (!exam) throw new BadRequestException('Exam not found');
        return exam;
    }

    async startExam(orgId: string, examId: string, userId: string) {
        // 1. Fetch Exam
        const exam = await this.prisma.exam.findFirst({
            where: { id: examId, organizationId: orgId },
            include: {
                questions: {
                    include: {
                        question: {
                            include: { options: true }
                        }
                    },
                    orderBy: { order: 'asc' }
                }
            }
        });

        if (!exam) throw new NotFoundException('Exam not found');
        if (exam.status !== 'PUBLISHED') throw new BadRequestException('Exam is not published');

        // CHECK SCHEDULING
        if (exam.scheduledAt && new Date() < new Date(exam.scheduledAt)) {
            throw new BadRequestException(`This exam is scheduled for ${new Date(exam.scheduledAt).toLocaleString()}. You cannot start it yet.`);
        }

        // 2. Check for Existing Attempts
        const userAttempts = await this.prisma.examAttempt.findMany({
            where: {
                examId: examId,
                userId: userId
            },
            orderBy: { startedAt: 'desc' }
        });

        const inProgressAttempt = userAttempts.find(a => a.status === 'IN_PROGRESS');
        const submittedAttemptsCount = userAttempts.filter(a => a.status === 'SUBMITTED' || a.status === 'EVALUATED').length;

        const settings = exam.settings as any;
        const maxAttempts = settings?.maxAttempts ? parseInt(settings.maxAttempts, 10) : 0;

        // Block if no attempt in progress and limit reached
        if (!inProgressAttempt && maxAttempts > 0 && submittedAttemptsCount >= maxAttempts) {
            throw new BadRequestException(`You have reached the maximum number of attempts (${maxAttempts}) for this exam.`);
        }

        // Also respect the old default logic: if unlimited (0) but allowResume is false, 
        // we might want to be careful. But strictly following maxAttempts is better.
        // Assuming unlimited = 0 means infinite attempts. But if we must resume only, it's fine.

        let attempt = inProgressAttempt;

        // 3. Create new attempt if none exists (and none submitted)
        if (!attempt) {
            attempt = await this.prisma.examAttempt.create({
                data: {
                    organization: { connect: { id: orgId } },
                    exam: { connect: { id: examId } },
                    user: { connect: { id: userId } },
                    status: 'IN_PROGRESS',
                    startedAt: new Date()
                }
            });
        }

        // 4. Sanitize (Remove isCorrect)
        const sanitizedExam = {
            ...exam,
            questions: exam.questions.map(eq => ({
                ...eq,
                question: {
                    ...eq.question,
                    options: eq.question.options.map(o => ({
                        id: o.id,
                        text: o.text,
                        order: o.order
                        // isCorrect removed
                    }))
                }
            })),
            attemptId: attempt.id,
            attemptStartTime: attempt.startedAt // Return start time for timer sync
        };

        return sanitizedExam;
    }

    async saveAttemptProgress(orgId: string, userId: string, examId: string, answers: { [key: string]: string }) {
        // 1. Verify Attempt Exists and is IN_PROGRESS
        const attempt = await this.prisma.examAttempt.findFirst({
            where: {
                examId: examId,
                userId: userId,
                status: 'IN_PROGRESS'
            }
        });

        if (!attempt) {
            // No active attempt to save
            return null;
        }

        // 2. Fetch Questions to map IDs
        const exam = await this.prisma.exam.findFirst({
            where: { id: examId },
            include: { questions: { include: { question: { include: { options: true } } } } }
        });
        if (!exam) return null;

        // 3. Upsert Answers
        // We do this by iterating and using upsert or delete/create. 
        // For efficiency in MVP, we can iterate.
        for (const eq of exam.questions) {
            const answerPayload = answers[eq.question.id] as any;
            if (!answerPayload) continue; // No answer for this Q

            const submittedOptionId = (typeof answerPayload === 'object' && answerPayload !== null) ? answerPayload.optionId : answerPayload;
            const timeSpentMs = (typeof answerPayload === 'object' && answerPayload !== null) ? (answerPayload.timeSpentMs || 0) : 0;

            // Check correctness merely for storage (not grading yet, or pre-grade?)
            // We can pre-calculate or just store raw. Let's store.
            let isCorrect = false;
            let marksAwarded = 0;
            if (submittedOptionId) {
                const selectedOption = eq.question.options.find(o => o.id === submittedOptionId);
                if (selectedOption && selectedOption.isCorrect) {
                    isCorrect = true;
                    marksAwarded = eq.marks;
                } else {
                    marksAwarded = -eq.negativeMarks;
                }
            }

            // Find existing answer record
            const existingAnswer = await this.prisma.attemptAnswer.findFirst({
                where: { attemptId: attempt.id, questionId: eq.question.id }
            });

            if (existingAnswer) {
                await this.prisma.attemptAnswer.update({
                    where: { id: existingAnswer.id },
                    data: {
                        selectedOptionId: submittedOptionId || null,
                        timeSpentMs: timeSpentMs,
                        isCorrect, // Optional update
                        marksAwarded // Optional update
                    }
                });
            } else {
                await this.prisma.attemptAnswer.create({
                    data: {
                        attemptId: attempt.id,
                        questionId: eq.question.id,
                        selectedOptionId: submittedOptionId || null,
                        timeSpentMs: timeSpentMs,
                        isCorrect,
                        marksAwarded
                    }
                });
            }
        }

        return { success: true };
    }

    async submitExam(orgId: string, userId: string, examId: string, answers: { [key: string]: string }, telemetry: any[]) {
        console.log('Service: submitting exam', { orgId, userId, examId, answersKeys: Object.keys(answers), telemetryEvents: telemetry?.length });

        // 1. Fetch Exam with Correct Answers
        const exam = await this.prisma.exam.findFirst({
            where: { id: examId, organizationId: orgId },
            include: {
                questions: {
                    include: {
                        question: {
                            include: { options: true }
                        }
                    }
                }
            }
        });

        if (!exam) throw new NotFoundException('Exam not found');

        let totalScore = 0;
        let totalMaxMarks = 0;
        const attemptAnswersData = [];

        // 2. Calculate Score
        for (const eq of exam.questions) {
            totalMaxMarks += eq.marks;

            // Handle both simple string (old) and object (new) answer formats
            const answerPayload = answers[eq.question.id] as any;
            const submittedOptionId = (typeof answerPayload === 'object' && answerPayload !== null) ? answerPayload.optionId : answerPayload;
            const timeSpentMs = (typeof answerPayload === 'object' && answerPayload !== null) ? (answerPayload.timeSpentMs || 0) : 0;

            let isCorrect = false;
            let marksAwarded = 0;

            if (submittedOptionId) {
                // Find selected option
                const selectedOption = eq.question.options.find(o => o.id === submittedOptionId);
                if (selectedOption && selectedOption.isCorrect) {
                    isCorrect = true;
                    marksAwarded = eq.marks;
                } else {
                    marksAwarded = -eq.negativeMarks;
                }
            }

            // --- AI MATRIX LOGIC (Deterministic Fallback) ---
            let aiScore = 0;
            let aiFeedback = '';
            const difficulty = eq.question.difficulty; // EASY, MEDIUM, HARD

            if (isCorrect) {
                if (difficulty === 'HARD') aiScore = 100;
                else if (difficulty === 'MEDIUM') aiScore = 90;
                else { // EASY
                    if (timeSpentMs > 120000) aiScore = 70;
                    else aiScore = 80;
                }
            } else {
                if (difficulty === 'EASY') aiScore = 20;
                else if (difficulty === 'MEDIUM') aiScore = 40;
                else { // HARD
                    if (timeSpentMs < 5000 && timeSpentMs > 0) aiScore = 10;
                    else aiScore = 60;
                }
            }
            // -----------------------

            totalScore += marksAwarded;

            attemptAnswersData.push({
                questionId: eq.question.id,
                selectedOptionId: submittedOptionId || null,
                isCorrect,
                marksAwarded,
                timeSpentMs,
                aiScore,
                aiFeedback // Initial Matrix Feedback
            });
        }

        // 3. Update Existing Attempt (or Create if missing)
        const activeAttempt = await this.prisma.examAttempt.findFirst({
            where: { examId, userId, status: 'IN_PROGRESS' },
            orderBy: { startedAt: 'desc' }
        });

        let attempt;
        const resultData = {
            passed: totalScore >= (totalMaxMarks * (exam.passPercentage / 100)),
            maxMarks: totalMaxMarks,
            percentage: totalMaxMarks > 0 ? (totalScore / totalMaxMarks) * 100 : 0
        };

        if (activeAttempt) {
            attempt = await this.prisma.examAttempt.update({
                where: { id: activeAttempt.id },
                data: {
                    status: 'SUBMITTED',
                    submittedAt: new Date(),
                    totalScore: totalScore,
                    result: resultData,
                    answers: {
                        create: attemptAnswersData
                    },
                    telemetry: telemetry ? {
                        create: { events: telemetry }
                    } : undefined
                },
                include: { answers: true }
            });
        } else {
            // Fallback Create
            attempt = await this.prisma.examAttempt.create({
                data: {
                    organizationId: orgId,
                    examId: examId,
                    userId: userId,
                    status: 'SUBMITTED',
                    startedAt: new Date(Date.now() - 1000),
                    submittedAt: new Date(),
                    totalScore: totalScore,
                    result: resultData,
                    answers: {
                        create: attemptAnswersData
                    },
                    telemetry: telemetry ? {
                        create: { events: telemetry }
                    } : undefined
                },
                include: { answers: true }
            });
        }

        // 4. Trigger Deep AI Analysis (Background / Fire-and-Forget)
        // Check if explicitly disabled (default was originally true)
        const isAiEnabled = (exam.settings as any)?.isAiAnalysisEnabled !== false;

        if (isAiEnabled) {
            // We do not await this to ensure fast response time for 100+ questions
            this.processDeepAiAnalysis(attempt.id, exam.questions, answers).catch(err => {
                console.error("Background AI Processing Failed:", err);
            });
        }

        return attempt;
    }

    /**
     * Async Background Process for Deep AI Insights
     */
    private async processDeepAiAnalysis(attemptId: string, examQuestions: any[], userAnswers: any) {
        this.aiService['logger'].log(`🚀 Starting Background AI Analysis for Attempt: ${attemptId} (${examQuestions.length} Qs)`);

        for (const eq of examQuestions) {
            const answerPayload = userAnswers[eq.question.id] as any;
            const submittedOptionId = (typeof answerPayload === 'object' && answerPayload !== null) ? answerPayload.optionId : answerPayload;

            const isCorrect = submittedOptionId ? eq.question.options.find((o: any) => o.id === submittedOptionId)?.isCorrect : false;
            const difficulty = eq.question.difficulty;

            // Call AI
            const aiInsight = await this.aiService.generateInsight(
                (eq.question.content as any)?.text || (eq.question.content as any)?.en || 'Question content',
                submittedOptionId ? (eq.question.options.find((o: any) => o.id === submittedOptionId)?.text || 'Unknown') : 'No Answer',
                eq.question.options.find((o: any) => o.isCorrect)?.text || 'Answer',
                eq.question.explanation || 'No explanation provided.',
                difficulty,
                isCorrect || false
            );

            if (aiInsight) {
                // Find and Update Answer Record
                const answerRecord = await this.prisma.attemptAnswer.findFirst({
                    where: {
                        attemptId: attemptId,
                        questionId: eq.question.id
                    }
                });

                if (answerRecord) {
                    await this.prisma.attemptAnswer.update({
                        where: { id: answerRecord.id },
                        data: { aiFeedback: aiInsight }
                    });
                }
            }
        }
        this.aiService['logger'].log(`🏁 Background AI Analysis Complete for Attempt: ${attemptId}`);
    }

    async getStudentHistory(orgId: string, userId: string) {
        return this.prisma.examAttempt.findMany({
            where: {
                organizationId: orgId,
                userId: userId,
                status: { in: ['SUBMITTED', 'EVALUATED'] }
            },
            include: {
                exam: {
                    select: { title: true, durationSeconds: true }
                },
                _count: {
                    select: { answers: true }
                }
            },
            orderBy: { startedAt: 'desc' }
        });
    }

    async update(orgId: string, id: string, data: any) {
        const exam = await this.findOne(orgId, id);
        return (this.prisma as any).exam.update({
            where: { id: exam.id },
            data: {
                title: data.title,
                description: data.description,
                instructions: data.instructions,
                durationSeconds: data.durationSeconds,
                passPercentage: data.passPercentage,
                scheduledAt: data.scheduledAt ? new Date(data.scheduledAt) : data.scheduledAt === null ? null : undefined, // Handle null to clear it
                status: data.status,
                settings: data.settings || undefined,
            },
        });
    }


    async createSection(orgId: string, examId: string, data: any) {
        await this.findOne(orgId, examId);
        return (this.prisma as any).examSection.create({
            data: {
                examId,
                title: data.title,
                description: data.description,
                order: data.order || 0,
                durationSeconds: data.durationSeconds,
                cutoffMarks: data.cutoffMarks,
            },
        });
    }

    async updateSection(orgId: string, sectionId: string, data: any) {
        // Validate ownership via Exam
        const section = await (this.prisma as any).examSection.findFirst({
            where: { id: sectionId },
            include: { exam: true }
        });
        if (!section || section.exam.organizationId !== orgId) throw new NotFoundException('Section not found');

        return (this.prisma as any).examSection.update({
            where: { id: sectionId },
            data: {
                title: data.title,
                description: data.description,
                order: data.order,
                durationSeconds: data.durationSeconds,
                cutoffMarks: data.cutoffMarks,
            },
        });
    }

    async deleteSection(orgId: string, sectionId: string) {
        console.log(`Attempting to delete section: ${sectionId} for org: ${orgId}`);
        // Validate ownership via Exam
        const section = await (this.prisma as any).examSection.findFirst({
            where: { id: sectionId },
            include: { exam: true }
        });

        if (!section) {
            console.error(`Section not found: ${sectionId}`);
            // DEBUG: List all sections for this org/exam to see what exists
            const allSections = await (this.prisma as any).examSection.findMany({
                take: 10,
                select: { id: true, title: true, examId: true }
            });
            console.log('DEBUG: Available sections in DB:', JSON.stringify(allSections, null, 2));

            throw new NotFoundException('Section not found');
        }

        if (section.exam.organizationId !== orgId) {
            console.error(`Org mismatch: ${section.exam.organizationId} vs ${orgId}`);
            throw new NotFoundException('Section not found');
        }

        try {
            // Optional: Move questions to default (null section) or delete them?
            await (this.prisma as any).examQuestion.updateMany({
                where: { sectionId: sectionId },
                data: { sectionId: null }
            });

            return await (this.prisma as any).examSection.delete({
                where: { id: sectionId },
            });
        } catch (error) {
            console.error('Delete Section Error:', error);
            throw error;
        }
    }

    async reorderQuestions(orgId: string, examId: string, sectionId: string | null, questionIds: string[]) {
        // Validate ownership
        await this.findOne(orgId, examId);

        return this.prisma.$transaction(async (tx) => {
            const promises = questionIds.map((id, index) => {
                return (tx as any).examQuestion.update({
                    where: { id },
                    data: { order: index + 1 }
                });
            });
            await Promise.all(promises);
        });
    }

    async addQuestion(orgId: string, examId: string, data: any) {
        await this.findOne(orgId, examId);

        // Check for duplicates
        const existing = await (this.prisma as any).examQuestion.findFirst({
            where: {
                examId: examId,
                questionId: data.questionId
            }
        });

        if (existing) {
            // Already added, maybe verify section?
            // For now, prevent adding same question twice
            throw new BadRequestException('Question already added to this exam');
        }

        return (this.prisma as any).examQuestion.create({
            data: {
                examId,
                questionId: data.questionId,
                sectionId: data.sectionId || null, // Allow Section ID
                marks: data.marks || 1,
                negativeMarks: data.negativeMarks || 0,
                order: data.order || 0,
            },
        });
    }

    async removeQuestion(orgId: string, examId: string, examQuestionId: string) {
        await this.findOne(orgId, examId);
        const eq = await (this.prisma as any).examQuestion.findFirst({
            where: { id: examQuestionId, examId },
        });
        if (!eq) throw new BadRequestException('Question not assigned to this exam');

        return (this.prisma as any).examQuestion.delete({
            where: { id: examQuestionId },
        });
    }

    async getExamAttempts(orgId: string, examId: string) {
        await this.findOne(orgId, examId);
        return this.prisma.examAttempt.findMany({
            where: { examId },
            include: {
                user: {
                    select: { id: true, firstName: true, lastName: true, email: true }
                },
                _count: { select: { answers: true } }
            },
            orderBy: { submittedAt: 'desc' }
        });
    }

    async getAttemptDetails(orgId: string, attemptId: string) {
        const attempt = await this.prisma.examAttempt.findUnique({
            where: { id: attemptId },
            include: {
                exam: {
                    include: { questions: { include: { question: { include: { options: true } } } } }
                },
                user: { select: { firstName: true, lastName: true, email: true } },
                answers: true,
                telemetry: true
            }
        });

        if (!attempt) throw new NotFoundException('Attempt not found');
        if (attempt.organizationId !== orgId) throw new BadRequestException('Access denied');

        return attempt;
    }

    async getDashboardStats(orgId: string) {
        const [userCount, examCount, attemptCount, recentAttempts] = await Promise.all([
            (this.prisma as any).user.count({ where: { organizationId: orgId } }),
            (this.prisma as any).exam.count({ where: { organizationId: orgId, status: 'PUBLISHED' } }),
            (this.prisma as any).examAttempt.count({ where: { organizationId: orgId, status: 'SUBMITTED' } }),
            (this.prisma as any).examAttempt.findMany({
                where: { organizationId: orgId, status: 'SUBMITTED' },
                take: 5,
                orderBy: { submittedAt: 'desc' },
                include: {
                    user: { select: { firstName: true, lastName: true } },
                    exam: { select: { title: true } }
                }
            })
        ]);

        return {
            totalUsers: userCount,
            activeExams: examCount,
            testsCompleted: attemptCount,
            recentActivity: recentAttempts.map((a: any) => ({
                action: 'Exam Submitted',
                details: `${a.user.firstName} ${a.user.lastName} submitted ${a.exam.title}`,
                time: a.submittedAt
            })),
            systemHealth: {
                activeSessions: Math.floor(Math.random() * 50) + 10, // Simulated active users
                serverLoad: Math.floor(Math.random() * 30) + 20      // Simulated CPU load %
            }
        };
    }

    async getAllActivity(orgId: string) {
        const attempts = await this.prisma.examAttempt.findMany({
            where: { organizationId: orgId, status: 'SUBMITTED' },
            orderBy: { submittedAt: 'desc' },
            take: 100, // Limit to last 100 for now
            include: {
                user: { select: { firstName: true, lastName: true, email: true } },
                exam: { select: { title: true } }
            }
        });

        return attempts.map((a: any) => ({
            id: a.id,
            action: 'Exam Submitted',
            details: `${a.user.firstName} ${a.user.lastName} submitted ${a.exam.title}`,
            user: `${a.user.firstName} ${a.user.lastName}`,
            exam: a.exam.title,
            time: a.submittedAt,
            score: a.totalScore
        }));
    }

    async assignExamToTargets(orgId: string, examId: string, teamIds: string[], userIds: string[], assignedBy: string) {
        // 1. Fetch Exam Metadata
        const exam = await this.findOne(orgId, examId);

        const assignments = [];
        const emailsToSend: { email: string, firstName: string }[] = [];

        // 2. Process Team Assignments
        if (teamIds && teamIds.length > 0) {
            for (const teamId of teamIds) {
                assignments.push({
                    examId,
                    teamId,
                    userId: null,
                    assignedBy
                });

                // Fetch Team Members for Email
                const teamMembers = await (this.prisma as any).teamMember.findMany({
                    where: { teamId },
                    include: { user: { select: { email: true, firstName: true } } }
                });

                teamMembers.forEach((tm: any) => {
                    if (tm.user && tm.user.email) {
                        emailsToSend.push({ email: tm.user.email, firstName: tm.user.firstName || 'Student' });
                    }
                });
            }
        }

        // 3. Process User Assignments
        if (userIds && userIds.length > 0) {
            for (const userId of userIds) {
                assignments.push({
                    examId,
                    teamId: null,
                    userId,
                    assignedBy
                });

                // Fetch User for Email
                const user = await (this.prisma as any).user.findUnique({
                    where: { id: userId },
                    select: { email: true, firstName: true }
                });

                if (user && user.email) {
                    emailsToSend.push({ email: user.email, firstName: user.firstName || 'Student' });
                }
            }
        }

        if (assignments.length === 0) return { count: 0 };

        // 4. Save Assignments
        const result = await (this.prisma as any).examAssignment.createMany({
            data: assignments,
            skipDuplicates: true
        });

        // 5. Send Emails (Fire and Forget)
        const frontendUrl = process.env['FRONTEND_URL'] ||
            (process.env['NODE_ENV'] === 'development' ? 'http://localhost:4200' : 'http://brahmand.co');
        const examLink = `${frontendUrl}/student/exam/${examId}/start`;

        // Deduplicate emails first
        const uniqueEmails = new Map<string, string>();
        emailsToSend.forEach(e => uniqueEmails.set(e.email, e.firstName));

        for (const [email, firstName] of uniqueEmails) {
            this.emailService.sendExamAssignmentEmail(email, firstName, exam.title, examLink).catch(err => {
                console.error(`Failed to send assignment email to ${email}`, err);
            });
        }

        return result;
    }

    async getAvailableExamsForStudent(orgId: string, userId: string) {
        // 1. Get user's teams
        const userTeams = await (this.prisma as any).teamMember.findMany({
            where: { userId },
            select: { teamId: true }
        });
        const teamIds = userTeams.map((t: any) => t.teamId);

        // 2. Find Assignments matching User OR Team
        // We want exams that are PUBLISHED and assigned
        return (this.prisma as any).exam.findMany({
            where: {
                organizationId: orgId,
                status: 'PUBLISHED',
                assignments: {
                    some: {
                        OR: [
                            { userId: userId },
                            { teamId: { in: teamIds } }
                        ]
                    }
                }
            },
            include: {
                _count: {
                    select: { questions: true }
                },
                // Include attempt status to show "Start" vs "Resume" vs "Result"
                attempts: {
                    where: { userId: userId },
                    orderBy: { startedAt: 'desc' },
                    select: { id: true, status: true, totalScore: true, result: true, startedAt: true, submittedAt: true }
                }
            },
            orderBy: { createdAt: 'desc' }
        });
    }

    async getExamAssignments(orgId: string, examId: string) {
        // Get all assignments for this exam
        return (this.prisma as any).examAssignment.findMany({
            where: { examId },
            include: {
                team: { select: { id: true, name: true } },
                user: { select: { id: true, firstName: true, lastName: true, email: true } }
            }
        });
    }

    async removeAssignment(orgId: string, assignmentId: string) {
        // Verify ownership indirectly via deletion attempt or fetch
        const assignment = await (this.prisma as any).examAssignment.findUnique({
            where: { id: assignmentId },
            include: { exam: true }
        });

        if (!assignment || assignment.exam.organizationId !== orgId) {
            throw new NotFoundException('Assignment not found');
        }

        return (this.prisma as any).examAssignment.delete({
            where: { id: assignmentId }
        });
    }
    async getExamStats(orgId: string, examId: string) {
        // 1. Fetch Exam for context (pass percentage, questions for max marks)
        const exam = await this.findOne(orgId, examId);

        let totalMaxMarks = 0;
        // Calculate total marks from questions
        // Note: This assumes current current exam state. 
        // Ideally maxMarks is snapshotted in attempt, but for aggregate we use current.
        // Or we use the maxMarks stored in the attempt result if consistent.
        // Let's rely on attempt.result.maxMarks if available, or fallback.

        // 2. Fetch all COMPLETED attempts
        const attempts = await this.prisma.examAttempt.findMany({
            where: {
                examId: examId,
                status: 'SUBMITTED'
            },
            select: {
                totalScore: true,
                result: true
            }
        });

        const totalAttempts = attempts.length;
        if (totalAttempts === 0) {
            return {
                averageScore: 0,
                highestScore: 0,
                passRate: 0,
                totalAttempts: 0,
                passedCount: 0
            };
        }

        // 3. Calculate Stats
        const sumScore = attempts.reduce((acc: number, curr: any) => acc + (curr.totalScore || 0), 0);
        const maxScore = Math.max(...attempts.map((a: any) => a.totalScore || 0));

        // Count passed
        // We trust the 'passed' boolean in the result JSON if it exists
        const passedCount = attempts.filter((a: any) =>
            (a.result && (a.result as any).passed === true)
        ).length;

        return {
            averageScore: totalAttempts > 0 ? (sumScore / totalAttempts) : 0,
            highestScore: maxScore,
            passRate: totalAttempts > 0 ? (passedCount / totalAttempts) * 100 : 0,
            totalAttempts,
            passedCount
        };
    }
}
