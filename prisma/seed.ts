import { PrismaClient, UserRole, QuestionType, DifficultyLevel, QuestionStatus } from '@prisma/client';
import * as argon2 from 'argon2';

const prisma = new PrismaClient() as any;

async function main() {
    console.log('Seeding database...');

    // 1. Create Organization
    const orgName = 'Yukti Academy';
    const orgSlug = 'yukti-academy';

    let org = await prisma.organization.findUnique({ where: { slug: orgSlug } });

    if (!org) {
        org = await prisma.organization.create({
            data: {
                name: orgName,
                slug: orgSlug,
            },
        });
        console.log(`Created Organization: ${org.name} (${org.id})`);
    } else {
        console.log(`Organization already exists: ${org.name}`);
    }

    // 2. Create Org Admin
    const adminEmail = 'admin@yukti.com';
    const adminPassword = await argon2.hash('password123');

    const admin = await prisma.user.upsert({
        where: { email: adminEmail },
        update: {},
        create: {
            email: adminEmail,
            firstName: 'Admin',
            lastName: 'User',
            passwordHash: adminPassword,
            role: UserRole.ORG_ADMIN,
            organizationId: org.id,
        },
    });
    console.log(`Upserted Admin: ${admin.email}`);

    // 3. Create Sample Users (Staff)
    const staffEmail = 'staff@yukti.com';
    await prisma.user.upsert({
        where: { email: staffEmail },
        update: {},
        create: {
            email: staffEmail,
            firstName: 'Sarah',
            lastName: 'Staff',
            passwordHash: await argon2.hash('staff123'),
            role: UserRole.STAFF,
            organizationId: org.id,
        },
    });
    console.log(`Upserted Staff: ${staffEmail}`);

    // 4. Create Sample Users (Students)
    const students = [
        { email: 'student1@yukti.com', first: 'John', last: 'Doe' },
        { email: 'student2@yukti.com', first: 'Jane', last: 'Smith' },
        { email: 'student3@yukti.com', first: 'Mike', last: 'Johnson' },
    ];

    for (const s of students) {
        await prisma.user.upsert({
            where: { email: s.email },
            update: {},
            create: {
                email: s.email,
                firstName: s.first,
                lastName: s.last,
                passwordHash: await argon2.hash('student123'),
                role: UserRole.STUDENT,
                organizationId: org.id,
            },
        });
        console.log(`Upserted Student: ${s.email}`);
    }

    // 5. Create Dummy Questions & Tags
    console.log('Seeding Dummy Questions...');

    // A. Create Tags (Find or Create)
    let mathTag = await prisma.tag.findFirst({
        where: { organizationId: org.id, name: 'Math' }
    });
    if (!mathTag) {
        mathTag = await prisma.tag.create({
            data: { name: 'Math', organizationId: org.id, type: 'TOPIC' as any }
        });
    }

    let physicsTag = await prisma.tag.findFirst({
        where: { organizationId: org.id, name: 'Physics' }
    });
    if (!physicsTag) {
        physicsTag = await prisma.tag.create({
            data: { name: 'Physics', organizationId: org.id, type: 'TOPIC' as any }
        });
    }

    let codingTag = await prisma.tag.findFirst({
        where: { organizationId: org.id, name: 'Programming' }
    });
    if (!codingTag) {
        codingTag = await prisma.tag.create({
            data: { name: 'Programming', organizationId: org.id, type: 'SKILL' as any }
        });
    }

    // B. Math Question (MCQ)
    await prisma.question.create({
        data: {
            organizationId: org.id,
            content: { text: 'What is the value of $\\pi$ to 2 decimal places?' },
            type: 'MCQ_SINGLE' as any,
            difficulty: 'EASY' as any,
            status: 'APPROVED' as any,
            tags: {
                create: [{ tagId: mathTag.id }]
            },
            options: {
                create: [
                    { text: '3.14', isCorrect: true, order: 0 },
                    { text: '3.12', isCorrect: false, order: 1 },
                    { text: '3.16', isCorrect: false, order: 2 },
                    { text: '3.18', isCorrect: false, order: 3 },
                ]
            }
        }
    });

    // C. Physics/Image Question (MCQ) - Mock Image
    await prisma.question.create({
        data: {
            organizationId: org.id,
            content: {
                text: 'Based on the diagram, what is the direction of force?',
                imageUrl: 'https://placehold.co/600x400?text=Physics+Diagram'
            },
            type: 'MCQ_SINGLE' as any,
            difficulty: 'MEDIUM' as any,
            status: 'APPROVED' as any,
            tags: {
                create: [{ tagId: physicsTag.id }]
            },
            options: {
                create: [
                    { text: 'Upwards', isCorrect: true, order: 0 },
                    { text: 'Downwards', isCorrect: false, order: 1 },
                    { text: 'Left', isCorrect: false, order: 2 },
                    { text: 'Right', isCorrect: false, order: 3 },
                ]
            }
        }
    });

    // D. Coding Question (Mock)
    await prisma.question.create({
        data: {
            organizationId: org.id,
            content: {
                text: 'Write a function to check if a number is prime.',
                codeSnippet: 'function isPrime(n) {\n  // your code here\n}'
            },
            type: 'MCQ_SINGLE' as any, // Using MCQ for now as MVP frontend only supports MCQ
            difficulty: 'HARD' as any,
            status: 'APPROVED' as any,
            tags: {
                create: [{ tagId: codingTag.id }]
            },
            options: {
                create: [
                    { text: 'O(n)', isCorrect: false, order: 0 },
                    { text: 'O(sqrt(n))', isCorrect: true, order: 1 },
                    { text: 'O(n^2)', isCorrect: false, order: 2 },
                    { text: 'O(log n)', isCorrect: false, order: 3 },
                ]
            }
        }
    });

    // 6. Seed Full Math Exam (50 Questions)
    console.log('Seeding Comprehensive Math Exam...');

    const examTitle = 'Advanced Mathematics Finals';
    let mathExam = await prisma.exam.findFirst({
        where: { organizationId: org.id, title: examTitle }
    });

    if (!mathExam) {
        // Create Exam
        mathExam = await prisma.exam.create({
            data: {
                organizationId: org.id,
                title: examTitle,
                description: 'Comprehensive assessment covering Algebra, Calculus, Geometry, and Trigonometry.',
                durationSeconds: 7200, // 2 hours
                passPercentage: 50.0,
                status: 'PUBLISHED' as any,
                settings: { shuffleQuestions: true, showResults: true }
            }
        });
        console.log(`Created Exam: ${examTitle}`);

        // Tags for the exam
        const topics = ['Algebra', 'Calculus', 'Geometry', 'Trigonometry'];
        const tagMap: Record<string, string> = {};

        for (const topic of topics) {
            let t = await prisma.tag.findFirst({ where: { organizationId: org.id, name: topic } });
            if (!t) {
                t = await prisma.tag.create({ data: { name: topic, organizationId: org.id, type: 'TOPIC' as any } });
            }
            tagMap[topic] = t.id;
        }

        // Generate 50 Questions
        const difficulties = ['EASY', 'MEDIUM', 'HARD'];

        for (let i = 1; i <= 50; i++) {
            const topic = topics[i % topics.length];
            const difficulty = difficulties[i % difficulties.length];
            const isHard = difficulty === 'HARD';

            const questionText = `Question ${i}: Solve the problem related to ${topic} (${difficulty} level). Find the value of x if f(x) = ...`;

            const q = await prisma.question.create({
                data: {
                    organizationId: org.id,
                    content: { text: questionText },
                    type: 'MCQ_SINGLE' as any,
                    difficulty: difficulty as any,
                    status: 'APPROVED' as any,
                    explanation: `Detailed explanation for question ${i} covering ${topic} concepts.`,
                    tags: {
                        create: [{ tagId: tagMap[topic] }]
                    },
                    options: {
                        create: [
                            { text: `Option A (Correct)`, isCorrect: true, order: 0 },
                            { text: `Option B`, isCorrect: false, order: 1 },
                            { text: `Option C`, isCorrect: false, order: 2 },
                            { text: `Option D`, isCorrect: false, order: 3 },
                        ]
                    }
                }
            });

            // Link to Exam
            await prisma.examQuestion.create({
                data: {
                    examId: mathExam.id,
                    questionId: q.id,
                    order: i,
                    marks: isHard ? 5 : (difficulty === 'MEDIUM' ? 3 : 1), // 5 marks for Hard, 3 Medium, 1 Easy
                    negativeMarks: isHard ? 1 : 0
                }
            });
        }
        console.log('Seeded 50 Math Questions and linked to Exam.');
    } else {
        console.log('Math Exam already exists.');
    }

    console.log('Seeding completed.');
}

main()
    .catch((e) => {
        console.error(e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });
