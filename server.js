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
        app.locals.exchangeRates = await requestHandler.exchangeRates(); // Store exchange rates globally 
        const rates2 = {};
        for (const key in app.locals.exchangeRates) {
            if (app.locals.exchangeRates.hasOwnProperty(key)) {
                rates2[key.slice(-3)] = app.locals.exchangeRates[key];
            }
        }
        app.locals.exchangeRates = rates2;
        console.log(app.locals.exchangeRates)
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
    res.render('about', { title: "About Naira Swap" });
});

// Contact Page
app.get('/contact', (req, res) => {
    res.render('contact', { title: "Contact Us" });
});

// My Account Page
app.get('/login', (req, res) => {
    res.render('login', { title: "My Account" });
});

// Start Server
app.listen(PORT, () => {
    console.log(`Server is running on http://localhost:${PORT}`);
});
