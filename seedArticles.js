const mongoose = require('mongoose');
const Article = require('./models/Article');
const User = require('./models/User');
require('dotenv').config();

const sampleArticles = [
  {
    translations: {
      en: {
        title: "Etoile du Sahel's Victory in the Championship",
        content: [
          {
            type: "paragraph",
            content: "In a thrilling match that will be remembered for years to come, Etoile du Sahel secured their position as champions with a spectacular performance on the field."
          },
          {
            type: "paragraph", 
            content: "The team showed incredible determination and skill throughout the tournament, demonstrating why they are considered one of the finest teams in the region."
          }
        ],
        excerpt: "Etoile du Sahel's championship victory showcases the team's incredible skill and determination in a memorable tournament finale."
      },
      fr: {
        title: "La Victoire de l'Étoile du Sahel au Championnat",
        content: [
          {
            type: "paragraph",
            content: "Dans un match palpitant qui restera dans les mémoires pendant des années, l'Étoile du Sahel a sécurisé sa position de champion avec une performance spectaculaire sur le terrain."
          },
          {
            type: "paragraph",
            content: "L'équipe a montré une détermination et un talent incroyables tout au long du tournoi, démontrant pourquoi elle est considérée comme l'une des meilleures équipes de la région."
          }
        ],
        excerpt: "La victoire de l'Étoile du Sahel au championnat démontre l'incroyable talent et la détermination de l'équipe lors d'une finale mémorable."
      },
      ar: {
        title: "انتصار النجم الساحلي في البطولة",
        content: [
          {
            type: "paragraph",
            content: "في مباراة مثيرة ستبقى في الذاكرة لسنوات قادمة، ضمن النجم الساحلي موقعه كبطل بأداء رائع على أرض الملعب."
          },
          {
            type: "paragraph",
            content: "أظهر الفريق عزيمة ومهارة لا تصدق طوال البطولة، مما يوضح سبب اعتباره واحداً من أفضل الفرق في المنطقة."
          }
        ],
        excerpt: "انتصار النجم الساحلي في البطولة يظهر مهارة وعزيمة الفريق المذهلة في نهائي لا يُنسى."
      }
    },
    category: "etoile-du-sahel",
    tags: ["championship", "victory", "etoile"],
    status: "published"
  },
  {
    translations: {
      en: {
        title: "The Art of Beautiful Football: Tactical Analysis", 
        content: [
          {
            type: "paragraph",
            content: "Football is more than just a game; it's an art form that combines strategy, skill, and passion into something truly beautiful to behold."
          },
          {
            type: "paragraph",
            content: "In this analysis, we explore the tactical nuances that make the beautiful game so captivating for millions of fans worldwide."
          }
        ],
        excerpt: "An in-depth look at the tactical artistry that makes football the beautiful game beloved by millions."
      },
      fr: {
        title: "L'Art du Beau Football : Analyse Tactique",
        content: [
          {
            type: "paragraph", 
            content: "Le football est plus qu'un simple jeu ; c'est une forme d'art qui combine stratégie, compétence et passion en quelque chose de vraiment beau à contempler."
          },
          {
            type: "paragraph",
            content: "Dans cette analyse, nous explorons les nuances tactiques qui rendent le beau jeu si captivant pour des millions de fans dans le monde entier."
          }
        ],
        excerpt: "Un regard approfondi sur l'art tactique qui fait du football le beau jeu aimé par des millions de personnes."
      },
      ar: {
        title: "فن كرة القدم الجميلة: تحليل تكتيكي",
        content: [
          {
            type: "paragraph",
            content: "كرة القدم أكثر من مجرد لعبة؛ إنها شكل فني يجمع بين الاستراتيجية والمهارة والشغف في شيء جميل حقاً للمشاهدة."
          },
          {
            type: "paragraph", 
            content: "في هذا التحليل، نستكشف الفروق التكتيكية الدقيقة التي تجعل اللعبة الجميلة آسرة جداً لملايين المشجعين حول العالم."
          }
        ],
        excerpt: "نظرة متعمقة على الفن التكتيكي الذي يجعل كرة القدم اللعبة الجميلة المحبوبة من قبل الملايين."
      }
    },
    category: "the-beautiful-game",
    tags: ["tactics", "analysis", "beautiful game"],
    status: "published"
  },
  {
    translations: {
      en: {
        title: "All-Sports Hub: Multi-Sport Training Methods",
        content: [
          {
            type: "paragraph",
            content: "Modern athletes are increasingly adopting cross-training methods from various sports to enhance their overall performance and reduce injury risk."
          },
          {
            type: "paragraph",
            content: "This comprehensive guide explores how integrating different sports disciplines can create more well-rounded and resilient athletes."
          }
        ],
        excerpt: "Discover how cross-training with multiple sports can enhance athletic performance and reduce injury risk."
      },
      fr: {
        title: "Hub Tous Sports : Méthodes d'Entraînement Multi-Sports",
        content: [
          {
            type: "paragraph",
            content: "Les athlètes modernes adoptent de plus en plus les méthodes d'entraînement croisé de divers sports pour améliorer leur performance globale et réduire le risque de blessure."
          },
          {
            type: "paragraph",
            content: "Ce guide complet explore comment l'intégration de différentes disciplines sportives peut créer des athlètes plus complets et résistants."
          }
        ],
        excerpt: "Découvrez comment l'entraînement croisé avec plusieurs sports peut améliorer la performance athlétique et réduire le risque de blessure."
      },
      ar: {
        title: "مركز كل الرياضات: طرق التدريب متعدد الرياضات",
        content: [
          {
            type: "paragraph",
            content: "يتبنى الرياضيون المعاصرون بشكل متزايد طرق التدريب المتقاطع من مختلف الرياضات لتعزيز أدائهم العام وتقليل مخاطر الإصابة."
          },
          {
            type: "paragraph",
            content: "يستكشف هذا الدليل الشامل كيف يمكن لدمج تخصصات رياضية مختلفة أن يخلق رياضيين أكثر شمولية ومرونة."
          }
        ],
        excerpt: "اكتشف كيف يمكن للتدريب المتقاطع مع رياضات متعددة أن يعزز الأداء الرياضي ويقلل من مخاطر الإصابة."
      }
    },
    category: "all-sports-hub", 
    tags: ["training", "multi-sport", "performance"],
    status: "published"
  }
];

async function seedArticles() {
  try {
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/ptc-blog');
    console.log('Connected to MongoDB');

    // Find an existing user or create a default one
    let author = await User.findOne();
    if (!author) {
      const bcrypt = require('bcryptjs');
      const salt = await bcrypt.genSalt(10);
      const hashedPassword = await bcrypt.hash('password123', salt);
      
      author = new User({
        name: 'Sedki B.Haouala',
        email: 'admin@example.com',
        password: hashedPassword,
        role: 'admin'
      });
      await author.save();
      console.log('Created default user');
    }

    // Check if sample articles already exist (don't delete user-created articles!)
    const existingArticles = await Article.find({});
    console.log(`Found ${existingArticles.length} existing articles - preserving them`);
    
    if (existingArticles.length > 0) {
      console.log('Articles already exist in database. Skipping seeding to preserve existing content.');
      console.log('If you want to add sample articles, please do so through the admin interface.');
      process.exit(0);
    }

    // Create sample articles with staggered publish dates for proper sorting
    const now = new Date();
    for (let i = 0; i < sampleArticles.length; i++) {
      const articleData = sampleArticles[i];
      // Create articles with recent dates - each article 1 day earlier from today
      const publishDate = new Date(now.getTime() - (i * 24 * 60 * 60 * 1000)); 
      
      const article = new Article({
        ...articleData,
        author: author._id,
        authorImage: '/uploads/profile/bild3.jpg',
        image: '/uploads/default-author.webp',
        publishedAt: publishDate,
        createdAt: publishDate,
        updatedAt: publishDate,
        // Initialize counters to 0 for dynamic functionality
        likes: { count: 0, users: [] },
        views: 0,
        commentCount: 0,
        shares: { count: 0, platforms: { twitter: 0, facebook: 0, linkedin: 0 } }
      });
      
      await article.save();
      console.log(`Created article: ${article.translations.en.title}`);
      console.log(`  - Slug: ${article.slug}`);
      console.log(`  - Published: ${publishDate.toISOString()}`);
      console.log(`  - ID: ${article._id}`);
    }

    console.log('Successfully seeded articles with published status and proper dates!');
    process.exit(0);
  } catch (error) {
    console.error('Error seeding articles:', error);
    process.exit(1);
  }
}

if (require.main === module) {
  seedArticles();
} 