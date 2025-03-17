const fs = require('fs');
const path = require('path');
const csv = require('csv-parser');

const wallets = []; // Array to store wallet data

// Define the path to wallets.csv
const filePath = path.join(__dirname, '../db/wallets.csv');

// Read and parse CSV file
fs.createReadStream(filePath)
  .pipe(csv())
  .on('data', (row) => {
    wallets.push(row);
  })
  .on('end', () => {
    console.log("wallets loaded successfully:", wallets);
  })
  .on('error', (err) => {
    console.error("Error reading CSV file:", err);
  });

module.exports = wallets;  
