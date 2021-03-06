
angular
    .module('portal')
    .factory('DownloadSpeed', function(){

        return {
           calculate : function (filesize)
        {
          var  bandwidth = [2000000, 10000000, 100000000]


            var result = {};

            for (var x = 0; x < bandwidth.length; x++)
            {
                var filetime = (filesize*8) / bandwidth[x];

                var hourmod = filetime % 3600;
                var hour = Math.floor(filetime / 3600);
                var minute = Math.floor(hourmod / 60);
                if (hour <= 9) {
                    hour = "0" + hour;
                }

                if (minute <= 9 && hour !== '00') {
                    minute = "0" + minute;
                }

                var minuteTxt = (minute === 1 )? " minute" : " minutes";

                var time = (hour !== '00') ? (hour + ":" + minute  +" hours") : (minute  + minuteTxt);

                result[bandwidth[x]/1000000] = time;
            }

            return result;

        }

        }


    });




