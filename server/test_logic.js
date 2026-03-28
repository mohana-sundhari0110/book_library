const mongoose = require('mongoose');
const Book = require('./models/Book');
require('dotenv').config();

async function testRatings() {
    await mongoose.connect(process.env.MONGO_URI || 'mongodb://localhost:27017/smart-library');
    console.log("Connected to DB");

    const book = await Book.findOne({ _id: "69a593e1fb65838257b91558" }); // Note: I'll just find any book for safety
    if (!book) {
        console.log("No book found for testing.");
        process.exit();
    }
    console.log(`Before Rating -> averageRating: ${book.averageRating}, totalRatings: ${book.totalRatings}`);

    // Simulate Rating route logic exactly
    const rating = 4;
    const totalRatingSum = (book.averageRating * book.totalRatings) + rating;
    const newTotalRatings = book.totalRatings + 1;
    const newAverageRating = totalRatingSum / newTotalRatings;

    console.log(`calculation -> sum: ${totalRatingSum}, newTotal: ${newTotalRatings}, newAvg: ${newAverageRating}`);

    // Test restock logic
    const BorrowHistory = require('./models/BorrowHistory');
    const now = new Date();
    const overdueBooks = await BorrowHistory.find({
        returned: false,
        dueDate: { $lte: now }
    });
    console.log("Found overdue books to restock:", overdueBooks.length);

    process.exit(0);
}

testRatings();
