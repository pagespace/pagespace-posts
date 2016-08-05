'use strict';

var Promise = require('bluebird');
var mongoose = require('mongoose');
mongoose.Promise = Promise;

module.exports = {
    process: function(config, opts) {
        var parent = config.root;

        var regionName = config.regionName || null;
        if(!regionName) {
            return {
               invalid: '<p>This plugin is not configured properly (no region name)</p>'
            };
        }

        //configure query
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
        var findPagePromise = PageModel.find(pageQuery).populate('regions.includes.plugin regions.includes.include').exec();
        return findPagePromise.map(function(page) {
            var post = {};
            post.title = page.name;
            post.url = page.url;
            post.date = page.publishedAt || page.createdAt;
            var postIncludes = [];
            const region = page.regions.find(region => region.name === regionName);

            for(let include of region.includes) {
                if(include.plugin) {
                    var pluginModule = pagespace.pluginResolver.require(include.plugin ? include.plugin.module : null);
                    if (pluginModule) {
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

            post.includes = postIncludes;
            return Promise.props(post);
        }).then(function(posts) {
            posts.sort(function(a, b) {
                a = new Date(a.date);
                b = new Date(b.date);
                return a > b ? -1 : a < b ? 1 : 0;
            });
            return {
                wrapperClass: config.wrapperClass,
                posts: posts
            }
        });
    }
};