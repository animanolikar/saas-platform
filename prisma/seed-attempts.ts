import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
    console.log('Seeding Student Attempts...');

    const studentEmail = 'student1@yukti.com';
    const user = await prisma.user.findUnique({ where: { email: studentEmail } });
    const org = await prisma.organization.findFirst();
    const exam = await prisma.exam.findFirst({ where: { title: 'Advanced Mathematics Finals' } });

    if (!user || !org || !exam) {
        console.error('Missing User, Org, or Exam. Run seed.ts first.');
        return;
    }

    // Trend: Increasing scores [40, 55, 60, 65, 75]
    const scores = [40, 55, 60, 65, 75];
    const dates = [
        new Date(Date.now() - 30 * 24 * 60 * 60 * 1000), // 30 days ago
        new Date(Date.now() - 25 * 24 * 60 * 60 * 1000),
        new Date(Date.now() - 15 * 24 * 60 * 60 * 1000),
        new Date(Date.now() - 10 * 24 * 60 * 60 * 1000),
        new Date(Date.now() - 2 * 24 * 60 * 60 * 1000),
    ];

    for (let i = 0; i < scores.length; i++) {
        const attempt = await prisma.examAttempt.create({
            data: {
                userId: user.id,
                examId: exam.id,
                organizationId: org.id,
                status: 'EVALUATED',
                startedAt: dates[i],
                submittedAt: new Date(dates[i].getTime() + 3600 * 1000),
                totalScore: scores[i],
                result: { passed: scores[i] >= 50, score: scores[i] }
            }
        });

        // Add dummy answers for Topic Analysis
        // We need questions with tags.
        // Let's fetch questions for this exam
        const examQuestions = await prisma.examQuestion.findMany({
            where: { examId: exam.id },
            include: { question: { include: { tags: { include: { tag: true } } } } },
            take: 20
        });

        for (const eq of examQuestions) {
            const isCorrect = Math.random() < (scores[i] / 100); // Rough probability based on score
            await prisma.attemptAnswer.create({
                data: {
                    attemptId: attempt.id,
                    questionId: eq.questionId,
                    isCorrect: isCorrect,
                    marksAwarded: isCorrect ? eq.marks : 0,
                    timeSpentMs: Math.floor(Math.random() * 60000) + 5000, // 5s to 65s
                }
            });
        }
        console.log(`Created attempt for ${dates[i].toISOString()} with score ${scores[i]}`);
    }
    console.log('Seeding Attempts Completed.');
}

main()
    .catch((e) => {
        console.error(e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });
