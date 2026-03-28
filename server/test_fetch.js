const mongoose = require('mongoose');
const User = require('./models/User');
const bcrypt = require('bcryptjs');
require('dotenv').config();

const testApi = async () => {
    try {
        await mongoose.connect(process.env.MONGO_URI || 'mongodb://localhost:27017/smart-library');
        let user = await User.findOne({ email: 'test_borrow@example.com' });
        if (!user) {
            const salt = await bcrypt.genSalt(10);
            const hashedPassword = await bcrypt.hash('password123', salt);
            user = new User({ username: 'test_borrow', email: 'test_borrow@example.com', password: hashedPassword });
            await user.save();
        }

        const loginRes = await fetch('http://127.0.0.1:5000/api/auth/login', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email: 'test_borrow@example.com', password: 'password123' })
        });
        const loginData = await loginRes.json();
        const token = loginData.token;

        const searchRes = await fetch('http://127.0.0.1:5000/api/books/search?query=Harry');
        const books = await searchRes.json();
        const book = books[0];
        console.log(`Found: ${book.title}, Available: ${book.availableCount}`);

        const borrowRes = await fetch('http://127.0.0.1:5000/api/borrow', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify({ bookId: book._id })
        });
        console.log("Borrow status:", borrowRes.status);
        console.log("Borrow response:", await borrowRes.text());

        const rateRes = await fetch('http://127.0.0.1:5000/api/borrow/rate', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify({ bookId: book._id, rating: 5 })
        });
        console.log("Rate status:", rateRes.status);
        console.log("Rate response:", await rateRes.text());
        process.exit();
    } catch (err) {
        console.error(err);
        process.exit(1);
    }
}
testApi();
