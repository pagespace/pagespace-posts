var fs = require('fs');
var express = require('express');
var bodyParser = require('body-parser');
var exphbs = require('express-handlebars');
var path = require('path');
var favicon = require('serve-favicon');
var part = require('./index');

var app = express();

var data = require('./stubs/config.json');

app.use(favicon(__dirname + '/favicon.ico'));

// view engine setup
app.set('views', './');
app.engine('hbs', exphbs());
app.set('view engine', 'hbs');

app.use('/_static/plugins/pagespace-posts/', express.static('static'));
app.use(bodyParser.json());

app.get('/', function (req, res) {

    if(typeof part.process === 'function') {
        part.process(data).then(function(processedData) {
            res.render('index', {
                data: processedData
            });
        })
    } else {
        res.render('index', {
            data: data
        });
    }
});
app.get('/edit', function (req, res) {
    res.sendFile(path.join(__dirname, 'static/edit.html'));
});
app.get('/data', function(req, res) {
   res.json(data);
});
app.put('/data', function(req, res, next) {
    data = req.body;
    res.json({
        message: 'ok'
    });
});

/// catch 404 and forwarding to error handler
app.use(function(req, res, next) {
    var err = new Error('Not Found');
    err.status = 404;
    next(err);
});

/// error handlers
app.use(function(err, req, res, next) {
    console.error(err);
    res.status(err.status || 500);
    res.send('<p>There was an error, see the console for details</p>');
});

var port = 9998;

app.listen(port, function() {
    console.log('Pagespace standalone part server now running on http://localhost:%s', port)
}).on('error', function(err) {
    if(err.code === 'EADDRINUSE') {
        console.error('Cannot start server. Something is already running on port %s.', port);
    } else {
        console.error(err, 'Couldn\'t start server :(');
    }
});

module.exports = app;