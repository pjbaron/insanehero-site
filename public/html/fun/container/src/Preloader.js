"use strict";


function Preloader()
{
}


Preloader.images = null;


Preloader.create = function()
{
    Preloader.images = {};
};


Preloader.destroy = function()
{
    Preloader.images = null;
};


Preloader.preloadImages = function( _images, _path, _onLoaded )
{
    var loading = 0;
    var c = 0;

    for(var src in _images)
    {
        if (Preloader.images[src])
        {
            console.warn("Preloader.preload: Duplicate image key '" + src + "'!");
        }
        else
        {
            c++;
            loading++;
            var image = Preloader._load(_path + "/" + _images[src], () => {
                Preloader.images[src] = image;
                loading--;
                if (loading <= 0)
                    _onLoaded();
            });
        }
    }

    if (c == 0)
    {
        _onLoaded();
    }
};


Preloader.image = function( _key )
{
    return Preloader.images[_key];
};


Preloader._load = function( _image, _onLoad )
{
    var image = new Image();
    image.onload = _onLoad;
    image.src = _image;
    return image;
};

