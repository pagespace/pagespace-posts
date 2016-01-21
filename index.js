'use strict';

var Promise = require('bluebird');
var mongoose = require('mongoose');

module.exports = {
    process: function(config, opts) {
        var parent = config.root;

        var regionName = config.regionName || null;
        if(!regionName) {
            return {
                wrapperClass: config.wrapperClass,
                posts: [{
                    html: '<p>This plugin is not configured properly (no region name)</p>'
                }]
            };
        }

        //configure query
        var sortField = config.sort || '-publishedAt';
        var pageQuery = {};
        if(parent) {
            pageQuery.parent = new mongoose.Types.ObjectId(parent);
        }
        pageQuery.status = pageQuery.status || 200;
        if(config.expiry) {
            config.expiry = parseInt(config.expiry);
            if(config.expiry > 0) {
                pageQuery.expiresAt = { "$gte": Date.now() }
            } else if(config.expiry < 0) {
                pageQuery.expiresAt = { "$lte": Date.now() }
            }
        }

        //query pages
        var preview = opts.preview;
        var PageModel = pagespace.getPageModel(preview);
        var query = PageModel.find(pageQuery).populate('regions.includes.plugin regions.includes.include').sort(sortField);
        var findPagePromise = Promise.promisify(query.exec, query);
        return findPagePromise().map(function(page) {
            var post = {};
            post.title = page.name;
            post.url = page.url;
            post.date = page.publishedAt || page.createdAt;
            var postIncludes = [];
            for(var i = 0; i < page.regions.length; i++) {
                var region = page.regions[i];
                if(region.name === regionName) {
                    for(var j = 0; j < region.includes.length; j++) {
                        var include = region.includes[j];
                        if(include.plugin) {
                            var pluginModule = pagespace.pluginResolver.require(include.plugin ? include.plugin.module : null);
                            if (pluginModule) {
                                console.log(include.include)
                                var includeData = include.include && include.include.data ? include.include.data : {};
                                if (typeof pluginModule.process === 'function') {
                                    postIncludes.push(pluginModule.process(includeData, {
                                        preview: opts.preview,
                                        reqUrl: opts.reqUrl,
                                        reqMethod: opts.reqMethod
                                    }));
                                } else {
                                    postIncludes.push(includeData);
                                }
                            }
                        }
                    }
                }
            }
            post.includes = postIncludes;
            return Promise.props(post);
        }).then(function(posts) {
            return {
                wrapperClass: config.wrapperClass,
                posts: posts
            }
        }).then(null, function(err) {
            return {
                wrapperClass: config.wrapperClass,
                posts: [{
                    html: err
                }]
            };
        });
    }
};