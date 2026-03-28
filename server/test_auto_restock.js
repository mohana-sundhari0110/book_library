const mongoose = require('mongoose');
const BorrowHistory = require('./models/BorrowHistory');
const Book = require('./models/Book');
const User = require('./models/User');
require('dotenv').config();

async function testAutoRestock() {
    await mongoose.connect(process.env.MONGO_URI || 'mongodb://localhost:27017/smart-library');
    console.log("Connected to DB");

    const book = await Book.findOne();
    const user = await User.findOne();

    console.log(`Before restock -> Book: ${book.title}, Available count: ${book.availableCount}`);

    // Create a mock overdue borrow record
    const overdueDate = new Date();
    overdueDate.setDate(overdueDate.getDate() - 5); // 5 days ago (overdue)

    const borrow = new BorrowHistory({
        userId: user._id,
        bookId: book._id,
        dueDate: overdueDate,
        borrowDate: new Date(overdueDate.getTime() - 10 * 24 * 60 * 60 * 1000)
    });

    // Decrease book count to simulate it being borrowed
    book.availableCount -= 1;
    await book.save();

    await borrow.save();

    console.log(`Created overdue borrow record ${borrow._id} for book ${book.title}`);
    console.log(`Book count decremented. Available: ${book.availableCount}`);

    // Run the restock function
    const now = new Date();
    const overdueBooks = await BorrowHistory.find({
        returned: false,
        dueDate: { $lte: now }
    });

    console.log(`Found ${overdueBooks.length} overdue books`);

    for (const record of overdueBooks) {
        record.returned = true;
        record.returnDate = now;
        await record.save();

        await Book.findByIdAndUpdate(record.bookId, {
            $inc: { availableCount: 1 }
        });
    }

    // Check book count again
    const updatedBook = await Book.findById(book._id);
    console.log(`After restock -> Book: ${book.title}, Available count: ${updatedBook.availableCount}`);

    process.exit(0);
}

testAutoRestock();
