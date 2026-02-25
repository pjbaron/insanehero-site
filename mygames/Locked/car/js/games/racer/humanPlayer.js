// A basic AI implementation for the racing game
define( [ 'games/racer/util', 'games/racer/common', 'games/racer/racer.core', 'games/racer/playerModule' ], function( Util, Common, Core, PlayerModule )
{

	var humanPlayer = ( function()
	{
		var player = function()
		{
			this.constructor.super.call( this );
			this.isYou = true;
		};
		Util.inherit( player, PlayerModule );

		player.prototype.steer = function( dt )
		{
			var speedPercent = this.car.speed / Common.maxSpeed;
			var ax = speedPercent / 2.0;     // at top speed, should be able to cross from left to right (-1 to 1) in N seconds
			var dx = 2 * speedPercent * dt;  // maximum turn angle depends on speed
			if ( this.input.left )
			{
				this.car.dx = Math.max( Util.accelerate( this.car.dx, -ax, dt ), -dx );
			}
			else if ( this.input.right )
			{
				this.car.dx = Math.min( Util.accelerate( this.car.dx, ax, dt ), dx );
			}
			else
			{
				if ( Math.abs( this.car.x ) > 0.001 )
					this.car.dx *= 0.5;
			}
			this.car.x += this.car.dx;
		};
		player.prototype.accelerate = function( dt )
		{
			this.car._z = this.car.z;
			this.car.z = Util.increase( this.car.z, dt * this.car.speed, Common.trackLength );

			if ( this.input.faster && !this.input.drift )
				this.car.speed = Util.accelerate( this.car.speed, this.car.accel, dt );
			else if ( this.input.slower )
				this.car.speed = Util.accelerate( this.car.speed, Common.breaking, dt );
			else
				this.car.speed = Util.accelerate( this.car.speed, Common.decel, dt );
		};

		return player;
	} )();

	return humanPlayer;
} );