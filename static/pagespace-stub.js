window.pagespace = window.pagespace || {
    _data: null,
    getData: function() {
        var self = this;
        console.info('Pagespace (stub) getting data');
        return this._data ? new Promise(function(resolve) { resolve(self._data)}) : fetch('/data'). then(function(res) {
            return res.json();
        });
    },
    setData: function(data) {
        this._data = data;
        console.info('Pagespace (stub) setting data');
        return fetch('/data', {
            method: 'put',
            headers: {
                'Accept': 'application/json',
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(data)
        })
    },
    close: function() {
        console.info('Pagespace (stub) closing part');
    }
};