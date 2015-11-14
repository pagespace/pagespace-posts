var Promise = require('bluebird');
var readFile = Promise.promisify(require("fs").readFile);


var files = [
    readFile(__dirname + '/one.txt', 'utf8'),
    readFile(__dirname + '/two.txt', 'utf8'),
    readFile(__dirname + '/three.txt', 'utf8')
];
var x = 0;

Promise.map(files, function(file) {

    return Promise.props({
        foo: 'bar',
        bar: file,
        file: readFile(__dirname + '/stubs/config.json', 'utf8')
    })

}).reduce(function(str, props) {
    console.log('x' + x++);
    return str + '\n' + props.bar + '\n' + props.file;
}, '').then(function(res) {
    console.log(res);
});