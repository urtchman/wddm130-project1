const express = require('express');
const path = require('path');
const bodyParser = require('body-parser');
const crypto = require('crypto'); 
const session = require("express-session");
const users = require('./src/loadUsers'); // Array to store user data
const wallets = require('./src/loadWallets'); // Array to store wallets data
const fs = require('fs');
const csvParser = require('csv-parser');


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
    secret: "petuteDWY",   
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
        return res.redirect("/login?error=invalid"); //  
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
            phone: user.phone,
            passport: user.passport,
            last_login: user.last_login,
            status: 1,
            logs: user.logs+1
        };
        return res.redirect("/dashboard"); // Redirect to dashboard
    } else {
        console.log("❌ Invalid password");
        return res.redirect("/login?error=invalid"); // Redirect to login
    }
});

app.get('/signup', (req, res) => {
    const errorMessage = req.query.error ? "Invalid email or password. Try again." : "";
    res.render('signup', { title: "Sign Up",  errorMessage});
});

// api rates
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

// api rates
app.post('/api/swap', async(req, res) => {
    const nrates = await requestHandler.getNairaRates(); //  
    //res.json( nrates);
    const rates2 = {
        cad: nrates["NGNCAD"],
        usd: nrates["NGNUSD"],
        gbp: nrates["NGNGBP"],
        eur: nrates["NGNEUR"],
        amount: req.body.amount,
        converted: nrates[`NGN${req.body.currency}`]*req.body.amount
    };
    res.json(rates2);
     
});
 

// Signup API Endpoint
app.post('/api/signup', async (req, res) => {
    try {
        const { name, phone, email, password, passport } = req.body;

        // Validate required fields
        if (!name || !phone || !email || !password || !passport) {
            return res.status(400).json({ error: 'All fields are required' });
        }

        // Check if email already exists
        const exists = await emailExists(email);
        if (exists) {
            return res.status(400).json({ error: 'Email already registered' });
        }

        // Generate unique ID
        const id = await getNextId();

        // Hash the password
        const hashedPassword = generateSHA1Hash(password);

        // Timestamps
        const timestamp = new Date().toISOString().replace('T', ' ').split('.')[0];

        // New user entry
        const newUser = `\n${id},${name},${phone},${email},${hashedPassword},${passport},0,0,null,${timestamp},${timestamp}`;

        // Append user to CSV file
        fs.appendFile('db/users.csv', newUser, (err) => {
            if (err) {
                return res.status(500).json({ error: 'Failed to save user' });
            }
            const userObject = {
                id,
                name,
                phone,  
                email,
                password: hashedPassword,
                passport,
                logs: '0',
                status: '0',
                last_login: 'null',
                created_at: timestamp,
                updated_at: timestamp
            };
            users.push(userObject);

            res.status(201).json({ message: 'Signup successful' });
        });

    } catch (error) {
        console.log({error})
        res.status(500).json({ error: 'Internal server error' });
    }
});
 
// Function to check if an email already exists
const emailExists = (email) => {
    return new Promise((resolve, reject) => {
        const users = [];
        fs.createReadStream('db/users.csv')
            .pipe(csvParser())
            .on('data', (row) => {
                users.push(row);
            })
            .on('end', () => {
                const exists = users.some(user => user.email === email);
                resolve(exists);
            })
            .on('error', (err) => reject(err));
    });
};

// Function to get the next ID
const getNextId = () => {
    return new Promise((resolve, reject) => {
        const users = [];
        fs.createReadStream('db/users.csv')
            .pipe(csvParser())
            .on('data', (row) => {
                users.push(row);
            })
            .on('end', () => {
                const nextId = users.length > 0 ? parseInt(users[users.length - 1].id) + 1 : 1;
                resolve(nextId);
            })
            .on('error', (err) => reject(err));
    });
};

// 🔐 Middleware to protect routes
const isAuthenticated = (req, res, next) => {
    if (req.session.user) {
        next(); // User is logged in, proceed
    } else {
        res.redirect("/login"); // Redirect to login if not authenticated
    }
};

const createWallet = (userId, walltet)=>{
    const dt = getDate();
    if(walltet==null)
    {
        return {
            user_id: userId,
            naira: 0,
            cad:0,
            usd:0,
            gbp:0,
            euro:0,
            created_at: dt,
            updated_at: dt
        }
    }
    return walltet;
}

function getDate() {
    const now = new Date();
    
    // Get date components
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, '0'); // Months are 0-indexed
    const day = String(now.getDate()).padStart(2, '0');
    
    // Get time components
    const hours = String(now.getHours()).padStart(2, '0');
    const minutes = String(now.getMinutes()).padStart(2, '0');
    const seconds = String(now.getSeconds()).padStart(2, '0');
    
    // Format as YYYY-MM-DD HH:MM:SS
    return `${year}-${month}-${day} ${hours}:${minutes}:${seconds}`;
}
// 🏠 PROTECTED DASHBOARD Route
app.get("/dashboard", isAuthenticated, (req, res) => {
    const wallet = createWallet(req.session.user.id, wallets.find(w => w.user_id === req.session.user.id));
    res.render('dashboard', {title: 'Dashboard', user: req.session.user, wallet});
});
// PROTECTED SWAP Route
app.get("/dashboard/swap", isAuthenticated, (req, res) => {
    const wallet = createWallet(req.session.user.id, wallets.find(w => w.user_id === req.session.user.id));
    res.render('swap', {title: 'Swap Naira || Dashboard', user: req.session.user, wallet});
});
// PROTECTED DEPOSIT Route
app.get("/dashboard/deposit", isAuthenticated, (req, res) => {
    const wallet = createWallet(req.session.user.id, wallets.find(w => w.user_id === req.session.user.id));
    res.render('deposit', {title: 'Deposit Naira || Dashboard', user: req.session.user, wallet});
});
// PROTECTED HISTORY Route
app.get("/dashboard/history", isAuthenticated, (req, res) => {
    const wallet = createWallet(req.session.user.id, wallets.find(w => w.user_id === req.session.user.id));
    const transactions = [
        {
            date: '2025-03-15 15:00:00',
            amount: 45000,
            currency: 'USD',
            convertedAmount: 28.125,
            rate: 1600
        },
        {
            date: '2025-03-15 15:00:00',
            amount: 11000,
            currency: 'CAD',
            convertedAmount: 10,
            rate: 1100
        },
    ];
    res.render('history', {title: 'Swap || Dashboard', user: req.session.user, wallet, transactions});
});

// PROTECTED SETTINGS Route
app.get("/dashboard/settings", isAuthenticated, (req, res) => { 
    res.render('settings', {title: 'Settings || Dashboard', user: req.session.user});
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


// Start Server
app.listen(PORT, () => {
    console.log(`Server is running on http://localhost:${PORT}`);
});
