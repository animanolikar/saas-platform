import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient() as any;

async function main() {
    console.log('Seeding Mobile Test Exam...');

    const orgSlug = 'yukti-academy';
    const studentEmail = 'student1@yukti.com';
    const examTitle = 'Mobile Test Exam - Maths';

    // 1. Get Org and Student
    const org = await prisma.organization.findUnique({ where: { slug: orgSlug } });
    if (!org) throw new Error('Organization not found. Run main seed first.');

    const student = await prisma.user.findUnique({ where: { email: studentEmail } });
    if (!student) throw new Error('Student not found. Run main seed first.');

    // 3. Define Exams Data
    const examsToCreate = [
        {
            title: 'Mobile Test Exam - Maths',
            subject: 'Maths',
            questions: [
                { text: 'What is 5 + 7?', opt: ['10', '12', '14', '15'], correct: 1 },
                { text: 'Square root of 144?', opt: ['10', '11', '12', '14'], correct: 2 },
                { text: '20 x 5 = ?', opt: ['100', '120', '80', '205'], correct: 0 }
            ]
        },
        {
            title: 'Mobile Test Exam - Physics',
            subject: 'Physics',
            questions: [
                { text: 'Unit of Force?', opt: ['Joule', 'Newton', 'Watt', 'Pascal'], correct: 1 },
                { text: 'Speed of Light?', opt: ['3x10^8 m/s', '300 km/h', '1000 m/s', 'Infinite'], correct: 0 },
                { text: 'F = ma is which law?', opt: ['1st', '2nd', '3rd', 'None'], correct: 1 }
            ]
        },
        {
            title: 'Mobile Test Exam - Chemistry',
            subject: 'Chemistry',
            questions: [
                { text: 'Symbol for Gold?', opt: ['Ag', 'Au', 'Fe', 'Pt'], correct: 1 },
                { text: 'pH of Water?', opt: ['5', '7', '9', '14'], correct: 1 },
                { text: 'H2O is?', opt: ['Salt', 'Water', 'Acid', 'Base'], correct: 1 }
            ]
        },
        {
            title: 'Mobile Test Exam - History',
            subject: 'History',
            questions: [
                { text: 'First Man on Moon?', opt: ['Buzz', 'Neil', 'Yuri', 'Michael'], correct: 1 },
                { text: 'WW2 End Year?', opt: ['1940', '1944', '1945', '1950'], correct: 2 },
                { text: 'Pyramids are in?', opt: ['Rome', 'Paris', 'Egypt', 'India'], correct: 2 }
            ]
        },
        {
            title: 'Mobile Test Exam - Logic',
            subject: 'Logic',
            questions: [
                { text: 'A is B, B is C. Is A C?', opt: ['Yes', 'No', 'Maybe', 'Unknown'], correct: 0 },
                { text: 'Next: 2, 4, 8, ...', opt: ['10', '12', '16', '14'], correct: 2 },
                { text: 'Odd one out?', opt: ['Apple', 'Banana', 'Carrot', 'Grape'], correct: 2 }
            ]
        }
    ];

    for (const examData of examsToCreate) {
        // Clean up existing
        const existingExam = await prisma.exam.findFirst({ where: { organizationId: org.id, title: examData.title } });
        if (existingExam) {
            console.log(`Cleaning up old ${examData.title}...`);
            // 1. Find attempts to clean their children
            const attempts = await prisma.examAttempt.findMany({ where: { examId: existingExam.id } });
            const attemptIds = attempts.map((a: any) => a.id);

            if (attemptIds.length > 0) {
                await prisma.attemptAnswer.deleteMany({ where: { attemptId: { in: attemptIds } } });
                await prisma.attemptTelemetry.deleteMany({ where: { attemptId: { in: attemptIds } } });
                await prisma.examAttempt.deleteMany({ where: { examId: existingExam.id } });
            }

            await prisma.examAssignment.deleteMany({ where: { examId: existingExam.id } });
            await prisma.examQuestion.deleteMany({ where: { examId: existingExam.id } });
            await prisma.exam.delete({ where: { id: existingExam.id } });
        }

        // Create Exam
        const exam = await prisma.exam.create({
            data: {
                organizationId: org.id,
                title: examData.title,
                description: `Quick 3-question test on ${examData.subject} for mobile testing.`,
                durationSeconds: 300,
                passPercentage: 40.0,
                status: 'PUBLISHED' as any,
                settings: { shuffleQuestions: false, showResults: true }
            }
        });

        console.log(`Created: ${exam.title}`);

        // Create Questions
        let order = 1;
        for (const qData of examData.questions) {
            const q = await prisma.question.create({
                data: {
                    organizationId: org.id,
                    content: { text: qData.text },
                    type: 'MCQ_SINGLE' as any,
                    difficulty: 'EASY' as any,
                    status: 'APPROVED' as any,
                    options: {
                        create: qData.opt.map((txt, idx) => ({
                            text: txt,
                            isCorrect: idx === qData.correct,
                            order: idx
                        }))
                    }
                }
            });

            await prisma.examQuestion.create({
                data: {
                    examId: exam.id,
                    questionId: q.id,
                    order: order++,
                    marks: 4,
                    negativeMarks: 1
                }
            });
        }

        // Assign to Student
        await prisma.examAssignment.create({
            data: {
                examId: exam.id,
                userId: student.id,
                assignedBy: org.id
            }
        });
        console.log(`  -> Assigned to student`);
    }

    console.log('Seed Complete! 5 Exams Created. 🚀');
}

main()
    .catch((e) => {
        console.error(e);
        // process.exit(1);
        throw e;
    })
    .finally(async () => {
        await prisma.$disconnect();
    });
