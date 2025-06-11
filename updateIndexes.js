const mongoose = require('mongoose');
const dotenv = require('dotenv');

dotenv.config();

async function updateIndexes() {
    try {
        await mongoose.connect(process.env.MONGODB_URI);
        console.log('Connected to MongoDB');

        const db = mongoose.connection.db;
        const collection = db.collection('articles');

        // Drop all existing text indexes
        console.log('\nDropping existing text indexes...');
        try {
            const indexes = await collection.listIndexes().toArray();
            const textIndexes = indexes.filter(index => 
                index.name && index.name.includes('text')
            );
            
            for (const index of textIndexes) {
                console.log(`Dropping index: ${index.name}`);
                await collection.dropIndex(index.name);
            }
        } catch (err) {
            console.log('No text indexes to drop or error:', err.message);
        }

        // Create comprehensive text index
        console.log('\nCreating comprehensive search index...');
        const indexResult = await collection.createIndex({
            // Article titles in all languages
            'translations.en.title': 'text',
            'translations.fr.title': 'text', 
            'translations.ar.title': 'text',
            
            // Article excerpts in all languages
            'translations.en.excerpt': 'text',
            'translations.fr.excerpt': 'text',
            'translations.ar.excerpt': 'text',
            
            // Content blocks - main content field
            'translations.en.content.content': 'text',
            'translations.fr.content.content': 'text',
            'translations.ar.content.content': 'text',
            
            // Tags
            'tags': 'text'
        }, {
            weights: {
                'translations.en.title': 10,
                'translations.fr.title': 10,
                'translations.ar.title': 10,
                'translations.en.excerpt': 5,
                'translations.fr.excerpt': 5,
                'translations.ar.excerpt': 5,
                'translations.en.content.content': 1,
                'translations.fr.content.content': 1,
                'translations.ar.content.content': 1,
                'tags': 8
            },
            name: 'comprehensive_search_index',
            default_language: 'english'
        });

        console.log('Created search index:', indexResult);

        // Test the new text index
        console.log('\nTesting new text index...');
        const testSearch = await collection.find({
            $text: { $search: 'pep' },
            status: 'published'
        }).toArray();
        console.log(`Test search for 'pep': ${testSearch.length} results`);

        // List all indexes
        console.log('\nAll indexes on articles collection:');
        const allIndexes = await collection.listIndexes().toArray();
        allIndexes.forEach(index => {
            console.log(`- ${index.name}: ${JSON.stringify(index.key)}`);
        });

        await mongoose.connection.close();
        console.log('\nIndex update completed successfully!');
        
    } catch (error) {
        console.error('Error updating indexes:', error);
        await mongoose.connection.close();
        process.exit(1);
    }
}

updateIndexes(); 