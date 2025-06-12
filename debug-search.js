const mongoose = require('mongoose');
const Article = require('./models/Article');

// Connect to MongoDB
mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/football-journal', {
    useNewUrlParser: true,
    useUnifiedTopology: true
});

const debugSearch = async () => {
    try {
        console.log('🔍 Debugging search functionality...\n');

        // 1. Check total articles in database
        const totalArticles = await Article.countDocuments();
        console.log(`📊 Total articles in database: ${totalArticles}`);

        // 2. Check published articles
        const publishedArticles = await Article.countDocuments({ status: 'published' });
        console.log(`📰 Published articles: ${publishedArticles}`);

        // 3. Get a sample of articles to examine structure
        const sampleArticles = await Article.find().limit(3);
        console.log(`\n📝 Sample articles structure:`);
        
        sampleArticles.forEach((article, index) => {
            console.log(`\n--- Article ${index + 1} ---`);
            console.log(`ID: ${article._id}`);
            console.log(`Status: ${article.status}`);
            console.log(`Category: ${article.category}`);
            console.log(`Title (EN): ${article.translations?.en?.title || 'N/A'}`);
            console.log(`Title (FR): ${article.translations?.fr?.title || 'N/A'}`);
            console.log(`Title (AR): ${article.translations?.ar?.title || 'N/A'}`);
            console.log(`Excerpt (EN): ${article.translations?.en?.excerpt?.substring(0, 100) || 'N/A'}...`);
            console.log(`Content blocks (EN): ${article.translations?.en?.content?.length || 0}`);
            console.log(`Tags: ${JSON.stringify(article.tags || [])}`);
        });

        // 4. Test search with various terms
        const searchTerms = ['football', 'tactical', 'game', 'beautiful', 'analysis'];
        
        for (const term of searchTerms) {
            console.log(`\n🔍 Testing search for: "${term}"`);
            
            // Text search
            try {
                const textResults = await Article.find({
                    status: 'published',
                    $text: { $search: term }
                });
                console.log(`  📋 Text search results: ${textResults.length}`);
            } catch (error) {
                console.log(`  ❌ Text search failed: ${error.message}`);
            }

            // Regex search on titles
            const titleRegex = new RegExp(term, 'i');
            const titleResults = await Article.find({
                status: 'published',
                $or: [
                    { 'translations.en.title': titleRegex },
                    { 'translations.fr.title': titleRegex },
                    { 'translations.ar.title': titleRegex }
                ]
            });
            console.log(`  📋 Title regex search results: ${titleResults.length}`);

            // Regex search on content
            const contentResults = await Article.find({
                status: 'published',
                $or: [
                    { 'translations.en.content.content': titleRegex },
                    { 'translations.fr.content.content': titleRegex },
                    { 'translations.ar.content.content': titleRegex }
                ]
            });
            console.log(`  📋 Content regex search results: ${contentResults.length}`);

            // Regex search on excerpts
            const excerptResults = await Article.find({
                status: 'published',
                $or: [
                    { 'translations.en.excerpt': titleRegex },
                    { 'translations.fr.excerpt': titleRegex },
                    { 'translations.ar.excerpt': titleRegex }
                ]
            });
            console.log(`  📋 Excerpt regex search results: ${excerptResults.length}`);
        }

        // 5. Check text indexes
        console.log(`\n📚 Checking text indexes...`);
        const indexes = await Article.collection.getIndexes();
        console.log('Indexes:', Object.keys(indexes));
        
        const textIndex = indexes['translations.en.title_text_translations.fr.title_text_translations.ar.title_text_translations.en.excerpt_text_translations.fr.excerpt_text_translations.ar.excerpt_text_translations.en.content.content_text_translations.fr.content.content_text_translations.ar.content.content_text_translations.en.legacyContent_text_translations.fr.legacyContent_text_translations.ar.legacyContent_text_translations.en.content.metadata.caption_text_translations.fr.content.metadata.caption_text_translations.ar.content.metadata.caption_text_translations.en.content.metadata.images.caption_text_translations.fr.content.metadata.images.caption_text_translations.ar.content.metadata.images.caption_text_translations.en.content.metadata.source_text_translations.fr.content.metadata.source_text_translations.ar.content.metadata.source_text_translations.ar.content.metadata.source_text_tags_text'];
        
        if (textIndex) {
            console.log('✅ Text index exists');
        } else {
            console.log('❌ Text index missing - this could be the issue!');
        }

    } catch (error) {
        console.error('❌ Debug error:', error);
    } finally {
        mongoose.connection.close();
        console.log('\n🔒 Database connection closed');
    }
};

debugSearch(); 