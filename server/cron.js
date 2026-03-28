const cron = require('node-cron');
const Book = require('./models/Book');

// Run this job at 00:00 on day-of-month 1 (Monthly)
cron.schedule('0 0 1 * *', async () => {
    console.log('Running monthly restock and cleanup job...');
    try {
        // 1. Find the highest borrowed book
        const highestBorrowed = await Book.findOne().sort({ borrowCount: -1 }).select('_id title borrowCount').lean();
        if (highestBorrowed) {
            await Book.findByIdAndUpdate(highestBorrowed._id, {
                $inc: { totalCount: 5, availableCount: 5 }
            });
            console.log(`Monthly Restock: Highly borrowed book "${highestBorrowed.title}" restocked by 5.`);
        }

        // 2. Find the lowest borrowed book
        // Only target books that have less borrowing compared to others, but we must ensure they have at least 2 available count so we don't go negative.
        const lowestBorrowed = await Book.findOne({ availableCount: { $gte: 2 }, totalCount: { $gt: 2 } })
            .sort({ borrowCount: 1 })
            .select('_id title borrowCount').lean();
            
        if (lowestBorrowed) {
            // Also ensure we are not randomly reducing the exact SAME book if there's only 1 book in DB!
            if (!highestBorrowed || highestBorrowed._id.toString() !== lowestBorrowed._id.toString()) {
                await Book.findByIdAndUpdate(lowestBorrowed._id, {
                    $inc: { totalCount: -2, availableCount: -2 }
                });
                console.log(`Monthly Cleanup: Lowest borrowed book "${lowestBorrowed.title}" decreased by 2.`);
            }
        }
        console.log('Monthly job completed successfully.');
    } catch (error) {
        console.error('Error running monthly job:', error);
    }
});
