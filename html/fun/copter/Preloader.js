

Preloader = function(game) {
};


Preloader.prototype = {

    preload: function()
    {
        // titles (pre-preloaded by boot.js)
        game.add.sprite(0, 0, 'titleBg');
        this.tt = game.add.sprite(game.world.width * 0.5, game.world.height * 0.42, 'titleText');
        this.tt.anchor.set(0.5);

        // preloader bar
        this.preloadBg = game.add.sprite(0, 300, 'preloaderBg');
        this.preloadBg.x = (game.world.width - this.preloadBg.width) * 0.5;
        this.preloadBg.anchor.setTo(0, 0.5);
        this.preloadBar = game.add.sprite(0, 300, 'preloaderBar');
        this.preloadBar.x = (game.world.width - this.preloadBar.width) * 0.5;
        this.preloadBar.anchor.setTo(0, 0.5);
        game.load.setPreloadSprite(this.preloadBar);

        // title screen chopper
        game.load.image('titleChopper', 'img/titleHelicopter.png');
        game.load.spritesheet('titleChopperRotor', 'img/rotorsMid.png', 15, 31, 4);

        // title button
        game.load.image('goBtn', 'img/button.png');
        game.load.image('goBtn_dwn', 'img/buttonDown.png');
        game.load.image('goBtn_hvr', 'img/buttonHover.png');

        // font
        game.load.bitmapFont('font1', 'img/pressStart_0.png', 'img/pressStart.fnt');

        // screen faders
        game.load.image('fader_l', 'img/fader_lft_32x480.png');
        game.load.image('fader_r', 'img/fader_rgt_32x480.png');
        game.load.image('fader_all', 'img/fader_32x32.png');

        // sky
        game.load.image('background', 'img/cityBackground_640.png');

        // effects
        game.load.spritesheet('fire', 'img/fire.png', 40, 72, 5);
        game.load.spritesheet('dustCloudLft', 'img/dustLft.png', 24, 48, 3);
        game.load.spritesheet('dustCloudMid', 'img/dustMid.png', 48, 48, 3);
        game.load.spritesheet('dustCloudRgt', 'img/dustRgt.png', 24, 47, 3);
        game.load.image('rubbleLft', 'img/rubble_left.png');
        game.load.image('rubbleRgt', 'img/rubble_right.png');
        game.load.image('rubbleMd1', 'img/rubble_mid1.png');
        game.load.image('rubbleMd2', 'img/rubble_mid2.png');
        game.load.image('rubbleMd3', 'img/rubble_mid3.png');
        game.load.image('warningIcon', 'img/warning.png');
        game.load.atlasXML('fxBits', 'img/fxBits.png', 'img/fxBits.xml');

        // chopper
        game.load.atlasXML('explosion', 'img/explosion.png', 'img/explosion.xml');
        game.load.atlasXML('chopper', 'img/copter.png', 'img/copter.xml');
        game.load.spritesheet('blades', 'img/blades.png', 189, 15, 6);
        game.load.image('shadow', 'img/copterShadow.png');
        game.load.atlasXML('dust', 'img/dust.png', 'img/dust.xml');

        // people
        game.load.atlasXML('person1', 'img/man1.png', 'img/man1.xml');
        game.load.atlasXML('person2', 'img/man2.png', 'img/man2.xml');
        game.load.atlasXML('person3', 'img/man3.png', 'img/man3.xml');
        game.load.atlasXML('person4', 'img/woman1.png', 'img/woman1.xml');
        game.load.atlasXML('person5', 'img/woman2.png', 'img/woman2.xml');

        // foreground buildings
        game.load.image('building1_l', 'img/1/building_left.png');
        game.load.image('building1_m1', 'img/1/building_mid_1.png');
        game.load.image('building1_m2', 'img/1/building_mid_2.png');
        game.load.image('building1_m3', 'img/1/building_mid_3.png');
        game.load.image('building1_m4', 'img/1/building_mid_4.png');
        game.load.image('building1_m5', 'img/1/building_mid_5.png');
        game.load.image('building1_m6', 'img/1/building_mid_6.png');
        game.load.image('building1_r', 'img/1/building_right.png');
        game.load.image('building1_rl', 'img/1/buildings_top_left.png');
        game.load.image('building1_rm1', 'img/1/roof_mid_1.png');
        game.load.image('building1_rm2', 'img/1/roof_mid_2.png');
        game.load.image('building1_rm3', 'img/1/roof_mid_3.png');
        game.load.image('building1_rr', 'img/1/building_top_right.png');

        game.load.image('building2_l', 'img/2/building_left.png');
        game.load.image('building2_m1', 'img/2/building_mid_1.png');
        game.load.image('building2_m2', 'img/2/building_mid_2.png');
        game.load.image('building2_m3', 'img/2/building_mid_3.png');
        game.load.image('building2_m4', 'img/2/building_mid_4.png');
        game.load.image('building2_m5', 'img/2/building_mid_5.png');
        game.load.image('building2_m6', 'img/2/building_mid_6.png');
        game.load.image('building2_r', 'img/2/building_right.png');
        game.load.image('building2_rl', 'img/2/buildings_top_left.png');
        game.load.image('building2_rm1', 'img/2/roof_mid_1.png');
        game.load.image('building2_rm2', 'img/2/roof_mid_2.png');
        game.load.image('building2_rm3', 'img/2/roof_mid_3.png');
        game.load.image('building2_rr', 'img/2/building_top_right.png');

        game.load.image('building3_l', 'img/3/building_left.png');
        game.load.image('building3_m1', 'img/3/building_mid_1.png');
        game.load.image('building3_m2', 'img/3/building_mid_2.png');
        game.load.image('building3_m3', 'img/3/building_mid_3.png');
        game.load.image('building3_m4', 'img/3/building_mid_4.png');
        game.load.image('building3_m5', 'img/3/building_mid_5.png');
        game.load.image('building3_m6', 'img/3/building_mid_6.png');
        game.load.image('building3_r', 'img/3/building_right.png');
        game.load.image('building3_rl', 'img/3/buildings_top_left.png');
        game.load.image('building3_rm1', 'img/3/roof_mid_1.png');
        game.load.image('building3_rm2', 'img/3/roof_mid_2.png');
        game.load.image('building3_rm3', 'img/3/roof_mid_3.png');
        game.load.image('building3_rr', 'img/3/building_top_right.png');

        // background buildings
        game.load.image('bgBuilding1', 'img/bgBuilding1.png');
        game.load.image('bgBuilding2', 'img/bgBuilding2.png');
        game.load.image('bgBuilding3', 'img/bgBuilding3.png');

        // ground layer
        game.load.image('ground_b1', 'img/sidewalk_bottom_1.png');
        game.load.image('ground_b2', 'img/sidewalk_bottom_2.png');
        game.load.image('ground_b3', 'img/sidewalk_bottom_3.png');
        game.load.image('ground_b4', 'img/sidewalk_bottom_4.png');
        game.load.image('ground_b5', 'img/sidewalk_bottom_5.png');
        game.load.image('ground_b6', 'img/sidewalk_bottom_6.png');
        game.load.image('ground_b7', 'img/sidewalk_bottom_7.png');
        game.load.image('ground_b8', 'img/sidewalk_bottom_8.png');
        game.load.image('ground_b9', 'img/sidewalk_bottom_9.png');
        game.load.image('ground_t1', 'img/sidewalk_top_1.png');
        game.load.image('ground_t2', 'img/sidewalk_top_2.png');
        game.load.image('ground_t3', 'img/sidewalk_top_3.png');
        game.load.image('ground_t4', 'img/sidewalk_top_4.png');
        game.load.image('ground_t5', 'img/sidewalk_top_5.png');
        game.load.image('ground_t6', 'img/sidewalk_top_6.png');
        game.load.image('ground_t7', 'img/sidewalk_top_7.png');
        game.load.image('ground_t8', 'img/sidewalk_top_8.png');
        game.load.image('ground_t9', 'img/sidewalk_top_9.png');
        Preloader.NUM_GROUNDS = 9;

        // horizon walls
        game.load.image('wall1', 'img/ground_wall_1.png');
        game.load.image('wall2', 'img/ground_wall_2.png');
        game.load.image('wall3', 'img/ground_wall_3.png');
        game.load.image('wall4', 'img/ground_wall_4.png');
        game.load.image('wall5', 'img/ground_wall_5.png');
        game.load.image('wall6', 'img/ground_wall_6.png');
        game.load.image('wall7', 'img/ground_wall_7.png');
        Preloader.NUM_WALLS = 7;

        // user interface
        game.load.image('radarBg', 'img/radar_9tile.png');
        game.load.image('radarBuilding', 'img/HudRadarBuilding.png');
        game.load.image('radarPerson', 'img/HudRadarPerson.png');
        game.load.image('radarCopter', 'img/HudRadarCopter.png');
        game.load.image('radarPulse', 'img/HudRadarPulse.png');
        game.load.image('infoLft', 'img/infoLeft.png');
        game.load.image('infoRgt', 'img/infoRight.png');
        game.load.image('hudAtRisk', 'img/HudAtRisk.png');
        game.load.image('hudSaved', 'img/HudSafe.png');
        game.load.image('gameOver', 'img/title_gameover.png');
        game.load.image('levelComplete', 'img/title_levelcomplete.png');

        // audio
        game.load.audio('sfxMaleCall1', ['sfx/MaleHelp.m4a']);
        game.load.audio('sfxMaleCall2', ['sfx/MaleOverHere.m4a']);
        game.load.audio('sfxMaleGrab', ['sfx/MaleImOn.m4a']);
        game.load.audio('sfxMaleFall', ['sfx/MaleNo.m4a']);
        game.load.audio('sfxMaleDie', ['sfx/MaleOh.m4a']);
        game.load.audio('sfxMaleSafe', ['sfx/MalePhew.m4a']);

        game.load.audio('sfxFemaleCall1', ['sfx/FemaleHelp.m4a']);
        game.load.audio('sfxFemaleCall2', ['sfx/FemaleHey.m4a']);
        game.load.audio('sfxFemaleGrab', ['sfx/FemaleOk.m4a']);
        game.load.audio('sfxFemaleFall', ['sfx/FemaleNo.m4a']);
        game.load.audio('sfxFemaleDie', ['sfx/FemaleOh.m4a']);
        game.load.audio('sfxFemaleSafe', ['sfx/FemalePhew.m4a']);

        game.load.audio('sfxChopperExplode', ['sfx/HelicopterExplode.m4a']);
        game.load.audio('sfxChopperFlying', ['sfx/HelicopterFlying.m4a']);
        game.load.audio('sfxChopperLand', ['sfx/HelicopterLand.m4a']);
        game.load.audio('sfxChopperWarning', ['sfx/HelicopterWarning.m4a']);
        
        game.load.audio('sfxWindowExplode', ['sfx/WindowExplode.m4a']);
        game.load.audio('sfxBuildingDemolished', ['sfx/BuildingDemolished.m4a']);
        game.load.audio('sfxBuildingFire', ['sfx/BuildingFire.m4a']);
        game.load.audio('sfxBuildingRumble', ['sfx/BuildingRumble.m4a']);
    },

    create: function()
    {
        game.state.start('Main');
        this.preloadBar.destroy();
        this.preloadBg.destroy();
    }

};
