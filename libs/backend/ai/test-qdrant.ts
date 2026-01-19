import { QdrantClient } from '@qdrant/js-client-rest';

async function verifyQdrant() {
    const url = process.env.QDRANT_URL;
    const apiKey = process.env.QDRANT_API_KEY;

    if (!url || !apiKey) {
        console.error('❌ QDRANT_URL or QDRANT_API_KEY is missing.');
        process.exit(1);
    }

    console.log(`Connecting to Qdrant at ${url}...`);
    const client = new QdrantClient({ url, apiKey });

    try {
        const collections = await client.getCollections();
        console.log('✅ Connection successful. Collections:', collections.collections.map(c => c.name));
    } catch (error: any) {
        console.error('❌ Failed to connect:', error.message);
    }
}

verifyQdrant();
