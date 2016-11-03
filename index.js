'use strict';

const url = require('url');
const Promise = require('bluebird');
const mongoose = require('mongoose');
mongoose.Promise = Promise;

module.exports = {
    process: function(config, opts) {
        const parent = config.root;

        //region to extract from
        const regionName = config.regionName || null;
        if(!regionName) {
            return {
               invalid: '<p>This plugin is not configured properly (no region name)</p>'
            };
        }

        //include limit
        let includeLimit = typeof config.includeLimit === 'number' ? config.includeLimit : -1;

        //tags
        let filterByTags = config.defaultTags || [];
        if(opts.req) {
            const reqUrl = url.parse(opts.req.url, true);
            if(reqUrl.query && reqUrl.query.tags) {
                filterByTags = reqUrl.query.tags;
            }
        }
        if(!Array.isArray(filterByTags)) {
            filterByTags = filterByTags.split(/\s*,\s*/);    
        }

        //configure query
        const pageQuery = {};
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
        const preview = opts.preview;
        const PageModel = pagespace.getPageModel(preview);
        let pagesPromise = PageModel.find(pageQuery).populate('regions.includes.plugin regions.includes.include').exec();
        
        if(filterByTags.length) {
            pagesPromise = pagesPromise.filter(page => {
                const pageTags = page.tags.map(tag => tag.text);
                for(let tag of filterByTags) {
                    if(pageTags.indexOf(tag) > -1) {
                        return true;
                    }
                }
                return false;
            });
        }
        
        //map each page to a post
        return pagesPromise.map(page => {
            
            //basic page post meta
            const post = {};
            post.title = page.name;
            post.url = page.url;
            post.tags = Array.isArray(page.tags) ? page.tags.join(',') : '';
            post.date = page.publishedAt || page.createdAt;
            const postIncludes = [];
            
            //for the given region, resolve plugins and process includes for that region
            const region = page.regions.find(region => region.name === regionName);
            if(includeLimit < 0) {
                includeLimit = region.includes.length;
            }
            const includesToRender = region.includes.slice(0, includeLimit);
            for(let include of includesToRender) {
                if(include.plugin) {
                    const pluginModule = pagespace.pluginResolver.require(include.plugin ? include.plugin.module : null);
                    if (pluginModule) {
                        const includeData = include.include && include.include.data ? include.include.data : {};
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

            post.includes = Promise.all(postIncludes);
            return Promise.props(post);
        }).then(function(posts) {
            //sort posts by date
            posts.sort(function(a, b) {
                a = new Date(a.date);
                b = new Date(b.date);
                return a > b ? -1 : a < b ? 1 : 0;
            });
            return {
                wrapperClass: config.wrapperClass,
                noPostsHtml: config.noPostsHtml,
                posts: posts
            }
        });
    }
};