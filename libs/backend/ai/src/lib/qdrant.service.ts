import { Injectable, Logger } from '@nestjs/common';
import { QdrantClient } from '@qdrant/js-client-rest';

@Injectable()
export class QdrantService {
    private client: QdrantClient;
    private readonly logger = new Logger(QdrantService.name);

    constructor() {
        const url = process.env['QDRANT_URL']; // e.g., 'http://localhost:6333' or cloud URL
        const apiKey = process.env['QDRANT_API_KEY'];

        if (url) {
            this.client = new QdrantClient({ url, apiKey });
            this.logger.log(`✅ Qdrant Client initialized at ${url}`);
        } else {
            this.logger.error('❌ Qdrant URL not found in environment variables.');
            // Throwing error might crash app if env is missing, better to log and disable gracefully or throw if critical
            // For now, initialized but methods will fail if client undefined, or we can use a mock/noop
            // Let's assume critical for now as this service is specifically for Qdrant
            throw new Error("QDRANT_URL is missing");
        }
    }

    async ensureCollection(collectionName: string, vectorSize: number) {
        try {
            const collections = await this.client.getCollections();
            const exists = collections.collections.some((c) => c.name === collectionName);

            if (!exists) {
                this.logger.log(`Creating collection '${collectionName}' with vector size ${vectorSize}...`);
                await this.client.createCollection(collectionName, {
                    vectors: {
                        size: vectorSize,
                        distance: 'Cosine',
                    },
                });
                this.logger.log(`✅ Collection '${collectionName}' created.`);
            } else {
                this.logger.log(`Collection '${collectionName}' already exists.`);
            }
        } catch (error: any) {
            this.logger.error(`Failed to ensure collection: ${error.message}`, error.stack);
            throw error;
        }
    }

    async upsertPoints(collectionName: string, points: { id: string | number; vector: number[]; payload?: any }[]) {
        try {
            await this.client.upsert(collectionName, {
                points,
            });
            this.logger.log(`✅ Upserted ${points.length} points into '${collectionName}'.`);
        } catch (error: any) {
            this.logger.error(`Failed to upsert points: ${error.message}`, error.stack);
            throw error;
        }
    }

    async search(collectionName: string, vector: number[], limit: number = 5, filter?: any) {
        try {
            const result = await this.client.search(collectionName, {
                vector,
                limit,
                filter,
            });
            return result;
        } catch (error: any) {
            this.logger.error(`Failed to search: ${error.message}`, error.stack);
            throw error;
        }
    }
}
