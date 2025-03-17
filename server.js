const express = require('express');
const path = require('path');
const bodyParser = require('body-parser');
const crypto = require('crypto'); 
const users = require('./src/loadUsers'); // Array to store user data
const session = require("express-session");


const requestHandler = require("./src/requestHandler");
//const swapConfig = require('./src/config/swapConfig');  
//const swap = swapConfig.default;

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(bodyParser.urlencoded({ extended: true }));
app.use(express.urlencoded({ extended: true }));
app.use(bodyParser.json());

// 🔐 Configure session
app.use(session({
    secret: "petuteDWY", //  
    resave: false,
    saveUninitialized: true,
    cookie: { secure: false } // Set to true in production with HTTPS
}));

app.use(express.static(path.join(__dirname, 'public'))); // Serve static files (CSS, images, JS)
app.use(express.static(path.join(__dirname, 'uploads'))); // Serve static files (CSS, images, JS)

// Set EJS as the templating engine
app.set('view engine', 'ejs');
 
// Store exchange rates globally
app.locals.rates = {}; // Initialize an empty object
app.locals.currencies = {};
app.locals.users = users;
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
    res.render('contact', { 
        title: "Contact Us", 
        intro:'We’d love to hear from you! Whether you have a question, feedback, or need assistance, feel free to reach out.',
        phone: '+1 (437) 766 2790',
        email: 'urtchman04@yahoo.co.uk',
        address: '45 Autumn Glen Circle, Etobicoke M9W 6B3'
    });
});

// My Account Page
app.get('/login', (req, res) => {
    const errorMessage = req.query.error ? "Invalid email or password. Try again." : "";
    res.render('login', { title: "Login",  errorMessage});
});

app.post("/login", (req, res) => {
    const { email, password } = req.body;

    console.log(`🔍 Login Attempt: ${email}`);

    // Find user by email
    const user = users.find(user => user.email === email);

    if (!user) {
        console.log("❌ User not found");
        return res.status(401).send("Invalid email or password");
    }

    // Hash input password to compare (since stored passwords are hashed)
    const inputHash = generateSHA1Hash(password); 
    if (user.password === inputHash) {
        console.log(`✅ Login successful for ${email}`);
         // Store user data in session
         req.session.user = {
            id: user.id,
            name: user.name,
            email: user.email,
            passport: user.passport,
            last_login: user.last_login,
            status: 1,
            logs: user.logs+1
        };
        return res.redirect("/dashboard"); // Redirect to dashboard
    } else {
        console.log("❌ Invalid password");
        return res.redirect("/login?error=invalid"); // Redirect to dashboard
    }
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

// 🔐 Middleware to protect routes
const isAuthenticated = (req, res, next) => {
    if (req.session.user) {
        next(); // User is logged in, proceed
    } else {
        res.redirect("/login"); // Redirect to login if not authenticated
    }
};

// 🏠 PROTECTED DASHBOARD Route
app.get("/dashboard", isAuthenticated, (req, res) => {
    const wallet = getWalletByUserId(req.session.user.id);
    res.render('dashboard', {title: 'Dashboard', user: req.session.user, wallet});
});

// 🚪 LOGOUT Route
app.get("/logout", (req, res) => {
    req.session.destroy(() => {
        res.redirect("/login"); // Redirect to login after logout
    });
});

function generateSHA1Hash(data) {
    return crypto.createHash('sha1').update(data).digest('hex');
}

// Function to fetch wallet details by user_id
function getWalletByUserId(userId) {
    return new Promise((resolve, reject) => {
      const results = [];
  
      fs.createReadStream('db/wallets.csv')  
        .pipe(csv())
        .on('data', (row) => {
          if (row.user_id == userId) {  // Matching the user_id
            results.push({
              id: row.user_id,
              naira: parseFloat(row.naira),
              cad: parseFloat(row.cad),
              usd: parseFloat(row.usd),
              gbp: parseFloat(row.gbp),
              euro: parseFloat(row.euro),
              created_at: row.created_at,
              updated_at: row.updated_at
            });
          }
        })
        .on('end', () => {
          if (results.length > 0) {
            resolve(results[0]);  // Return the first matched user wallet
          } else {
            reject('User not found.');
          }
        })
        .on('error', (err) => {
          reject(err);
        });
    });
  }
// Start Server
app.listen(PORT, () => {
    console.log(`Server is running on http://localhost:${PORT}`);
});
