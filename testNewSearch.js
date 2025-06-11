const mongoose = require('mongoose');
const dotenv = require('dotenv');
const { searchArticles } = require('./controllers/articleController');

dotenv.config();

// Mock request and response objects
function createMockReqRes(query) {
    const req = {
        query: query
    };
    
    const res = {
        data: null,
        status: 200,
        json: function(data) {
            this.data = data;
            console.log('Response:', JSON.stringify(data, null, 2));
            return this;
        },
        status: function(code) {
            this.status = code;
            return this;
        }
    };
    
    return { req, res };
}

async function testNewSearch() {
    try {
        await mongoose.connect(process.env.MONGODB_URI);
        console.log('Connected to MongoDB');

        // Test 1: Search for "pep" (should find the article with that title)
        console.log('\n=== TEST 1: Search for "pep" ===');
        const { req: req1, res: res1 } = createMockReqRes({ q: 'pep', limit: '5' });
        await searchArticles(req1, res1);

        // Test 2: Search for "guardiola" (should find content match)
        console.log('\n=== TEST 2: Search for "guardiola" ===');
        const { req: req2, res: res2 } = createMockReqRes({ q: 'guardiola', limit: '5' });
        await searchArticles(req2, res2);

        // Test 3: Search for "colombia" (should find French title match)
        console.log('\n=== TEST 3: Search for "colombia" ===');
        const { req: req3, res: res3 } = createMockReqRes({ q: 'colombia', limit: '5' });
        await searchArticles(req3, res3);

        // Test 4: Search for non-existent term
        console.log('\n=== TEST 4: Search for "nonexistent" ===');
        const { req: req4, res: res4 } = createMockReqRes({ q: 'nonexistent', limit: '5' });
        await searchArticles(req4, res4);

        // Test 5: Search with category filter
        console.log('\n=== TEST 5: Search for "pep" in etoile-du-sahel category ===');
        const { req: req5, res: res5 } = createMockReqRes({ q: 'pep', category: 'etoile-du-sahel', limit: '5' });
        await searchArticles(req5, res5);

        await mongoose.connection.close();
        console.log('\nAll tests completed!');
        
    } catch (error) {
        console.error('Test failed:', error);
        await mongoose.connection.close();
        process.exit(1);
    }
}

testNewSearch(); 