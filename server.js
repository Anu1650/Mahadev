require('dotenv').config();
const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const session = require('express-session');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 5000;
const MONGO_URI = process.env.MONGO_URI || 'mongodb://localhost:27017/temple_db';
const ADMIN_PASS = process.env.ADMIN_PASS || 'admin123';

app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname)));
app.use(session({
    secret: 'rameshwar-mahadev-secret-key-2025',
    resave: false,
    saveUninitialized: false,
    cookie: { maxAge: 3600000 }
}));

mongoose.connect(MONGO_URI)
    .then(() => console.log('MongoDB connected'))
    .catch(err => console.log('MongoDB connection error:', err.message));

const donationSchema = new mongoose.Schema({
    name: { type: String, required: true },
    amount: { type: Number, required: true },
    email: { type: String, required: true },
    createdAt: { type: Date, default: Date.now }
});

const pujaBookingSchema = new mongoose.Schema({
    name: { type: String, required: true },
    phone: { type: String, required: true },
    email: { type: String, required: true },
    puja: { type: String, required: true },
    price: { type: Number, required: true },
    date: { type: String, required: true },
    message: { type: String, default: '' },
    createdAt: { type: Date, default: Date.now }
});

const contactSchema = new mongoose.Schema({
    name: { type: String, required: true },
    email: { type: String, required: true },
    phone: { type: String, default: '' },
    message: { type: String, required: true },
    createdAt: { type: Date, default: Date.now }
});

const Donation = mongoose.model('Donation', donationSchema);
const PujaBooking = mongoose.model('PujaBooking', pujaBookingSchema);
const Contact = mongoose.model('Contact', contactSchema);

function requireAdmin(req, res, next) {
    if (req.session && req.session.isAdmin) return next();
    return res.status(401).json({ error: 'Unauthorized' });
}

app.post('/api/donation', async (req, res) => {
    try {
        const { name, amount, email } = req.body;
        if (!name || !amount || !email) return res.status(400).json({ error: 'All fields required' });
        const donation = new Donation({ name, amount, email });
        await donation.save();
        res.json({ success: true, message: `Thank you ${name}! Donation ₹${amount} received. Har Har Mahadev!` });
    } catch (err) {
        res.status(500).json({ error: 'Server error' });
    }
});

app.post('/api/puja-booking', async (req, res) => {
    try {
        const { name, phone, email, puja, price, date, message } = req.body;
        if (!name || !phone || !email || !puja || !price || !date) return res.status(400).json({ error: 'All fields required' });
        const booking = new PujaBooking({ name, phone, email, puja, price, date, message });
        await booking.save();
        res.json({ success: true, message: `🙏 ${puja} booked for ${name} on ${date}. Priest will contact you at ${phone}.` });
    } catch (err) {
        res.status(500).json({ error: 'Server error' });
    }
});

app.post('/api/contact', async (req, res) => {
    try {
        const { name, email, phone, message } = req.body;
        if (!name || !email || !message) return res.status(400).json({ error: 'Name, email and message required' });
        const contact = new Contact({ name, email, phone, message });
        await contact.save();
        res.json({ success: true, message: `Thank you ${name}! We will get back to you soon.` });
    } catch (err) {
        res.status(500).json({ error: 'Server error' });
    }
});

app.post('/api/admin/login', (req, res) => {
    const { password } = req.body;
    if (password === ADMIN_PASS) {
        req.session.isAdmin = true;
        return res.json({ success: true });
    }
    res.status(401).json({ error: 'Invalid password' });
});

app.post('/api/admin/logout', (req, res) => {
    req.session.destroy();
    res.json({ success: true });
});

app.get('/api/admin/stats', requireAdmin, async (req, res) => {
    try {
        const donations = await Donation.countDocuments();
        const totalAmount = await Donation.aggregate([{ $group: { _id: null, total: { $sum: '$amount' } } }]);
        const bookings = await PujaBooking.countDocuments();
        const contacts = await Contact.countDocuments();
        res.json({
            donations,
            totalAmount: totalAmount[0]?.total || 0,
            bookings,
            contacts
        });
    } catch (err) {
        res.status(500).json({ error: 'Server error' });
    }
});

app.get('/api/admin/donations', requireAdmin, async (req, res) => {
    try {
        const donations = await Donation.find().sort({ createdAt: -1 });
        res.json(donations);
    } catch (err) {
        res.status(500).json({ error: 'Server error' });
    }
});

app.get('/api/admin/puja-bookings', requireAdmin, async (req, res) => {
    try {
        const bookings = await PujaBooking.find().sort({ createdAt: -1 });
        res.json(bookings);
    } catch (err) {
        res.status(500).json({ error: 'Server error' });
    }
});

app.get('/api/admin/contacts', requireAdmin, async (req, res) => {
    try {
        const contacts = await Contact.find().sort({ createdAt: -1 });
        res.json(contacts);
    } catch (err) {
        res.status(500).json({ error: 'Server error' });
    }
});

app.delete('/api/admin/donation/:id', requireAdmin, async (req, res) => {
    try {
        await Donation.findByIdAndDelete(req.params.id);
        res.json({ success: true });
    } catch (err) {
        res.status(500).json({ error: 'Server error' });
    }
});

app.delete('/api/admin/booking/:id', requireAdmin, async (req, res) => {
    try {
        await PujaBooking.findByIdAndDelete(req.params.id);
        res.json({ success: true });
    } catch (err) {
        res.status(500).json({ error: 'Server error' });
    }
});

app.delete('/api/admin/contact/:id', requireAdmin, async (req, res) => {
    try {
        await Contact.findByIdAndDelete(req.params.id);
        res.json({ success: true });
    } catch (err) {
        res.status(500).json({ error: 'Server error' });
    }
});

app.get('/admin', (req, res) => {
    res.sendFile(path.join(__dirname, 'admin.html'));
});

app.listen(PORT, '0.0.0.0', () => {
    const { networkInterfaces } = require('os');
    const nets = networkInterfaces();
    let ip = 'localhost';
    for (const name of Object.keys(nets)) {
        for (const net of nets[name]) {
            if (net.family === 'IPv4' && !net.internal) { ip = net.address; break; }
        }
        if (ip !== 'localhost') break;
    }
    console.log(`Server running on http://localhost:${PORT}`);
    console.log(`Network access: http://${ip}:${PORT}`);
});
