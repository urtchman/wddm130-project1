const express = require('express');
const app = express();
const HTTP_PORT = process.env.PORT || 8080;

app.get('/', (req, res)=>{
    res.send('<h1>Hello World</h1>');
});

app.listen(HTTP_PORT, ()=>console.log(`Server running and listening on ${HTTP_PORT}`));
