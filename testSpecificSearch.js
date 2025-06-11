const mongoose = require('mongoose');
const dotenv = require('dotenv');
const Article = require('./models/Article');

dotenv.config();

async function testSpecificSearch() {
    try {
        await mongoose.connect(process.env.MONGODB_URI);
        console.log('Connected to MongoDB');

        // Test searches for content that actually exists
        const searchTerms = ['pep', 'guardiola', 'gaza', 'colombia', 'weqtert'];

        for (const term of searchTerms) {
            console.log(`\n=== TESTING SEARCH FOR: "${term}" ===`);
            
            // MongoDB text search
            try {
                const textResults = await Article.find({
                    $text: { $search: term },
                    status: 'published'
                }, { score: { $meta: 'textScore' } })
                .sort({ score: { $meta: 'textScore' } })
                .limit(5)
                .lean();
                
                console.log(`Text search results: ${textResults.length}`);
                textResults.forEach((article, index) => {
                    console.log(`${index + 1}. ${article.translations?.en?.title} (score: ${article.score})`);
                });
            } catch (err) {
                console.log(`Text search error: ${err.message}`);
            }

            // Regex search (our fallback)
            const regexResults = await Article.find({
                status: 'published',
                $or: [
                    { 'translations.en.title': new RegExp(term, 'i') },
                    { 'translations.fr.title': new RegExp(term, 'i') },
                    { 'translations.ar.title': new RegExp(term, 'i') },
                    { 'translations.en.excerpt': new RegExp(term, 'i') },
                    { 'translations.fr.excerpt': new RegExp(term, 'i') },
                    { 'translations.ar.excerpt': new RegExp(term, 'i') },
                    { 'translations.en.content.content': new RegExp(term, 'i') },
                    { 'translations.fr.content.content': new RegExp(term, 'i') },
                    { 'translations.ar.content.content': new RegExp(term, 'i') },
                    { 'tags': new RegExp(term, 'i') }
                ]
            }).limit(5).lean();
            
            console.log(`Regex search results: ${regexResults.length}`);
            regexResults.forEach((article, index) => {
                console.log(`${index + 1}. ${article.translations?.en?.title}`);
            });
        }

        // Test the comprehensive search logic from our controller
        console.log(`\n=== TESTING COMPREHENSIVE SEARCH (like in controller) ===`);
        const searchTerm = 'pep';
        const searchRegex = new RegExp(searchTerm.split(' ').join('|'), 'i');
        
        const comprehensiveResults = await Article.find({
            status: 'published',
            $or: [
                // MongoDB text search
                { $text: { $search: searchTerm } },
                
                // Titles in all languages
                { 'translations.en.title': searchRegex },
                { 'translations.fr.title': searchRegex },
                { 'translations.ar.title': searchRegex },
                
                // Excerpts in all languages
                { 'translations.en.excerpt': searchRegex },
                { 'translations.fr.excerpt': searchRegex },
                { 'translations.ar.excerpt': searchRegex },
                
                // Content blocks
                { 'translations.en.content.content': searchRegex },
                { 'translations.fr.content.content': searchRegex },
                { 'translations.ar.content.content': searchRegex },
                
                // Tags
                { 'tags': searchRegex }
            ]
        })
        .populate('author', 'name email')
        .sort({ publishedAt: -1 })
        .limit(10)
        .lean();

        console.log(`Comprehensive search for '${searchTerm}': ${comprehensiveResults.length} results`);
        comprehensiveResults.forEach((article, index) => {
            console.log(`${index + 1}. ${article.translations?.en?.title} (${article.category})`);
        });

        await mongoose.connection.close();
        console.log('\nTest completed!');
        
    } catch (error) {
        console.error('Test failed:', error);
        await mongoose.connection.close();
        process.exit(1);
    }
}

testSpecificSearch(); 