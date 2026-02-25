/**
 * Created by Pete on 19/05/2014.
 */
Main = function(game) {
    this.game = game;
};

// variables
var fps = 0;
var gameControl = null;
var gameAudio = null;
Main.faderLayer = null;


Main.prototype = {

    create: function()
    {
        //this.game.physics.startSystem(Phaser.Physics.ARCADE);
        gameControl = null;
        gameAudio = new Audio();
        fps = this.game.frameRate;
        Main.faderLayer = game.add.group();
    },
    

    update: function()
    {
        if (!gameControl || !gameControl.update())
        {
            // end previous game
            if (gameControl)
            {
                gameControl.destroy();
                if (gameAudio)
                    gameAudio.destroy();
            }

            // start a new game
            gameAudio.create();
            gameControl = new Game(this.game);
            gameControl.create();
        }
    }
};

