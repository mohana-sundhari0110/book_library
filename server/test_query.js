const mongoose = require('mongoose');
const Book = require('./models/Book');
require('dotenv').config();

mongoose.connect(process.env.MONGO_URI || 'mongodb://localhost:27017/smart-library')
    .then(async () => {
        console.log("Connected to DB");
        const res = await Book.aggregate([
            {
                $group: {
                    _id: "$category",
                    count: { $sum: 1 }
                }
            },
            {
                $sort: { _id: 1 }
            }
        ]);
        console.log(JSON.stringify(res));
        process.exit(0);
    })
    .catch(console.error);
