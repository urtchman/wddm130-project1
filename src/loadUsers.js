const fs = require('fs');
const path = require('path');
const csv = require('csv-parser');

const users = []; // Array to store user data

// Define the path to users.csv
const filePath = path.join(__dirname, '../db/users.csv');

// Read and parse CSV file
fs.createReadStream(filePath)
  .pipe(csv())
  .on('data', (row) => {
    users.push(row);
  })
  .on('end', () => {
    console.log("Users loaded successfully:", users);
  })
  .on('error', (err) => {
    console.error("Error reading CSV file:", err);
  });

module.exports = users; 
