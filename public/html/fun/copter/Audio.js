/**
 * Audio.js
 *
 * Pete Baron
 * 3rd Decemeber 2014
 * 
 */


Audio = function()
{

};


Audio.sfxWindowExplode = null;
Audio.sfxBuildingBurns = [];
Audio.sfxRumble = null;
Audio.sfxRumbles = [];
Audio.sfxDemolished = null;
Audio.flySfx = null;
Audio.landSfx = null;
Audio.warnSfx = null;
Audio.explodeSfx = null;

Audio.sfxGrab_m = null;
Audio.sfxDie_m = null;
Audio.sfxSafe_m = null;
Audio.sfxFall_m = null;
Audio.sfxCall1_m = null;
Audio.sfxCall2_m = null;

Audio.sfxGrab_f = null;
Audio.sfxDie_f = null;
Audio.sfxSafe_f = null;
Audio.sfxFall_f = null;
Audio.sfxCall1_f = null;
Audio.sfxCall2_f = null;

Audio.sfxCalls = [];
Audio.sfxFalls = [];


Audio.prototype.create = function()
{
	Audio.sfxWindowExplode = game.sound.add("sfxWindowExplode", 1, false);

	Audio.sfxBuildingBurns = [];
	Audio.sfxRumbles = [];
	Audio.sfxDemolisheds = [];

	Audio.flySfx = game.sound.add('sfxChopperFlying', 1, true);
	Audio.landSfx = game.sound.add('sfxChopperLand', 1, false);
	Audio.warnSfx = game.sound.add('sfxChopperWarning', 1, false);
	Audio.explodeSfx = game.sound.add('sfxChopperExplode', 1, false);

	Audio.sfxCall1_m = game.sound.add("sfxMaleCall1", 1, false);
	Audio.sfxCall2_m = game.sound.add("sfxMaleCall2", 1, false);
	Audio.sfxCall1_f = game.sound.add("sfxFemaleCall1", 1, false);
	Audio.sfxCall2_f = game.sound.add("sfxFemaleCall2", 1, false);
	Audio.sfxCalls = [];
	Audio.sfxFalls = [];

	Audio.sfxGrab_m = game.sound.add("sfxMaleGrab", 1, false);
	Audio.sfxDie_m = game.sound.add("sfxMaleDie", 1, false);
	Audio.sfxSafe_m = game.sound.add("sfxMaleSafe", 1, false);
	Audio.sfxFall_m = game.sound.add("sfxMaleFall", 1, false);

	Audio.sfxGrab_f = game.sound.add("sfxFemaleGrab", 1, false);
	Audio.sfxDie_f = game.sound.add("sfxFemaleDie", 1, false);
	Audio.sfxSafe_f = game.sound.add("sfxFemaleSafe", 1, false);
	Audio.sfxFall_f = game.sound.add("sfxFemaleFall", 1, false);
};


Audio.prototype.destroy = function()
{
	Audio.sfxWindowExplode = game.sound.removeByKey("sfxWindowExplode");

	this.removeList(Audio.sfxBuildingBurns);
	this.removeList(Audio.sfxRumbles);
	this.removeList(Audio.sfxDemolisheds);
	this.removeList(Audio.sfxCalls);
	this.removeList(Audio.sfxFalls);
	
	game.sound.removeByKey('sfxChopperFlying');
	game.sound.removeByKey('sfxChopperLand');
	game.sound.removeByKey('sfxChopperWarning');
	game.sound.removeByKey('sfxChopperExplode');
 	game.sound.removeByKey("sfxMaleGrab");
	game.sound.removeByKey("sfxMaleDie");
 	game.sound.removeByKey("sfxMaleSafe");
 	game.sound.removeByKey("sfxMaleFall");
 	game.sound.removeByKey("sfxFemaleGrab");
	game.sound.removeByKey("sfxFemaleDie");
 	game.sound.removeByKey("sfxFemaleSafe");
 	game.sound.removeByKey("sfxFemaleFall");
	game.sound.removeByKey("sfxMaleCall1");
	game.sound.removeByKey("sfxMaleCall2");
	game.sound.removeByKey("sfxFemaleCall1");
	game.sound.removeByKey("sfxFemaleCall2");
};


Audio.prototype.removeList = function(list)
{
	for(var i = 0, l = list.length; i < l; i++)
		game.sound.remove(list[i]);
	list = null;
};


Audio.prototype.addToList = function(sound, list, playNow, loop, restart, max)
{
	if (loop === undefined) loop = false;

	if (max && list.length >= max)
	{
		var s = list.shift();
		s.stop();
		game.sound.remove(s);
	}

	var ns = game.sound.add(sound, 1, loop);
	list.push(ns);

	if (playNow)
		ns.play('', 0, 1, loop, restart);

	return ns;
};


Audio.prototype.removeFromList = function(sound, list)
{
	var i = list.indexOf(sound);
	if (i !== -1)
	{
		list[i].stop();
		game.sound.remove(list[i]);
		list.splice(i, 1);
	}
};


Audio.prototype.isInList = function(sound, list)
{
	var i = list.indexOf(sound);
	return (i !== -1);
};

