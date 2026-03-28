const express = require('express');
const Book = require('../models/Book');
const BorrowHistory = require('../models/BorrowHistory');
const Prebook = require('../models/Prebook');
const Notification = require('../models/Notification');
const router = express.Router();
const auth = require('../middleware/auth');

const handlePrebooks = async (book) => {
    try {
        const pendingPrebooks = await Prebook.find({ bookId: book._id, status: 'pending' });
        for (const prebook of pendingPrebooks) {
            prebook.status = 'fulfilled';
            await prebook.save();

            const notification = new Notification({
                userId: prebook.userId,
                message: `Good news! The book "${book.title}" you pre-booked is now available to borrow.`
            });
            await notification.save();
        }
    } catch (err) {
        console.error('Prebook handling error:', err.message);
    }
};

// Auto-restock: Return overdue books (past 10 days)
const autoRestockOverdueBooks = async () => {
    try {
        const now = new Date();
        const overdueBooks = await BorrowHistory.find({
            returned: false,
            dueDate: { $lte: now }
        });

        for (const record of overdueBooks) {
            record.returned = true;
            record.returnDate = now;
            await record.save();

            const updatedBook = await Book.findByIdAndUpdate(record.bookId, {
                $inc: { availableCount: 1 }
            }, { new: true });

            if (updatedBook && updatedBook.availableCount === 1) {
                await handlePrebooks(updatedBook);
            }
        }
    } catch (err) {
        console.error('Auto-restock error:', err.message);
    }
};

// Get all categories with counts
router.get('/categories', async (req, res) => {
    try {
        const categories = await Book.aggregate([
            {
                $group: {
                    _id: "$category",
                    count: { $sum: "$totalCount" }
                }
            },
            {
                $sort: { _id: 1 } // Sort alphabetically by category name
            }
        ]);
        res.json(categories);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});


// Search books by title, author, or category
router.get('/search', async (req, res) => {
    try {
        // Auto-restock overdue books first
        await autoRestockOverdueBooks();

        const { query } = req.query;
        if (!query) {
            return res.json([]);
        }

        // Create a regex for "starts with" (case-insensitive)
        const searchRegex = new RegExp('^' + query, 'i');

        const books = await Book.find({
            $or: [
                { title: searchRegex },
                { author: searchRegex },
                { category: searchRegex }
            ]
        });
        res.json(books);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// Get books by category
router.get('/category/:category', async (req, res) => {
    try {
        // Auto-restock overdue books first
        await autoRestockOverdueBooks();

        const books = await Book.find({ category: req.params.category });
        res.json(books);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

module.exports = router;
