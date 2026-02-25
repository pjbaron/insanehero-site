/**
 * NinePatchSprite
 *
 * @author Negue
 * @modified Pete - extend Phaser.Sprite instead of Phaser.Group
 * @extends {Phaser.Sprite}
 */

// Update Height / Width of the NinePatch
//        this.ninePatch.targetWidth = 100;
//        this.ninePatch.targetHeight = 100;
//        this.ninePatch.resize();

var NinePatchSprite = function(game, x, y, targetWidth, targetHeight, left, right, top, bottom, imageKey)
{
    Phaser.Sprite.call(this, game, x, y, imageKey);

    var self = this;

    this.targetWidth = targetWidth;
    this.targetHeight = targetHeight;

    this.imageKey = imageKey;

    var currentTargetWidth = targetWidth;
    var currentTargetHeight = targetHeight;

    var baseTexture = PIXI.BaseTextureCache[imageKey];
    var width = baseTexture.width;
    var height = baseTexture.height;
    self.partCols = [left, width - left - right, right];
    self.partRows = [top, height - top - bottom, bottom];
    self.partColsX = [0, left, width - right];
    self.partRowsY = [0, top, height - bottom];

    var images = [
        [],
        [],
        []
    ];

    function UpdateImageSizes()
    {
        currentTargetWidth = Number(self.targetWidth + "");
        currentTargetHeight = Number(self.targetHeight + "");

        // Update Width / Height  and Coordinates
        var topCenter = images[0][1];
        topCenter.x = self.partCols[0];
        topCenter.width = currentTargetWidth - self.partCols[0] - self.partCols[2];

        var topRight = images[0][2];
        topRight.x = currentTargetWidth - self.partCols[2];

        var middleY = self.partRows[0];
        var middleHeight = currentTargetHeight - self.partRows[0] - self.partRows[2];

        var leftMiddle = images[1][0];
        leftMiddle.y = middleY;
        leftMiddle.height = middleHeight;

        var centerMiddle = images[1][1];
        centerMiddle.y = middleY;
        centerMiddle.height = middleHeight;
        centerMiddle.x = topCenter.x;
        centerMiddle.width = topCenter.width;

        var rightMiddle = images[1][2];
        rightMiddle.x = topRight.x;
        rightMiddle.y = middleY;
        rightMiddle.height = middleHeight;

        var bottomY = currentTargetHeight - self.partRows[2];

        var bottomLeft = images[2][0];
        bottomLeft.y = bottomY;

        var bottomCenter = images[2][1];
        bottomCenter.y = bottomY;
        bottomCenter.x = topCenter.x;
        bottomCenter.width = topCenter.width;

        var bottomRight = images[2][2];
        bottomRight.x = topRight.x;
        bottomRight.y = bottomY;
    }

    function CreateImages()
    {
        var frameData = new Phaser.FrameData();
        var frameCount = 0;

        for (var partRow = 1; partRow <= 3; partRow++)
        {
            for (var partCol = 1; partCol <= 3; partCol++)
            {
                var frameName = partRow + '-' + partCol;

                var textureId = self.imageKey + '_' + frameName;

                var xVal = self.partColsX[partCol - 1];
                var yVal = self.partRowsY[partRow - 1];

                PIXI.TextureCache[textureId] = new PIXI.Texture(baseTexture, {
                    x:      xVal,
                    y:      yVal,
                    width:  self.partCols[partCol - 1],
                    height: self.partRows[partRow - 1]
                });

                frameData.addFrame(new Phaser.Frame(frameCount++, xVal, yVal, self.partCols[partCol - 1], self.partRows[partRow - 1], partRow + '-' + partCol, textureId));
            }
        }

        var imageCache = game.cache._images[imageKey];
        imageCache.spriteSheet = true;
        imageCache.frameData = frameData;

        // Top
        images[0][0] = game.make.image(0, 0, imageKey, '1-1');
        images[0][1] = game.make.image(0, 0, imageKey, '1-2');
        images[0][2] = game.make.image(0, 0, imageKey, '1-3');

        // Middle
        images[1][0] = game.make.image(0, 0, imageKey, '2-1');
        images[1][1] = game.make.image(0, 0, imageKey, '2-2');
        images[1][2] = game.make.image(0, 0, imageKey, '2-3');

        // Bottom
        images[2][0] = game.make.image(0, 0, imageKey, '3-1');
        images[2][1] = game.make.image(0, 0, imageKey, '3-2');
        images[2][2] = game.make.image(0, 0, imageKey, '3-3');

        for (var y = 0; y < 3; y++)
        {
            for (var x = 0; x < 3; x++)
            {
                self.addChild(images[y][x]);
            }
        }

        UpdateImageSizes();
    }



    CreateImages();

    this.resize = function()
    {
        if (this.targetHeight != currentTargetHeight || this.targetWidth != currentTargetWidth)
        {
            UpdateImageSizes();
        }
    };
};


// Extend from Phaser.Sprite
NinePatchSprite.prototype = Object.create(Phaser.Sprite.prototype);
NinePatchSprite.prototype.constructor = NinePatchSprite;
