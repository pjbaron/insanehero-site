/**
 * Created by Pete on 19/05/2014.
 */
Boot = function(game)
{
};


Boot.prototype =
{

    preload: function()
    {
        game.stage.backgroundColor = '#8080e0';
        game.load.image('titleBg', 'img/titleBg.png');
        game.load.image('titleText', 'img/title2.png');
        game.load.image('preloaderBg', 'img/preloadingBG.png');
        game.load.image('preloaderBar', 'img/preloadingBar.png');
    },

    create: function ()
    {
        game.state.start('Preloader');
    }

};
