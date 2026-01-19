import { Injectable, BadRequestException } from '@nestjs/common';
import { PrismaService } from '@saas-platform/prisma';
import { PrismaClient } from '@prisma/client';

@Injectable()
export class QuestionsService {
    constructor(private prisma: PrismaService) { }

    async create(orgId: string, data: any) {
        // Data expected: { content: any, type: Enum, difficulty: Enum, options: [], tags: [] }
        return this.prisma.$transaction(async (tx) => {
            const prismaTx = tx as any;

            // 1. Create Question
            const question = await prismaTx.question.create({
                data: {
                    organizationId: orgId,
                    content: data.content,
                    type: data.type,
                    difficulty: data.difficulty,
                    explanation: data.explanation,
                    status: 'DRAFT'
                }
            });

            // 2. Create Options if provided
            if (data.options && Array.isArray(data.options)) {
                await prismaTx.questionOption.createMany({
                    data: data.options.map((opt: any, index: number) => ({
                        questionId: question.id,
                        text: opt.text,
                        isCorrect: opt.isCorrect || false,
                        order: index
                    }))
                });
            }

            // 3. Handle Tags (Create if new, connect if existing)
            // For MVP, assume tags send IDs? or names?
            // Let's assume names for ease of use, we upsert them.
            if (data.tags && Array.isArray(data.tags)) {
                for (const tagName of data.tags) {
                    // Check if tag exists in Org
                    let tag = await prismaTx.tag.findFirst({
                        where: { organizationId: orgId, name: tagName }
                    });

                    if (!tag) {
                        tag = await prismaTx.tag.create({
                            data: {
                                organizationId: orgId,
                                name: tagName,
                                type: 'TOPIC' // Default
                            }
                        });
                    }

                    await prismaTx.questionTag.create({
                        data: {
                            questionId: question.id,
                            tagId: tag.id
                        }
                    });
                }
            }

            return question;
        });
    }

    async findAll(orgId: string) {
        return this.prisma.question.findMany({
            where: { organizationId: orgId },
            include: {
                options: true,
                tags: {
                    include: { tag: true }
                }
            },
            orderBy: { createdAt: 'desc' }
        });
    }

    async findOne(orgId: string, id: string) {
        const q = await this.prisma.question.findFirst({
            where: { id, organizationId: orgId },
            include: { options: true, tags: { include: { tag: true } } }
        });
        if (!q) throw new BadRequestException('Question not found');
        return q;
    }

    async update(orgId: string, id: string, data: any) {
        return this.prisma.$transaction(async (tx) => {
            const prismaTx = tx as any;

            // 1. Verify existence
            const existing = await prismaTx.question.findFirst({
                where: { id, organizationId: orgId }
            });
            if (!existing) throw new BadRequestException('Question not found');

            // 2. Update Question Core Data
            await prismaTx.question.update({
                where: { id },
                data: {
                    content: data.content,
                    type: data.type,
                    difficulty: data.difficulty,
                    explanation: data.explanation,
                }
            });

            // 3. Update Options (Full Replace Strategy)
            if (data.options && Array.isArray(data.options)) {
                await prismaTx.questionOption.deleteMany({ where: { questionId: id } });
                await prismaTx.questionOption.createMany({
                    data: data.options.map((opt: any, index: number) => ({
                        questionId: id,
                        text: opt.text,
                        isCorrect: opt.isCorrect || false,
                        order: index
                    }))
                });
            }

            // 4. Update Tags (Full Replace Strategy)
            if (data.tags && Array.isArray(data.tags)) {
                await prismaTx.questionTag.deleteMany({ where: { questionId: id } });

                for (const tagName of data.tags) {
                    let tag = await prismaTx.tag.findFirst({
                        where: { organizationId: orgId, name: tagName }
                    });

                    if (!tag) {
                        tag = await prismaTx.tag.create({
                            data: {
                                organizationId: orgId,
                                name: tagName,
                                type: 'TOPIC' as any
                            }
                        });
                    }

                    await prismaTx.questionTag.create({
                        data: {
                            questionId: id,
                            tagId: tag.id
                        }
                    });
                }
            }

            return this.findOne(orgId, id);
        });
    }
    async importQuestions(orgId: string, buffer: Buffer) {
        const Readable = require('stream').Readable;
        const csv = require('fast-csv');

        const stream = Readable.from(buffer);
        const questions: any[] = [];

        return new Promise((resolve, reject) => {
            csv.parseStream(stream, { headers: true, ignoreEmpty: true, trim: true })
                .on('error', (error: any) => reject(error))
                .on('data', (row: any) => questions.push(row))
                .on('end', async (rowCount: number) => {
                    try {
                        let successCount = 0;
                        let skippedCount = 0;
                        const errors = [];

                        for (const [i, row] of questions.entries()) {
                            try {
                                // Map Row to Data Object
                                if (!row.content) continue; // Skip empty rows

                                // DUPLICATE CHECK
                                // Check if question with same text already exists in this Org
                                const existing = await this.prisma.question.findFirst({
                                    where: {
                                        organizationId: orgId,
                                        content: {
                                            path: ['text'],
                                            equals: row.content.trim()
                                        }
                                    }
                                });

                                if (existing) {
                                    skippedCount++;
                                    continue;
                                }

                                const data = {
                                    content: { text: row.content.trim(), imageUrl: row.imageUrl || '' },
                                    type: row.type || 'MCQ_SINGLE',
                                    difficulty: row.difficulty || 'MEDIUM',
                                    explanation: row.explanation || '',
                                    tags: row.tags ? row.tags.split(',').map((t: string) => t.trim()) : [],
                                    options: [] as any[]
                                };

                                // Options 1-4
                                ['option1', 'option2', 'option3', 'option4'].forEach((key, index) => {
                                    if (row[key]) {
                                        let isCorrect = false;
                                        // Check 'correctOption' column (e.g. "1", "2", or "option1")
                                        if (row.correctOption) {
                                            const co = row.correctOption.toString().trim();
                                            // Match Index "1"
                                            if (co === (index + 1).toString()) isCorrect = true;
                                            // Match Key "option1"
                                            if (co.toLowerCase() === key.toLowerCase()) isCorrect = true;
                                            // Match Text (fallback)
                                            if (co === row[key]) isCorrect = true;
                                        }

                                        data.options.push({
                                            text: row[key],
                                            isCorrect: isCorrect
                                        });
                                    }
                                });

                                await this.create(orgId, data);
                                successCount++;
                            } catch (err: any) {
                                console.error(`Row ${i} failed:`, err);
                                errors.push(`Row ${i + 1}: ${err.message}`);
                            }
                        }
                        resolve({
                            success: true,
                            count: successCount,
                            skipped: skippedCount,
                            total: questions.length,
                            errors: errors.length > 0 ? errors : undefined
                        });
                    } catch (e) {
                        reject(e);
                    }
                });
        });
    }
}
