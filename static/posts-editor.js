(function() {
    angular.module('postsApp', [])
    .controller('PostsController' , function($scope, $http) {

        pagespace.getData().then(function (data) {
            $scope.data = data;
            $http.get( '/_api/pages?status=200').success(function(pages) {

                var regions = {};
                var pageMap = {};
                pages.forEach(function(page) {

                    //collect page names
                    var pageName = page.name;
                    if(page.parent && page.parent.name) {
                        pageName = page.parent.name + ' / ' + pageName;
                        if(page.parent.parent) {
                            pageName = '.. / ' + pageName;
                        }
                    }
                    pageMap[page._id] = pageName;

                    //collect unique region names
                    page.regions.forEach(function(region) {
                        regions[region.name] = true;
                    });
                });
                $scope.pages = pageMap;
                $scope.regions = Object.keys(regions);
            });
        });

        $scope.save = function () {
            return pagespace.setData($scope.data).then(function () {
                pagespace.close();
            });
        }
    });
})();