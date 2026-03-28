const express = require('express');
const BorrowHistory = require('../models/BorrowHistory');
const Book = require('../models/Book');
const Rating = require('../models/Rating');
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

        if (overdueBooks.length > 0) {
            console.log(`Auto-restocked ${overdueBooks.length} overdue book(s)`);
        }
    } catch (err) {
        console.error('Auto-restock error:', err.message);
    }
};

// Borrow a book
router.post('/', auth, async (req, res) => {
    try {
        // Auto-restock overdue books first
        await autoRestockOverdueBooks();

        const { bookId } = req.body;
        const userId = req.user.id;

        const book = await Book.findById(bookId);
        if (!book) {
            return res.status(404).json({ message: 'Book not found' });
        }

        if (book.availableCount <= 0) {
            return res.status(400).json({ message: 'Book is not available for borrowing' });
        }

        const dueDate = new Date();
        dueDate.setDate(dueDate.getDate() + 10);

        const borrow = new BorrowHistory({ userId, bookId, dueDate });
        await borrow.save();

        await Book.findByIdAndUpdate(bookId, {
            $inc: { borrowCount: 1, availableCount: -1 }
        });

        res.status(201).json({
            message: 'Book borrowed successfully',
            dueDate: dueDate
        });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// Return a book
router.post('/return', auth, async (req, res) => {
    try {
        const { borrowId } = req.body;
        const userId = req.user.id;

        const borrowRecord = await BorrowHistory.findOne({
            _id: borrowId,
            userId: userId,
            returned: false
        });

        if (!borrowRecord) {
            return res.status(404).json({ message: 'Borrow record not found or already returned' });
        }

        borrowRecord.returned = true;
        borrowRecord.returnDate = new Date();
        await borrowRecord.save();

        const updatedBook = await Book.findByIdAndUpdate(borrowRecord.bookId, {
            $inc: { availableCount: 1 }
        }, { new: true });

        if (updatedBook && updatedBook.availableCount === 1) {
            await handlePrebooks(updatedBook);
        }

        res.status(200).json({ message: 'Book returned successfully' });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// Get user's borrowed books (not returned)
router.get('/my-books', auth, async (req, res) => {
    try {
        const userId = req.user.id;
        const borrowedBooks = await BorrowHistory.find({
            userId: userId,
            returned: false
        }).populate('bookId');

        res.status(200).json(borrowedBooks);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// Rate a book
router.post('/rate', auth, async (req, res) => {
    try {
        const { bookId, rating } = req.body;
        const userId = req.user.id;

        const newRating = new Rating({ userId, bookId, rating });
        await newRating.save();

        // Update average rating
        const book = await Book.findById(bookId);
        const currentTotal = book.totalRatings || 0;
        const currentAvg = book.averageRating || 0;
        
        const totalRatingSum = (currentAvg * currentTotal) + rating;
        const newTotalRatings = currentTotal + 1;
        const newAverageRating = totalRatingSum / newTotalRatings;

        await Book.findByIdAndUpdate(bookId, {
            averageRating: newAverageRating,
            totalRatings: newTotalRatings
        });

        res.status(201).json({ message: 'Rating submitted' });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// Pre-book a book
router.post('/prebook', auth, async (req, res) => {
    try {
        const { bookId } = req.body;
        const userId = req.user.id;

        const book = await Book.findById(bookId);
        if (!book) {
            return res.status(404).json({ message: 'Book not found' });
        }

        if (book.availableCount > 0) {
            return res.status(400).json({ message: 'Book is available. You can borrow it directly.' });
        }

        // Check if already pre-booked
        const existingPrebook = await Prebook.findOne({ userId, bookId, status: 'pending' });
        if (existingPrebook) {
            return res.status(400).json({ message: 'You have already pre-booked this book' });
        }

        const prebook = new Prebook({ userId, bookId });
        await prebook.save();

        res.status(201).json({ message: 'Book pre-booked successfully. You will be notified when it becomes available.' });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

module.exports = router;

