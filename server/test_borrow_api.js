const axios = require('axios');
const mongoose = require('mongoose');
const User = require('./models/User');
const bcrypt = require('bcryptjs');
require('dotenv').config();

async function testApi() {
    await mongoose.connect(process.env.MONGO_URI || 'mongodb://localhost:27017/smart-library');
    console.log("Connected to DB");

    let user = await User.findOne({ email: 'test_borrow@example.com' });
    if (!user) {
        const salt = await bcrypt.genSalt(10);
        const hashedPassword = await bcrypt.hash('password123', salt);
        user = new User({ username: 'test_borrow', email: 'test_borrow@example.com', password: hashedPassword });
        await user.save();
    }

    // Login to get token
    try {
        const loginRes = await axios.post('http://127.0.0.1:5000/api/auth/login', {
            email: 'test_borrow@example.com',
            password: 'password123'
        });
        const token = loginRes.data.token;
        console.log("Got token:", token.substring(0, 20) + "...");

        // Fetch a book
        const searchRes = await axios.get('http://127.0.0.1:5000/api/books/search?query=Harry');
        const book = searchRes.data[0];
        console.log("Found book:", book.title);

        // Test Borrow
        const borrowRes = await axios.post('http://127.0.0.1:5000/api/borrow',
            { bookId: book._id },
            { headers: { Authorization: `Bearer ${token}` } }
        );
        console.log("Borrow response:", borrowRes.data);

        // Test Rate
        const rateRes = await axios.post('http://127.0.0.1:5000/api/borrow/rate',
            { bookId: book._id, rating: 5 },
            { headers: { Authorization: `Bearer ${token}` } }
        );
        console.log("Rate response:", rateRes.data);

    } catch (err) {
        console.error("API Error:");
        if (err.response) {
            console.error(err.response.status, err.response.data);
        } else {
            console.error(err.message);
        }
    }
    process.exit(0);
}

testApi();
