angular.module('iterograph')

.controller('ModalCreateProductCtrl', function ($scope, $uibModal, $log) {

  $scope.open = function (svgSelector) {

    var modalInstance = $uibModal.open({
      animation: true,
      templateUrl: 'partial/createproduct.html',
      controller: 'ModalCreateProductInstanceCtrl',
      size: '',
      keyboard : false,
      backdrop : 'static',
      resolve: {
        svgElement: function () {
          return document.querySelector(svgSelector);
        }
      }
    });

  };

})

.controller('ModalCreateProductInstanceCtrl', function ($scope, $uibModalInstance, $http, svgElement, svgManipulator) {
  var dimension = 7016;

  // SVG to PNG
  svgManipulator.toPNG(
    svgElement,
    {dimension : dimension, transparent : true},
    function(pngData, svgImage) {
        // TODO
        // 1. Get s3direct/get_image_upload_params/
        // 2. Post image on s3
        // 3. Redirect user to create product page
        window.open(pngData);
        $uibModalInstance.close();
    })
})

.controller('ModalGalleryCtrl', function ($scope, $uibModal, $log) {

  $scope.open = function (size) {

    var modalInstance = $uibModal.open({
      animation: true,
      templateUrl: 'partial/gallery.html',
      controller: 'ModalGalleryInstanceCtrl',
      size: size
    });

  };

})

.controller('ModalGalleryInstanceCtrl', function ($scope, $uibModalInstance, $http, config) {

  $scope.loading = true;
  $scope.currentPage=1;
  $scope.maxPage=10;
  $scope.itemPerPage = 15;
  $scope.images = [];

  $http.get('https://api.imgur.com/3/album/'+config.albumID+'/images',
            {
                headers : {
                    Authorization: 'Client-ID ' + config.clientID,
                }
            })
          .then(function(resp) {
              $scope.images = resp.data.data;
              $scope.totalImages = $scope.images.length;
              $scope.loading = false;
          }, function (resp) {
              console.log('ERROR')
              console.log(resp)
              $scope.message = "Error : " + resp.data.data.error;
              $scope.error = true;
              $scope.loading = false;
          })

  $scope.compare = function(item) {
    return (item.title && (item.title.search(new RegExp($scope.searchText, 'i'))) != -1)
           || (item.description && (item.description.search(new RegExp($scope.searchText, 'i'))) != -1);
  }

  $scope.ok = function () {
    $uibModalInstance.close();
  };

  $scope.cancel = function () {
    $uibModalInstance.dismiss('cancel');
  };
})

.filter('offset', function() {
  return function(input, start) {
    start = parseInt(start, 10);
    return input.slice(start);
  };
})

.controller('ModalDownloadCtrl', function ($scope, $uibModal, $log) {

  $scope.open = function (svgSelector) {

    var modalInstance = $uibModal.open({
      animation: true,
      templateUrl: 'partial/download.html',
      controller: 'ModalDownloadInstanceCtrl',
      size: '',
      resolve: {
        svgElement: function () {
          //return d3.select(svgSelector).node();
          return document.querySelector(svgSelector);
        }
      }
    });

  };

})

.controller('ModalDownloadInstanceCtrl', function ($scope, $uibModalInstance, svgElement, svgManipulator) {

  $scope.format = 'png';
  $scope.dimension = 500;
  $scope.name = 'iterograph_' + (new Date()).toDateString();
  $scope.transparent = false;

  $scope.ok = function () {
    $uibModalInstance.close();
  };

  $scope.download = function () {
    svgManipulator.toPNG(
      svgElement,
      {dimension : $scope.dimension, transparent : $scope.transparent},
      function(pngData, svgImage) {
          var a = document.createElement('a');
          //a.download = gallery.boardTitle;
          a.download = $scope.name;
          a.href = pngData;
          //a.href = svgElement;
          document.body.appendChild(a);
          a.click();
          a.remove();
    })
    $uibModalInstance.close();
  };

  $scope.downloadSettings = function() {
    // TODO
    /*var a2 = document.createElement('a');
    var data = JSON.stringify(settings);
    a2.download = gallery.boardTitle;
    a2.href = 'data:text/plain;charset=utf-8,' + data;
    a2.click();
    a2.remove();*/
  }

  $scope.cancel = function () {
    $uibModalInstance.dismiss('cancel');
  };
})

.controller('ModalShareCtrl', function ($scope, $uibModal, $log) {

  $scope.open = function (svgSelector) {

    var modalInstance = $uibModal.open({
      animation: true,
      templateUrl: 'partial/share.html',
      controller: 'ModalShareInstanceCtrl',
      size: '',
      resolve: {
        svgElement: function () {
          return document.querySelector(svgSelector);
        }
      }
    });

  };

})

.controller('ModalShareInstanceCtrl',
            function ($scope, $uibModalInstance, $http, svgElement, svgManipulator, config, graphSettings) {

  $scope.loading = false;
  $scope.dimension = 500;
  $scope.title = 'iterograph ' + (new Date()).toDateString();
  $scope.description = '';
  $scope.message = "";

  function submitToGallery() {
    $scope.loading = true;
    svgManipulator.toPNG(
      svgElement,
      {dimension : $scope.dimension, transparent : false},
      function(pngData, svgImage) {
          var stegImage = steg.encode(JSON.stringify(graphSettings.persistentData()), svgImage);
          var imageBase64 = stegImage.replace(/.*,/, '');

          function postImage(num) {
            var title = (num ? '#'+num+' ' : '') + $scope.title;
            $http.post(
                      'https://api.imgur.com/3/image',
                      {
                          'image' : imageBase64,
                          'type' : 'base64',
                          'album' : config.albumHash,
                          'title' : title,
                          'description' : $scope.description
                      },
                      {
                          headers : {
                              Authorization: 'Client-ID ' + config.clientID,
                          }
                      }
            ).then(function(resp) {
              console.log(resp);
                $scope.imageData = stegImage;
                $scope.imageImgurLink = "http://imgur.com/" + resp.data.data.id;
                $scope.imageLink = resp.data.data.link;
                $scope.submitted = true;
                $scope.loading = false;
            }, function (resp) {
                console.log('ERROR');
                console.log(resp);
                $scope.message = "Error : " + resp.data.data.error;
                $scope.error = true;
                $scope.loading = false;
            })
        }

        postImage();

/*        $http.get('https://api.imgur.com/3/album/'+config.albumID+'/images',
            {
                headers : {
                    Authorization: 'Client-ID ' + config.clientID,
                }
            })
          .then(function(resp) {
              var count = resp.data.data.length;
              postImage(count+1);
          }, function (resp) {
              postImage();
          })*/

    })
  }

  $scope.ok = function () {
    $uibModalInstance.close();
  };

  $scope.submit = function () {
     submitToGallery();
    //$uibModalInstance.close();
  };

  $scope.cancel = function () {
    $uibModalInstance.dismiss('cancel');
  };
})

.controller('ModalAboutCtrl', function ($scope, $uibModal, $log) {

  $scope.open = function () {

    var modalInstance = $uibModal.open({
      animation: true,
      templateUrl: 'partial/about.html',
      controller: 'ModalAboutInstanceCtrl',
      size: ''
    });

  };

})

.controller('ModalAboutInstanceCtrl', function ($scope, $uibModalInstance, config) {

  $scope.imgurGalleryUrl = "http://imgur.com/a/" + config.albumID;

  $scope.ok = function () {
    $uibModalInstance.close();
  };

  $scope.cancel = function () {
    $uibModalInstance.dismiss('cancel');
  };
})

;