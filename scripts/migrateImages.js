const mongoose = require('mongoose');
const Article = require('../models/Article');
const User = require('../models/User');
const { cloudinary, uploadToCloudinary, deleteFromCloudinary } = require('../utils/cloudinaryStorage');
const fs = require('fs');
const path = require('path');

// Migration function to upload existing local images to Cloudinary
const migrateImagesToCloudinary = async () => {
  try {
    console.log('Starting image migration...');
    
    // Find all articles with local image paths
    const articles = await Article.find({
      $or: [
        { image: { $regex: '^/uploads/' } },
        { authorImage: { $regex: '^/uploads/' } }
      ]
    });

    console.log(`Found ${articles.length} articles with local images`);

    for (const article of articles) {
      let updated = false;

      // Migrate article image
      if (article.image && article.image.startsWith('/uploads/')) {
        const localPath = path.join(__dirname, '..', article.image);
        
        if (fs.existsSync(localPath)) {
          try {
            const cloudinaryUrl = await uploadToCloudinary(localPath, 'articles');
            if (cloudinaryUrl) {
              article.image = cloudinaryUrl;
              updated = true;
              console.log(`Migrated article image: ${article.image}`);
            }
          } catch (uploadError) {
            console.error(`Failed to upload ${localPath}:`, uploadError.message);
          }
        } else {
          // File doesn't exist, set to default
          article.image = '/images/default-article.jpg';
          updated = true;
          console.log(`Set default image for missing file: ${article.image}`);
        }
      }

      // Migrate author image
      if (article.authorImage && article.authorImage.startsWith('/uploads/')) {
        const localPath = path.join(__dirname, '..', article.authorImage);
        
        if (fs.existsSync(localPath)) {
          try {
            const cloudinaryUrl = await uploadToCloudinary(localPath, 'profiles');
            if (cloudinaryUrl) {
              article.authorImage = cloudinaryUrl;
              updated = true;
              console.log(`Migrated author image: ${article.authorImage}`);
            }
          } catch (uploadError) {
            console.error(`Failed to upload ${localPath}:`, uploadError.message);
          }
        } else {
          // File doesn't exist, set to default
          article.authorImage = '/images/default-author.jpg';
          updated = true;
          console.log(`Set default author image for missing file`);
        }
      }

      if (updated) {
        await article.save();
        console.log(`Updated article: ${article._id}`);
      }
    }

    // Migrate user profile images
    const users = await User.find({
      profileImage: { $regex: '^/uploads/' }
    });

    console.log(`Found ${users.length} users with local profile images`);

    for (const user of users) {
      if (user.profileImage && user.profileImage.startsWith('/uploads/')) {
        const localPath = path.join(__dirname, '..', user.profileImage);
        
        if (fs.existsSync(localPath)) {
          try {
            const cloudinaryUrl = await uploadToCloudinary(localPath, 'profiles');
            if (cloudinaryUrl) {
              user.profileImage = cloudinaryUrl;
              await user.save();
              console.log(`Migrated user profile image: ${user._id}`);
            }
          } catch (uploadError) {
            console.error(`Failed to upload ${localPath}:`, uploadError.message);
          }
        } else {
          user.profileImage = '/images/default-author.jpg';
          await user.save();
          console.log(`Set default profile image for user: ${user._id}`);
        }
      }
    }

    console.log('Migration completed successfully!');
    
  } catch (error) {
    console.error('Migration failed:', error);
  }
};

// Function to clean up broken image references
const cleanupBrokenImages = async () => {
  try {
    console.log('Cleaning up broken image references...');
    
    // List of missing files from your log
    const missingFiles = [
      '1749656572738-862771838-cherki.jpg',
      '1749656572734-762070813-vitinha.jpeg',
      '1749656572738-631225542-hakimi.webp'
    ];

    // Update articles that reference these missing files
    for (const filename of missingFiles) {
      const result = await Article.updateMany(
        { 
          $or: [
            { image: { $regex: filename } },
            { authorImage: { $regex: filename } }
          ]
        },
        { 
          $set: { 
            image: '/images/default-article.jpg',
            authorImage: '/images/default-author.jpg'
          }
        }
      );
      
      if (result.modifiedCount > 0) {
        console.log(`Updated ${result.modifiedCount} articles referencing ${filename}`);
      }
    }

    console.log('Cleanup completed!');
  } catch (error) {
    console.error('Cleanup failed:', error);
  }
};

// Run migration
if (require.main === module) {
  mongoose.connect(process.env.MONGODB_URI, {
    useNewUrlParser: true,
    useUnifiedTopology: true
  })
  .then(() => {
    console.log('Connected to MongoDB');
    return migrateImagesToCloudinary();
  })
  .then(() => {
    return cleanupBrokenImages();
  })
  .then(() => {
    process.exit(0);
  })
  .catch((error) => {
    console.error('Script failed:', error);
    process.exit(1);
  });
}

module.exports = {
  migrateImagesToCloudinary,
  cleanupBrokenImages
}; 