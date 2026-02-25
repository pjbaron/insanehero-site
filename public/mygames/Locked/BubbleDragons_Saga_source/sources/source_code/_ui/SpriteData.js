//
// SpriteData.js
//
// Pete Baron 2018
//
// Contains all of the animation sequence data for Bubble Dragons
//



// Sprite object type definitions (bubbles, bonuses, boosts, etc)
// the 'normal' entry is relevent only for bubbles
//
// NOTES:
// Dot notation for JS array allows us to access using string literals
// e.g. var key = SpriteData["FIREBALL"].keys[0]
//
// The subsequent self-invoking function creates indexed references
// to each of the entries, so we can also access using the type number
// e.g. var type = SpriteData["FIREBALL"].type; var key = SpriteData[type].keys[0];
// and again using the 'name' where specified
// e.g. var animation = SpriteData["boost_fireball"].animations.flying;
//

var SpriteData = [];

SpriteData.UNDEFINED = {
    type: -1,
    name: "undefined",
    animations:
    {
        interval: 0,
        default: [ 'undefined' ]
    }
};

// bubbles
SpriteData.RED = {
    type: 1,
    name: "bubble_red",
    normal: true,
    animations:
    {
        interval: 0,
        default: [ 'bble_red.png' ]
    }
};
SpriteData.GREEN = {
    type: 2,
    name: "bubble_green",
    normal: true,
    animations:
    {
        interval: 0,
        default: [ 'bble_green.png' ]
    }
};
SpriteData.BLUE = {
    type: 3,
    name: "bubble_blue",
    normal: true,
    animations:
    {
        interval: 0,
        default: [ 'bble_blu.png' ]
    }
};
SpriteData.YELLOW = {
    type: 4,
    name: "bubble_yellow",
    normal: true,
    animations:
    {
        interval: 0,
        default: [ 'bble_orng.png' ]
    }
};
SpriteData.PURPLE = {
    type: 5,
    name: "bubble_purple",
    normal: true,
    animations:
    {
        interval: 0,
        default: [ 'bble_prpl.png' ]
    }
};
SpriteData.RAINBOW = {
    type: 6,
    name: "boost_wild",
    normal: true,
    animations:
    {
        interval: 0,
        default: [ 'bble_wild.png' ],
        boost: [ 'boostIcon_rbow.png' ]
    }
};

// shootable boosts
SpriteData.FIREBALL = {
    type: 20,
    name: "boost_fireball",
    normal: false,
    animations:
    {
        interval: 100,
        //default: [ 'fireball_rotate/00.png' ],
        default: [ 'fireball_rotate/00.png', 'fireball_rotate/01.png', 'fireball_rotate/02.png' ],
        bonus: [ 'fireball_rotate/00.png' ],
        boost: [ 'boostIcon_flame.png' ]
    }
};
SpriteData.MINE = {
    type: 21,
    name: "boost_mine",
    normal: false,
    animations:
    {
        interval: 0,
        default: [ 'mine.png' ],
        boost: [ 'boostIcon_mine.png' ]
    }
};

// special bubbles
SpriteData.ICE = {
    type: 50,
    name: "special_frozen_bubble",
    normal: false,
    animations:
    {
        noRepeat: true,
        interval: 150,
        default: [ 'frozen01.png' ],
        cracking: [ 'frozen01.png', 'frozen02.png', 'frozen03.png', 'frozen04.png', 'frozen05.png', 'frozen06.png', 'frozen07.png' ]
    }
};
SpriteData.BOMB = {
    type: 51,
    name: "special_bomb",
    normal: false,
    animations:
    {
        randomise: true,
        interval: 250,
        default: [ 'bomb_spark/bomb00.png', 'bomb_spark/bomb01.png', 'bomb_spark/bomb02.png' ],
        waiting: [ 'bombWait.png' ]
    }
};
SpriteData.ROCKET = {
    type: 52,
    name: "special_rocket",
    normal: false,
    animations:
    {
        noRepeat: true,
        interval: 100,
        default: [ "rocket.png" ]
    }
};
SpriteData.EGG = {
    type: 53,
    name: "goal_egg",
    normal: false,
    animations:
    {
        noRepeat: true,
        interval: 150,
        default: [ 'collect_egg.png' ],
        cracking: [ 'egg_crack/00.png', 'egg_crack/01.png', 'egg_crack/02.png', 'egg_crack/03.png', 'egg_crack/04.png', 'egg_crack/05.png' ]
    }
};
SpriteData.FISH = {
    type: 54,
    animations:
    {
        noRepeat: true,
        interval: 150,
        default: [ 'collect_fish.png' ],
    }
};

// dragon types
SpriteData.DRAGON_EGG = {
    type: 60,
    normal: false,
    animations:
    {
        interval: 250,
        default: [ 'gold_flying/00.png', 'gold_flying/01.png', 'gold_flying/02.png', 'gold_flying/01.png' ]
    }
};
SpriteData.DRAGON_PURPLE = {
    type: 61,
    name: "special_carry_bubble",
    normal: false,
    animations:
    {
        interval: 200,
        default: [ 'special_dragon_grab.png' ],
        flying: [ 'purple_flying/00.png', 'purple_flying/01.png', 'purple_flying/02.png', 'purple_flying/01.png' ],
        gliding: [ 'purple_glide_02.png', 'purple_glide_03.png', 'purple_glide_02.png', 'purple_glide_04.png',  ],
    }
};
SpriteData.DRAGON_ORANGE = {
    type: 62,
    name: "special_burst_bubble",
    normal: false,
    animations:
    {
        interval: 100,
        default: [ 'special_dragon_pop.png' ],
        flying: [ 'orange_flying/00.png', 'orange_flying/01.png', 'orange_flying/02.png', 'orange_flying/01.png' ],
        shooting: [ 'orange_fireBlow/00.png', 'orange_fireBlow/01.png', 'orange_fireBlow/01.png', 'orange_fireBlow/02.png', 'orange_fireBlow/03.png', 'orange_fireBlow/04.png', 'orange_fireBlow/04.png', 'orange_fireBlow/05.png', 'orange_fireBlow/05.png' ]
    }
};

// automatic boosts
SpriteData.DRAGON_BLUE = {
    type: 100,
    name: "boost_convert_dragon",
    animations:
    {
        interval: 200,
        default: [ 'blue_flying/00.png' ],
        flying: [ 'blue_flying/00.png', 'blue_flying/01.png', 'blue_flying/02.png', 'blue_flying/01.png' ],
        shooting: [ 'blue_shake/00.png', 'blue_shake/01.png', 'blue_shake/02.png', 'blue_shake/03.png', 'blue_shake/00.png' ],
        boost: [ 'boostIcon_bluDrag.png' ]
    }
};
SpriteData.PLUS5 = {
    type: 101,
    name: "boost_extra_moves",
    animations:
    {
        interval: 0,
        default: [ '5plus.png' ],
        boost: [ '5plus.png' ]
    }
};

// effects
SpriteData.EFFECT_POP_BUBBLE = {
    type: 200,
    animations:
    {
        noRepeat: true,
        interval: 50,
        default: [ "zzz_explosion/0000", "zzz_explosion/0001", "zzz_explosion/0002", "zzz_explosion/0003", "zzz_explosion/0004", "zzz_explosion/0005", "zzz_explosion/0006", "zzz_explosion/0007", "zzz_explosion/0008", "zzz_explosion/0009", "zzz_explosion/0010", "zzz_explosion/0011", "zzz_explosion/0012", "zzz_explosion/0013", "zzz_explosion/0014", "zzz_explosion/0015", "zzz_explosion/0016", "zzz_explosion/0017", "zzz_explosion/0018" ]
    }
};
SpriteData.EFFECT_FALL_BUBBLE = {
    type: 201,
    animations:
    {
        noRepeat: true,
        interval: 20000,
        default: [ "bble_red.png" ]
    }
};
SpriteData.EFFECT_DROP_FISH = {
    type: 202,
    animations:
    {
        interval: 150,
        default: [ "fish/fish_00.png", "fish/fish_01.png", "fish/fish_02.png", "fish/fish_01.png" ]
    }
};
SpriteData.EFFECT_EXPLOSION = {
    type: 203,
    animations:
    {
        noRepeat: true,
        interval: 50,
        default: [ "00.png", "01.png", "02.png", "03.png", "04.png", "05.png", "06.png", "07.png" ]
    }
};
//SpriteData.EFFECT_BOOST_FAIRY = { type: 204 };
//SpriteData.EFFECT_BOOST_BONUS5 = { type: 205 };
SpriteData.EFFECT_ROCKET_SMOKE = {
    type: 206,
    animations:
    {
        noRepeat: true,
        interval: 250,
        default: [ "rocket_smoke/00.png", "rocket_smoke/01.png", "rocket_smoke/02.png" ]
    }
};
SpriteData.EFFECT_ROCKET_FIRE = {
    type: 207,
    animations:
    {
        interval: 150,
        default: [ "rocket_fire/00.png", "rocket_fire/01.png", "rocket_fire/02.png" ]
    }
};
SpriteData.EFFECT_DRAGON_FLAME_JET = {
    type: 208,
    animations:
    {
        noRepeat: true,
        interval: 100,
        default: [ "orange_fireball/00.png", "orange_fireball/01.png", "orange_fireball/02.png" ]
    }
};
SpriteData.EFFECT_BOOST_SMOKE = {
    type: 209,
    animations:
    {
        noRepeat: true,
        interval: 250,
        default: [ "fireball_smoke/00.png", "fireball_smoke/01.png", "fireball_smoke/02.png" ]
    }
};
SpriteData.EFFECT_DRAGON_LIGHTNING = {
    type: 210,
    animations:
    {
        noRepeat: true,
        interval: 150,
        default: [ "blue_lightning/00.png", "blue_lightning/01.png", "blue_lightning/02.png" ]
    }
};
SpriteData.EFFECT_FISH_SPLASH = {
    type: 211,
    animations:
    {
        noRepeat: true,
        interval: 75,
        default: [ "fishSplash_01.png","fishSplash_02.png","fishSplash_03.png","fishSplash_04.png","fishSplash_05.png" ]
    }
};
//SpriteData.EFFECT_CRACK_ICE = { type: 212 };
SpriteData.EFFECT_FAKE_BUBBLE = {
    type: 213,
    animations:
    {
        interval: 0,
        default: [ 'bble_red.png' ]
    }
};
SpriteData.EFFECT_SPARKLES_WHITE = {
    type: 214,
    animations:
    {
        noRepeat: true,
        interval: 100,
        default: [ "sparkles_white/sparkleWhite_00.png", "sparkles_white/sparkleWhite_01.png", "sparkles_white/sparkleWhite_02.png", "sparkles_white/sparkleWhite_03.png" ]
    }
};
SpriteData.EFFECT_SPARKLES_RAINBOW = {
    type: 215,
    animations:
    {
        noRepeat: true,
        interval: 120,
        default: [ "sparkles_rainbow/sprkleRnbw_00.png", "sparkles_rainbow/sprkleRnbw_01.png", "sparkles_rainbow/sprkleRnbw_02.png", "sparkles_rainbow/sprkleRnbw_03.png" ]
    }
};
SpriteData.EFFECT_STAR = {
    type: 216,
    animations:
    {
        interval: 0,
        default: [ "hud_star.png" ]
    }
};

// playfield elements
SpriteData.LAUNCHER_METER = {
    type: 300,
    animations:
    {
        interval: 0,
        default: [ "launchMeter.png" ]
    }
};
SpriteData.CEILING_BEAM = {
    type: 301,
    animations:
    {
        interval: 250,
        default: [ "ceiling/00.png", "ceiling/01.png", "ceiling/02.png" ]
    }
};

// misc
SpriteData.PRELOADER = {
    type: 400,
    key: 'load_spinner'
};



// self invoked immediate function to add additional references to SpriteData
// access with object reference (e.g. ["EFFECT_SPARKLES_RAINBOW"]), type integer, or by 'name' string without iteration
(function()
    {
        for( var type in SpriteData )
        {
            if ( SpriteData[type].type !== undefined )
                SpriteData[SpriteData[type].type] = SpriteData[type];
            if ( SpriteData[type].name !== undefined )
                SpriteData[SpriteData[type].name] = SpriteData[type];
        }
    }());
