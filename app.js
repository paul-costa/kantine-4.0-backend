const path = require('path');
const express = require('express');
const app = express();


const routerParsePdf = require('./routes/parsepdf');

//Avoid CORS fuckery
app.use((req,res, next) => {
    res.setHeader("Access-Control-Allow-Origin", "*");
    res.setHeader(
      "Access-Control-Allow-Headers",
      "Origin, X-Requested-With, Content-Type, Accept, Authorization"
    );
    res.setHeader(
      "Access-Control-Allow-Methods",
      "GET, POST, PATCH, PUT, DELETE, OPTIONS"
    );
    next();
});

// app.use('/', express.static(path.join(__dirname, 'angular')));

app.use('/api/parsepdf', routerParsePdf)

// app.use((req, res, next) => {
//     res.sendFile(path.join(__dirname, '../src','index.html'));
// });


module.exports = app;