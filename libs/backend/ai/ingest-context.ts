import * as dotenv from 'dotenv';
dotenv.config();

import { NestFactory } from '@nestjs/core';
import { AiModule } from './src/lib/ai.module';
import { AiService } from './src/lib/ai.service';
import { QdrantService } from './src/lib/qdrant.service';
import * as fs from 'fs';
import * as path from 'path';

/**
 * Script to ingest project context into Qdrant.
 * Usage: npx ts-node libs/backend/ai/ingest-context.ts
 */
async function ingest() {
    console.log('🚀 Starting ingestion...');

    // Create Application Context to use Dependency Injection
    const app = await NestFactory.createApplicationContext(AiModule);
    const aiService = app.get(AiService);
    const qdrantService = app.get(QdrantService);

    const collectionName = 'project_context';
    // text-embedding-004 has 768 dimensions
    await qdrantService.ensureCollection(collectionName, 768);

    const projectRoot = path.resolve(__dirname, '../../../../');

    // 1. Read Architecture Document
    const architecturePath = path.join(projectRoot, 'saas architecture.md');

    if (fs.existsSync(architecturePath)) {
        console.log(`📄 Reading: ${architecturePath}`);
        const content = fs.readFileSync(architecturePath, 'utf-8');
        const chunks = content.split(/^#+\s/m).filter(c => c.trim().length > 0).map(c => '# ' + c.trim());

        for (const chunk of chunks) {
            const embedding = await aiService.getEmbedding(chunk);
            if (embedding.length > 0) {
                await qdrantService.upsertPoints(collectionName, [{
                    id: Date.now() + Math.floor(Math.random() * 10000),
                    vector: embedding,
                    payload: { content: chunk, type: 'documentation', filePath: 'saas architecture.md' }
                }]);
            }
        }
        console.log('✅ Ingested Architecture Document.');
    }

    // 2. Read All Code Files (Recursive)
    const sourceDirs = [
        path.join(projectRoot, 'saas-platform/libs'),
        path.join(projectRoot, 'saas-platform/apps'),
        path.join(projectRoot, 'saas-platform/prisma')
    ];

    const validExtensions = ['.ts', '.html', '.css', '.scss', '.md', '.json', '.prisma'];
    const ignoreDirs = ['node_modules', 'dist', 'tmp', '.git', '.nx'];

    function getFilesRecursively(dir: string, fileList: string[] = []) {
        if (!fs.existsSync(dir)) return fileList;

        const files = fs.readdirSync(dir);
        for (const file of files) {
            const filePath = path.join(dir, file);
            const stat = fs.statSync(filePath);

            if (stat.isDirectory()) {
                if (!ignoreDirs.includes(file)) {
                    getFilesRecursively(filePath, fileList);
                }
            } else {
                if (validExtensions.includes(path.extname(file))) {
                    fileList.push(filePath);
                }
            }
        }
        return fileList;
    }

    let allFiles: string[] = [];
    sourceDirs.forEach(dir => {
        allFiles = getFilesRecursively(dir, allFiles);
    });

    console.log(`ℹ️ Found ${allFiles.length} code files to ingest.`);

    // Ingest in batches
    for (let i = 0; i < allFiles.length; i++) {
        const filePath = allFiles[i];
        const relativePath = path.relative(projectRoot, filePath);

        // Skip very large files or known large artifacts to save tokens/time
        const stat = fs.statSync(filePath);
        if (stat.size > 50000) { // Skip files larger than 50KB for now
            console.warn(`⚠️ Skipping large file: ${relativePath} (${stat.size} bytes)`);
            continue;
        }

        const content = fs.readFileSync(filePath, 'utf-8');
        // Prepend filename to content for context
        const codeContext = `File: ${relativePath}\n\n${content}`;

        console.log(`[${i + 1}/${allFiles.length}] Embedding: ${relativePath}`);

        try {
            const embedding = await aiService.getEmbedding(codeContext);

            if (embedding.length > 0) {
                await qdrantService.upsertPoints(collectionName, [{
                    id: Date.now() + i,
                    vector: embedding,
                    payload: { content: codeContext, type: 'code', filePath: relativePath }
                }]);
            }
        } catch (e) {
            console.error(`❌ Failed to process ${relativePath}:`, e);
        }

        // Rate limit protection
        await new Promise(r => setTimeout(r, 800)); // Slower rate to prevent 429
    }

    console.log('✅ Ingestion complete.');
    await app.close();
}

ingest();
