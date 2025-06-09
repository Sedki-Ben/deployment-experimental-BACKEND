const express = require('express');
const cors = require('cors');

const app = express();

// Middleware
app.use(cors());
app.use(express.json());

// Test route
app.get('/', (req, res) => {
    res.json({ message: 'Test server is working!' });
});

// Test article like endpoint (without database)
app.post('/api/articles/:id/like', (req, res) => {
    console.log('Like request received for article:', req.params.id);
    res.json({ 
        likes: 5,
        isLiked: true,
        message: 'Test like response'
    });
});

// Test comment endpoint (without database)
app.post('/api/comments/article/:articleId', (req, res) => {
    console.log('Comment request received for article:', req.params.articleId);
    console.log('Comment content:', req.body);
    res.json({ 
        _id: 'test-comment-id',
        content: req.body.content,
        author: { name: 'Test User' },
        createdAt: new Date(),
        message: 'Test comment response'
    });
});

const PORT = 5001; // Use different port to avoid conflicts
app.listen(PORT, () => {
    console.log(`Test server running on port ${PORT}`);
}); 
 