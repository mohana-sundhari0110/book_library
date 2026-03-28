const mongoose = require('mongoose');
const Book = require('./models/Book');
const User = require('./models/User');
const BorrowHistory = require('./models/BorrowHistory');
const Rating = require('./models/Rating');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
require('dotenv').config();

mongoose.connect(process.env.MONGO_URI || 'mongodb://localhost:27017/smart-library')
    .then(async () => {
        console.log("Connected to DB");

        // 1. Create a mock user
        let user = await User.findOne({ email: 'test_borrow@example.com' });
        if (!user) {
            const salt = await bcrypt.genSalt(10);
            const hashedPassword = await bcrypt.hash('password123', salt);
            user = new User({ username: 'test_borrow', email: 'test_borrow@example.com', password: hashedPassword });
            await user.save();
        }

        // 2. Generate token
        const payload = {
            user: {
                id: user.id,
                username: user.username,
                email: user.email,
                role: user.role
            }
        };
        const token = jwt.sign(payload, process.env.JWT_SECRET || 'secretkey', { expiresIn: '1h' });

        // 3. Find a book to borrow
        const book = await Book.findOne();
        if (!book) {
            console.log("No books found");
            process.exit(1);
        }

        console.log(`Testing with Book: ${book.title} (${book._id}), Available: ${book.availableCount}`);

        // 4. Simulate the borrow route logic
        try {
            // ... (Testing logic to mock the controller directly)
            const dueDate = new Date();
            dueDate.setDate(dueDate.getDate() + 10);

            const borrow = new BorrowHistory({ userId: user.id, bookId: book._id, dueDate });
            await borrow.save();
            console.log("Borrow successful, ID:", borrow._id);
            console.log("Borrow details:", JSON.stringify(borrow));

            const rating = new Rating({ userId: user.id, bookId: book._id, rating: 5 });
            await rating.save();
            console.log("Rating successful, ID:", rating._id);
            console.log("Rating details:", JSON.stringify(rating));

        } catch (err) {
            console.error("Simulation error:", err);
        }

        process.exit(0);
    })
    .catch(console.error);
