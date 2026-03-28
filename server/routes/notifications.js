const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');
const Notification = require('../models/Notification');

// Get all notifications for the logged-in user
router.get('/', auth, async (req, res) => {
    try {
        const notifications = await Notification.find({ userId: req.user.id })
            .sort({ createdAt: -1 });
        res.status(200).json(notifications);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// Mark all notifications as read
router.put('/read', auth, async (req, res) => {
    try {
        await Notification.updateMany(
            { userId: req.user.id, read: false },
            { $set: { read: true } }
        );
        res.status(200).json({ message: 'Notifications marked as read' });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

module.exports = router;
