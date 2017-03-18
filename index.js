'use strict';

const cors = require('cors');
const express = require('express');

const app = express();
const port =  process.env.PORT || 3000;

app.use(cors());

// Static files
app.use(express.static(`.`));
app.use(express.static(`dist/public`));
app.use(express.static(`public`));


// Redirect homepage
app.get(`/`, (req, res) =>  res.redirect('/index.html'));

/** Catch errors **/
app.all((err, req, res) => res.status(500).json({status: 500, message: err}));

/** Listen **/
app.listen(port, () => console.log(`App listening on port ${port}`));