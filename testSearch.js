const mongoose = require('mongoose');
const dotenv = require('dotenv');
const Article = require('./models/Article');

dotenv.config();

async function testSearch() {
    try {
        await mongoose.connect(process.env.MONGODB_URI);
        console.log('Connected to MongoDB');

        // Test 1: Get sample articles to understand structure
        console.log('\n=== SAMPLE ARTICLES STRUCTURE ===');
        const sampleArticles = await Article.find({ status: 'published' }).limit(2).lean();
        
        sampleArticles.forEach((article, index) => {
            console.log(`\nArticle ${index + 1}:`);
            console.log(`- ID: ${article._id}`);
            console.log(`- EN Title: ${article.translations?.en?.title || 'N/A'}`);
            console.log(`- FR Title: ${article.translations?.fr?.title || 'N/A'}`);
            console.log(`- AR Title: ${article.translations?.ar?.title || 'N/A'}`);
            console.log(`- Category: ${article.category}`);
            console.log(`- Tags: ${JSON.stringify(article.tags || [])}`);
            console.log(`- Status: ${article.status}`);
            
            // Check content structure
            if (article.translations?.en?.content) {
                console.log(`- EN Content blocks: ${Array.isArray(article.translations.en.content) ? article.translations.en.content.length : 'Not array'}`);
                if (Array.isArray(article.translations.en.content) && article.translations.en.content.length > 0) {
                    console.log(`- First block type: ${article.translations.en.content[0].type}`);
                    console.log(`- First block content preview: ${article.translations.en.content[0].content?.substring(0, 100)}...`);
                }
            }
        });

        // Test 2: MongoDB text search
        console.log('\n=== MONGODB TEXT SEARCH TEST ===');
        try {
            const textSearchResults = await Article.find({
                $text: { $search: 'football' },
                status: 'published'
            }).limit(5).lean();
            console.log(`Text search for 'football': ${textSearchResults.length} results`);
            textSearchResults.forEach(article => {
                console.log(`- ${article.translations?.en?.title || 'No title'}`);
            });
        } catch (err) {
            console.log('Text search failed:', err.message);
        }

        // Test 3: Regex search on titles
        console.log('\n=== REGEX SEARCH TEST ===');
        const regexSearchResults = await Article.find({
            status: 'published',
            $or: [
                { 'translations.en.title': /football/i },
                { 'translations.fr.title': /football/i },
                { 'translations.ar.title': /football/i },
                { 'translations.en.title': /etoile/i },
                { 'translations.en.title': /match/i },
                { 'translations.en.title': /game/i }
            ]
        }).limit(10).lean();
        console.log(`Regex search for football/etoile/match/game: ${regexSearchResults.length} results`);
        regexSearchResults.forEach(article => {
            console.log(`- ${article.translations?.en?.title || 'No title'}`);
        });

        // Test 4: Search in content
        console.log('\n=== CONTENT SEARCH TEST ===');
        const contentSearchResults = await Article.find({
            status: 'published',
            $or: [
                { 'translations.en.content.content': /football/i },
                { 'translations.fr.content.content': /football/i },
                { 'translations.ar.content.content': /football/i }
            ]
        }).limit(5).lean();
        console.log(`Content search for 'football': ${contentSearchResults.length} results`);

        // Test 5: Tag search
        console.log('\n=== TAG SEARCH TEST ===');
        const tagSearchResults = await Article.find({
            status: 'published',
            tags: { $regex: /sport|football|match/i }
        }).limit(5).lean();
        console.log(`Tag search for sport/football/match: ${tagSearchResults.length} results`);

        // Test 6: Count all published articles
        console.log('\n=== TOTAL PUBLISHED ARTICLES ===');
        const totalPublished = await Article.countDocuments({ status: 'published' });
        console.log(`Total published articles: ${totalPublished}`);

        await mongoose.connection.close();
        console.log('\nTest completed successfully!');
        
    } catch (error) {
        console.error('Test failed:', error);
        await mongoose.connection.close();
        process.exit(1);
    }
}

testSearch(); 