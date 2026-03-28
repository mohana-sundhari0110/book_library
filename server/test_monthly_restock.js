const mongoose = require('mongoose');
const Book = require('./models/Book');
require('dotenv').config();

async function testMonthlyRestock() {
    try {
        await mongoose.connect(process.env.MONGO_URI || 'mongodb://localhost:27017/smart-library');
        console.log('Connected to Database. \n--- Running Simulation of Monthly Restock ---');
        
        // 1. Find the highest borrowed book
        const highestBorrowed = await Book.findOne().sort({ borrowCount: -1 }).select('_id title borrowCount totalCount availableCount').lean();
        if (highestBorrowed) {
            console.log(`\n[HIGHEST BORROWED BOOK]`);
            console.log(`Title: "${highestBorrowed.title}"`);
            console.log(`Stats Before -> Borrows: ${highestBorrowed.borrowCount}, Total Copies: ${highestBorrowed.totalCount}, Available: ${highestBorrowed.availableCount}`);
            
            await Book.findByIdAndUpdate(highestBorrowed._id, {
                $inc: { totalCount: 5, availableCount: 5 }
            });
            console.log(`Result -> Restocked 5 copies!`);
        } else {
            console.log('\n[HIGHEST BORROWED BOOK]\nNo books found.');
        }

        // 2. Find the lowest borrowed book
        const lowestBorrowed = await Book.findOne({ availableCount: { $gte: 2 }, totalCount: { $gt: 2 } })
            .sort({ borrowCount: 1 })
            .select('_id title borrowCount totalCount availableCount').lean();
            
        if (lowestBorrowed && (!highestBorrowed || highestBorrowed._id.toString() !== lowestBorrowed._id.toString())) {
            console.log(`\n[LOWEST BORROWED BOOK]`);
            console.log(`Title: "${lowestBorrowed.title}"`);
            console.log(`Stats Before -> Borrows: ${lowestBorrowed.borrowCount}, Total Copies: ${lowestBorrowed.totalCount}, Available: ${lowestBorrowed.availableCount}`);
            
            await Book.findByIdAndUpdate(lowestBorrowed._id, {
                $inc: { totalCount: -2, availableCount: -2 }
            });
            console.log(`Result -> Removed 2 underperforming copies.`);
        } else {
            console.log('\n[LOWEST BORROWED BOOK]\nNo valid low-borrowed book found (must have at least 2 copies available and cannot be the highest borrowed book).');
        }

        console.log('\n--- Simulation complete! ---');
        process.exit(0);
    } catch (err) {
        console.error(err);
        process.exit(1);
    }
}

testMonthlyRestock();
