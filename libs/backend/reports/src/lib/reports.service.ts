import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '@saas-platform/prisma';
import { AiService } from '@saas-platform/backend-ai';
import { EmailService } from '@saas-platform/email';

@Injectable()
export class ReportsService {
    private readonly logger = new Logger(ReportsService.name);

    constructor(
        private prisma: PrismaService,
        private aiService: AiService,
        private emailService: EmailService
    ) { }

    async getStudentPerformanceTrend(userId: string) {
        // Fetch last 10 attempts sorted by date
        const attempts = await this.prisma.examAttempt.findMany({
            where: { userId, status: 'EVALUATED' },
            orderBy: { startedAt: 'asc' },
            take: 10,
            include: {
                exam: {
                    include: {
                        questions: true
                    }
                }
            }
        });

        let cumulativeObtained = 0;
        let cumulativeTotal = 0;

        const detailedTrends = attempts.map((a, index) => {
            // Guard against empty questions or zero marks
            const totalMarks = a.exam?.questions?.reduce((sum, q) => sum + (q.marks || 1), 0) || 100; // Default to 100 if completely missing
            const obtainedScore = a.totalScore || 0;

            cumulativeObtained += obtainedScore;
            cumulativeTotal += totalMarks;

            const percentage = totalMarks > 0 ? Math.round((obtainedScore / totalMarks) * 100) : 0;

            // Calculate Gain/Loss relative to previous exam
            let gainLoss = 'N/A';
            if (index > 0) {
                const prevAttempt = attempts[index - 1];
                const prevTotal = prevAttempt.exam?.questions?.reduce((sum, q) => sum + (q.marks || 1), 0) || 100;
                const prevScore = prevAttempt.totalScore || 0;
                const prevPercentage = prevTotal > 0 ? (prevScore / prevTotal) * 100 : 0;

                const diff = percentage - prevPercentage;
                gainLoss = diff > 0 ? `+${diff.toFixed(1)}%` : `${diff.toFixed(1)}%`;
            }

            return {
                examTitle: a.exam?.title || 'Unknown Exam',
                date: a.startedAt,
                score: obtainedScore,
                totalMarks: totalMarks,
                percentage: percentage,
                gainLoss: gainLoss
            };
        });

        return {
            trends: detailedTrends,
            cumulative: {
                totalObtained: cumulativeObtained,
                totalPossible: cumulativeTotal,
                overallPercentage: cumulativeTotal > 0 ? Math.round((cumulativeObtained / cumulativeTotal) * 100) : 0
            }
        };
    }

    async getTopicAnalysis(userId: string) {
        // Fetch all answers with question tags
        const answers = await this.prisma.attemptAnswer.findMany({
            where: { attempt: { userId, status: 'EVALUATED' } },
            include: {
                question: {
                    include: { tags: { include: { tag: true } } }
                }
            }
        });

        const topicStats: Record<string, { correct: number; total: number }> = {};

        answers.forEach(ans => {
            const tags = ans.question.tags.map(qt => qt.tag.name);
            tags.forEach(tag => {
                if (!topicStats[tag]) {
                    topicStats[tag] = { correct: 0, total: 0 };
                }
                topicStats[tag].total++;
                if (ans.isCorrect) {
                    topicStats[tag].correct++;
                }
            });
        });

        return Object.keys(topicStats).map(tag => ({
            tag,
            correct: topicStats[tag].correct,
            total: topicStats[tag].total,
            percentage: Math.round((topicStats[tag].correct / topicStats[tag].total) * 100)
        }));
    }
    async getDeepDiveMetrics(userId: string) {
        const answers = await this.prisma.attemptAnswer.findMany({
            where: { attempt: { userId, status: 'EVALUATED' } },
            include: { question: true }
        });

        // 1. Time Management Analysis (Avg Time per Difficulty)
        const timeByDifficulty: Record<string, { totalTime: number; count: number }> = { EASY: { totalTime: 0, count: 0 }, MEDIUM: { totalTime: 0, count: 0 }, HARD: { totalTime: 0, count: 0 } };

        // 2. Question Type Performance
        const typePerformance: Record<string, { correct: number; total: number }> = {};

        // 3. Guessing Behavior (e.g., < 10000ms for non-Easy questions)
        let potentialGuesses = 0;

        answers.forEach(ans => {
            const diff = ans.question.difficulty;
            if (timeByDifficulty[diff]) {
                timeByDifficulty[diff].totalTime += (ans.timeSpentMs || 0);
                timeByDifficulty[diff].count++;
            }

            const type = ans.question.type;
            if (!typePerformance[type]) typePerformance[type] = { correct: 0, total: 0 };
            typePerformance[type].total++;
            if (ans.isCorrect) typePerformance[type].correct++;

            // Simple Heuristic: Less than 5 seconds on Medium/Hard might be a guess
            if (ans.timeSpentMs < 5000 && diff !== 'EASY') {
                potentialGuesses++;
            }
        });

        const avgTimePerDifficulty = Object.keys(timeByDifficulty).map(k => ({
            difficulty: k,
            avgTimeSeconds: timeByDifficulty[k].count ? Math.round((timeByDifficulty[k].totalTime / timeByDifficulty[k].count) / 1000) : 0
        }));

        const typeAccuracy = Object.keys(typePerformance).map(k => ({
            type: k,
            accuracy: Math.round((typePerformance[k].correct / typePerformance[k].total) * 100)
        }));

        return {
            avgTimePerDifficulty,
            typeAccuracy,
            potentialGuesses,
            totalQuestionsAttempted: answers.length
        };
    }

    async getComprehensiveReport(userId: string) {
        // 1. Aggregating Data
        const trendData = await this.getStudentPerformanceTrend(userId);
        const trends = trendData.trends;
        const cumulative = trendData.cumulative;

        const topics = await this.getTopicAnalysis(userId);
        const deepDive = await this.getDeepDiveMetrics(userId);

        if (!userId) throw new Error('User ID is required.');
        const user = await this.prisma.user.findUnique({ where: { id: userId } });
        if (!user) throw new Error(`User not found for ID: ${userId}`);

        // Calculate Consistency (Standard Deviation of last 5 scores)
        const recentScores = trends.slice(-5).map(t => t.percentage);
        const mean = recentScores.reduce((a, b) => a + b, 0) / (recentScores.length || 1);
        const variance = recentScores.reduce((a, b) => a + Math.pow(b - mean, 2), 0) / (recentScores.length || 1);
        const stdDev = Math.sqrt(variance);
        const consistencyScore = 100 - Math.min(stdDev * 2, 100);

        // 2. Construct Prompt
        this.logger.log(`[DEBUG] Generating Report for User: ${user.email}`);
        this.logger.log(`[DEBUG] Trends Data: ${JSON.stringify(trends)}`);
        this.logger.log(`[DEBUG] Cumulative Data: ${JSON.stringify(cumulative)}`);

        const prompt = `
        Role: You are a World-Class Educational Mentor and Data Analyst, known for transforming struggling students into toppers ("Zero to Hero").
        Student: ${user?.firstName} ${user?.lastName}
        
        Data Summary:
        - Exam History (Detailed with Gain/Loss): ${JSON.stringify(trends)}
        - Cumulative Performance: Obtained ${cumulative.totalObtained} out of ${cumulative.totalPossible} (${cumulative.overallPercentage}%)
        - Consistency Score (0-100): ${consistencyScore.toFixed(0)}
        - Topic Strengths/Weaknesses: ${JSON.stringify(topics.slice(0, 5))}
        
        Deep Dive Metrics:
        - Time Management: ${JSON.stringify(deepDive.avgTimePerDifficulty)}
        - Accuracy by Type: ${JSON.stringify(deepDive.typeAccuracy)}
        - Potential Guessing: ${deepDive.potentialGuesses} occurrences

        Task: Write a HIGHLY COMPREHENSIVE, MOTIVATING, and DETAILED "Zero to Hero" Analysis Report (Markdown).
        
        Structure & Content Requirements:

        # 🚀 Executive Summary & Cumulative Insights
        - **Cumulative Analysis**: Explicitly state: "You have secured ${cumulative.totalObtained} marks out of a possible ${cumulative.totalPossible} across all exams."
        - Discuss the "Opportunity Gap" (${cumulative.totalPossible - cumulative.totalObtained} marks lost).
        - Mentor's Note on consistency.

        # 📊 Deep-Dive Test-by-Test Analysis
        - Iterate through the **last 3 exams**. For EACH:
            - **Title, Date, Score**
            - **Gain/Loss Verdict**: Use the calculated 'gainLoss' field (e.g., "${trends[trends.length - 1]?.gainLoss} jump/drop").
            - **Key Takeaway**: One specific observation.

        # 📈 The Big Picture: Trend Analysis
        - Analyze the trajectory based on the Gain/Loss patterns.
        
        # 🔮 AI Performance Prediction
        - Predict next 3 scores based on current average (${mean.toFixed(1)}%).
        
        # ⏱️ Behavioral & Time Analysis
        - Discuss speed and ${deepDive.potentialGuesses} potential guesses.

        # 🗺️ "Zero to Hero" Master Plan
        - Detailed roadmap with a 7-Day Study Schedule.
        - Specific drills for weak topics (from ${JSON.stringify(topics.slice(0, 3).map(t => t.tag))}).

        # 🏁 Final Encouragement
        - Powerful closing.
        
        Format: Rich Markdown. 8-10 pages depth.
        `;

        const reportContent = await this.aiService.generateReportMarkdown(prompt);

        // 3. Save Report to History
        await this.prisma.studentAnalyticsReport.create({
            data: {
                userId: user.id,
                content: reportContent,
                metadata: {
                    cumulativeObtained: cumulative.totalObtained,
                    cumulativeTotal: cumulative.totalPossible,
                    overallPercentage: cumulative.overallPercentage,
                    consistencyScore,
                    generatedAt: new Date()
                }
            }
        });

        // 4. Email the Report
        if (user.email) {
            this.logger.log(`[EMAIL] Sending AI Report to ${user.email}...`);
            this.emailService.sendAiReportEmail(user.email, user.firstName || 'Student', reportContent)
                .then(() => this.logger.log('[EMAIL] Report sent successfully'))
                .catch(err => this.logger.error('[EMAIL] Failed to send report', err));
        }

        return { content: reportContent };
    }

    async getReportHistory(userId: string) {
        return this.prisma.studentAnalyticsReport.findMany({
            where: { userId },
            orderBy: { createdAt: 'desc' },
            select: { id: true, createdAt: true, metadata: true }
        });
    }

    async getReportById(userId: string, reportId: string) {
        const report = await this.prisma.studentAnalyticsReport.findFirst({
            where: { id: reportId, userId }
        });
        if (!report) throw new Error('Report not found');
        return report;
    }
    async getDashboardSummary(userId: string) {
        const trendData = await this.getStudentPerformanceTrend(userId);
        const topics = await this.getTopicAnalysis(userId);

        const totalExams = trendData.trends.length;
        const avgScore = trendData.cumulative.overallPercentage;

        // Consistency Calculation
        const scores = trendData.trends.map(t => t.percentage);
        let consistency = 'N/A';
        if (scores.length > 1) {
            const mean = scores.reduce((a, b) => a + b, 0) / scores.length;
            const variance = scores.reduce((a, b) => a + Math.pow(b - mean, 2), 0) / scores.length;
            const stdDev = Math.sqrt(variance);
            if (stdDev < 5) consistency = 'High';
            else if (stdDev < 15) consistency = 'Medium';
            else consistency = 'Low';
        }

        // Strongest Subject
        let strongestSubject = 'N/A';
        if (topics.length > 0) {
            const sortedByMastery = [...topics].sort((a, b) => b.percentage - a.percentage);
            strongestSubject = sortedByMastery[0].tag;
        }

        // Avg Change (Last exam vs Average)
        let change = 0;
        if (scores.length > 1) {
            const lastScore = scores[scores.length - 1];
            const prevAvg = scores.slice(0, -1).reduce((a, b) => a + b, 0) / (scores.length - 1);
            change = Math.round(lastScore - prevAvg);
        }

        return {
            avgScore,
            totalExams,
            consistency,
            strongestSubject,
            change
        };
    }
    async getTestAnalysis(attemptId: string, forceRegenerate = false) {
        // 0. Check Cache (if not forced)
        if (!forceRegenerate) {
            const existingReport = await this.prisma.studentAnalyticsReport.findFirst({
                where: { metadata: { path: ['attemptId'], equals: attemptId } }
            });
            if (existingReport) return { content: existingReport.content };
        }

        // 1. Fetch Attempt Data
        const attempt = await this.prisma.examAttempt.findUnique({
            where: { id: attemptId },
            include: {
                exam: { include: { questions: { include: { question: { include: { tags: { include: { tag: true } } } } } } } },
                answers: { include: { question: { include: { tags: { include: { tag: true } } } } } },
                user: true
            }
        });

        if (!attempt) throw new Error('Attempt not found');

        // 2. Compute Metrics
        const totalQuestions = attempt.exam.questions.length;
        const correctAnswers = attempt.answers.filter(a => a.isCorrect).length;
        const accuracy = totalQuestions > 0 ? (correctAnswers / totalQuestions) * 100 : 0;

        let easyCorrect = 0, easyTotal = 0;
        let mediumCorrect = 0, mediumTotal = 0;
        let hardCorrect = 0, hardTotal = 0;

        attempt.answers.forEach(a => {
            const diff = a.question.difficulty;
            if (diff === 'EASY') { easyTotal++; if (a.isCorrect) easyCorrect++; }
            else if (diff === 'MEDIUM') { mediumTotal++; if (a.isCorrect) mediumCorrect++; }
            else if (diff === 'HARD') { hardTotal++; if (a.isCorrect) hardCorrect++; }
        });

        // 3. Question-Level Data & Signals
        const questionData = attempt.answers.map(a => {
            // Heuristics for Signals
            let signal = 'Concept Gap'; // Default
            if (!a.isCorrect) {
                if (a.timeSpentMs < 10000) signal = 'Guessing / Hasty';
                else if (a.question.difficulty === 'EASY' && a.timeSpentMs > 60000) signal = 'Overthinking';
                else if (attempt.exam.durationSeconds && attempt.startedAt && attempt.submittedAt && (new Date(attempt.submittedAt).getTime() - new Date(attempt.startedAt).getTime() > attempt.exam.durationSeconds * 1000 * 0.9)) signal = 'Time Pressure';
            }

            return {
                id: a.questionId,
                text: (a.question.content as any)?.text ? (a.question.content as any).text.substring(0, 100) + '...' : 'Question text missing',
                tag: a.question.tags.map(t => t.tag.name).join(', '),
                difficulty: a.question.difficulty,
                isCorrect: a.isCorrect,
                timeSpentSeconds: Math.round(a.timeSpentMs / 1000),
                signal: a.isCorrect ? 'Mastered' : signal
            };
        });

        // 4. Construct Prompt
        const prompt = `
        TEST-WISE AI DIAGNOSIS & IMPROVEMENT ANALYSIS
        
        SYSTEM ROLE
        You are an AI Learning Diagnostician for competitive exams.
        Your task is not to motivate, but to diagnose performance gaps and prescribe improvement actions using evidence from test data.
        
        INPUT CONTEXT
        Test Name: ${attempt.exam.title}
        Score: ${attempt.totalScore}
        Accuracy: ${accuracy.toFixed(1)}%
        
        Difficulty Breakdown (Correct/Total):
        - Easy: ${easyCorrect}/${easyTotal}
        - Medium: ${mediumCorrect}/${mediumTotal}
        - Hard: ${hardCorrect}/${hardTotal}

        Question Data (Sample of mistakes):
        ${JSON.stringify(questionData.filter(q => !q.isCorrect).slice(0, 15))}
        
        YOUR TASK
        Generate a strictly structured Test-wise Performance Analysis Report.
        
        OUTPUT STRUCTURE (STRICT)
        🔹 1. Test Overview
        Provide a concise factual summary.
        
        🔹 2. Where the Student Went Wrong (Diagnosis Map)
        A) Topic / Tag-wise Weakness
        B) Mistake Type Breakdown
        
        🔹 3. Root Cause Analysis (Important)
        Identify why mistakes occurred using evidence.
        
        🔹 4. Top 5 Mistakes That Cost Marks
        List high-impact mistakes. Use the Question Text snippet to identify the question, NOT the ID.
        Example: "In the question about 'Circular Motion...', you guessed..."
        
        🔹 5. Scope of Improvement (Actionable Plan)
        Specific topics to revise and practice count.
        
        🔹 6. Question-Wise AI Feedback (Only for Wrong Questions)
        Concise feedback for the wrong questions using Question Text for reference.
        
        🔹 7. Short-Term Improvement Plan (3–5 Days)
        Realistic plan.

        RULES
        - Do not praise or motivate.
        - Be analytical and evidence-driven.
        - NEVER refer to "Question ID". Always use the context/topic or text snippet.
        `;

        // 5. Generate with AI
        const reportContent = await this.aiService.generateReportMarkdown(prompt);

        // 6. Save
        await this.prisma.studentAnalyticsReport.create({
            data: {
                userId: attempt.userId,
                content: reportContent,
                metadata: {
                    type: 'TEST_WISE',
                    attemptId: attempt.id,
                    generatedAt: new Date()
                }
            }
        });

        // 7. Email
        if (attempt.user && attempt.user.email) {
            this.logger.log(`[EMAIL] Sending Test Diagnosis to ${attempt.user.email}`);
            // Assuming existing email service can handle generic templates or we reuse report email
            this.emailService.sendAiReportEmail(attempt.user.email, attempt.user.firstName || 'Student', reportContent)
                .catch(err => this.logger.error('Failed to email diagnosis', err));
        }

        return { content: reportContent };
    }
}
