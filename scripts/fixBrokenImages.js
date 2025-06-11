const mongoose = require('mongoose');
const Article = require('../models/Article');
require('dotenv').config();

/**
 * Migration script to fix broken image references in articles
 * This script will replace broken local file paths with placeholder images
 */

const PLACEHOLDER_IMAGE = 'https://via.placeholder.com/800x400/cccccc/666666?text=Image+Temporarily+Unavailable+-+Please+Re-upload';

async function fixBrokenImages() {
    try {
        // Connect to MongoDB
        await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/football_journal', {
            useNewUrlParser: true,
            useUnifiedTopology: true
        });
        
        console.log('🔌 Connected to MongoDB');
        console.log('🔍 Scanning for articles with broken image references...\n');
        
        // Find all articles
        const articles = await Article.find({});
        console.log(`📊 Found ${articles.length} articles to check`);
        
        let fixedCount = 0;
        let brokenImageCount = 0;
        
        for (const article of articles) {
            let needsUpdate = false;
            const updateData = {};
            
            // Check main image - if it's a relative path, it's likely broken on Vercel
            if (article.image && article.image.startsWith('/uploads/')) {
                console.log(`❌ Found broken main image: ${article.image} in article ${article._id}`);
                updateData.image = PLACEHOLDER_IMAGE;
                needsUpdate = true;
                brokenImageCount++;
            }
            
            // Check content images in all languages
            const languages = ['en', 'fr', 'ar'];
            const updatedTranslations = JSON.parse(JSON.stringify(article.translations));
            
            languages.forEach(lang => {
                if (updatedTranslations[lang] && updatedTranslations[lang].content) {
                    updatedTranslations[lang].content = updatedTranslations[lang].content.map(block => {
                        if (block.type === 'image-group' && block.metadata?.images) {
                            block.metadata.images = block.metadata.images.map(img => {
                                if (img.url && img.url.startsWith('/uploads/')) {
                                    console.log(`❌ Found broken content image: ${img.url} in article ${article._id}`);
                                    needsUpdate = true;
                                    brokenImageCount++;
                                    return {
                                        ...img,
                                        url: PLACEHOLDER_IMAGE
                                    };
                                }
                                return img;
                            });
                        }
                        return block;
                    });
                }
            });
            
            if (needsUpdate) {
                updateData.translations = updatedTranslations;
                
                await Article.findByIdAndUpdate(article._id, updateData);
                fixedCount++;
                console.log(`✅ Fixed broken images in article: ${article._id}`);
            }
        }
        
        console.log(`\n🎉 Migration completed!`);
        console.log(`📊 Summary:`);
        console.log(`   - Articles scanned: ${articles.length}`);
        console.log(`   - Articles with broken images: ${fixedCount}`);
        console.log(`   - Total broken images fixed: ${brokenImageCount}`);
        console.log(`   - Articles with working images: ${articles.length - fixedCount}`);
        
        if (fixedCount > 0) {
            console.log(`\n⚠️  Next steps:`);
            console.log(`1. Deploy your updated backend with Cloudinary integration`);
            console.log(`2. Set Cloudinary environment variables in Vercel`);
            console.log(`3. Re-upload important images through the article editor`);
            console.log(`4. New images will automatically use Cloudinary storage`);
        } else {
            console.log(`\n✨ All images are already working correctly!`);
        }
        
    } catch (error) {
        console.error('❌ Migration failed:', error);
    } finally {
        await mongoose.disconnect();
        console.log('\n🔌 Disconnected from MongoDB');
    }
}

// Run the migration
if (require.main === module) {
    fixBrokenImages();
}

module.exports = fixBrokenImages; 