const express = require('express');
const path = require('path');
const bodyParser = require('body-parser');

const requestHandler = require("./src/requestHandler");
//const swapConfig = require('./src/config/swapConfig');  
//const swap = swapConfig.default;

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(bodyParser.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname, 'public'))); // Serve static files (CSS, images, JS)

// Set EJS as the templating engine
app.set('view engine', 'ejs');
 
// Store exchange rates globally
app.locals.rates = {}; // Initialize an empty object
app.locals.currencies = {};

// Fetch Naira exchange rates at server startup and store them in app.locals
(async () => {
    try { 
        app.locals.rates = await requestHandler.getNairaRates(); // Store rates globally 
    } catch (error) {
        console.error("Failed to fetch Naira exchange rates:", error.message);
    }
    try { 
        app.locals.currencies = await requestHandler.getSupportedCurrencies(); // Store currencies globally
        app.locals.currencies = Object.entries(app.locals.currencies)
        .sort(([, valueA], [, valueB]) => valueA.localeCompare(valueB))
        .reduce((acc, [key, value]) => {
            acc[key] = value;
            return acc;
        }, {}); 
    } catch (error) {
        console.error("Failed to fetch Naira exchange rates:", error.message);
    }
    try { 
        app.locals.exchangeRates = await requestHandler.exchangeRates('USD'); // Store exchange rates globally 
        const rates2 = {};
        for (const key in app.locals.exchangeRates) {
            if (app.locals.exchangeRates.hasOwnProperty(key)) {
                rates2[key.slice(-3)] = app.locals.exchangeRates[key];
            }
        }
        app.locals.exchangeRates = rates2;
        //console.log(app.locals.exchangeRates)
    } catch (error) {
        console.error("Failed to fetch exchange rates:", error.message);
    }
    
})();
// Homepage Route
app.get('/', async (req, res) => {  
    res.render('index', { title: "Naira Swap - Home", exchangeRates:app.locals.exchangeRates, rates: app.locals.rates });
});

// Exchange Rates Page
app.get('/exchange-rates', (req, res) => { 
    res.render('exchange-rates', { title: "Exchange Rates", exchangeRates:app.locals.exchangeRates, currencies: app.locals.currencies });
});

// About Page
app.get('/about', (req, res) => {
    const aboutData = {
        intro: 'Naira Swap is a trusted exchange platform that offers seamless currency exchange services between the Nigerian Naira (NGN) and other major currencies.',
        mission: 'To provide fast, secure, and transparent currency exchange services, ensuring customers get the best rates with maximum convenience.',
        vision: 'To become the leading exchange platform for the Nigerian Naira, bridging the gap between global currencies through technology and innovation.',
        coreValues: [
            {title: 'Transparency', desc: 'Providing real-time and fair exchange rates.'},
            {title: 'Security', desc: 'Ensuring all transactions are safe and secure'},
            {title: 'Customer Satisfaction', desc: 'Prioritizing the needs of our users.'},
            {title: 'Innovation', desc: 'Leveraging technology for better exchange solutions.'},
            {title: 'Integrity', desc: 'Upholding honesty and trustworthiness in all operations.'}
        ]
    }
    res.render('about', { title: "About Naira Swap", content:aboutData });
});

// Contact Page
app.get('/contact', (req, res) => {
    res.render('contact', { title: "Contact Us" });
});

// My Account Page
app.get('/login', (req, res) => {
    res.render('login', { title: "My Account" });
});

// My Account Page
app.post('/api/rates', async(req, res) => {
    app.locals.exchangeRates = await requestHandler.exchangeRates(); // Store exchange rates globally 
    const rates2 = {};
    for (const key in app.locals.exchangeRates) {
        if (app.locals.exchangeRates.hasOwnProperty(key)) {
            rates2[key.slice(-3)] = app.locals.exchangeRates[key];
        }
    }
    app.locals.exchangeRates = rates2;
    res.json(app.locals.exchangeRates);
});

// Start Server
app.listen(PORT, () => {
    console.log(`Server is running on http://localhost:${PORT}`);
});
