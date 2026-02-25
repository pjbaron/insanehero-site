function ArenaHelper(observable)
{
    if (window["ArenaXApi"] != undefined && window["ArenaXApi"] != null)
    {
        this._arenaXapi = ArenaXApi.init(observable);
        this._arenaXapi.dispatch({type: 'GAME_REGISTERED', payload: null});
    }

    if(window["ARK_game_arena_connector"]!=undefined)
    {
        window["ARK_game_arena_connector"].init();
    }

    // this._pauseHandler = this.handleMidrollStart.bind(this);
    // this._resumeHandler = this.handleMidrollFinish.bind(this);
};

// ========================= Methods =========================
ArenaHelper.prototype.addPauseAndResumeActions = function (pauseCallback,resumeCallback)
{
    if (this._arenaXapi)
    {
        this._arenaXapi.addAction('GAME_PAUSE', pauseCallback);
        this._arenaXapi.addAction('GAME_RESUME', resumeCallback);
    }
    else
    {

        window["ARK_game_arena_connector"].registerAction("pause", pauseCallback);
        window["ARK_game_arena_connector"].registerAction("resume", resumeCallback);
    }
}
ArenaHelper.prototype.requestMidroll = function ()
{
    console.log("[ArenaHelper] handleMidrollRequest");
    if (this._arenaXapi)
    {
        this._arenaXapi.dispatch({type: 'PAUSE_READY', payload: null});
    }
    else
    {
        window["ARK_game_arena_connector"].fireEventToArena("pause_ready");
    }
};

ArenaHelper.prototype.handleMidrollStart = function ()
{
    console.log("[ArenaHelper] handleMidrollStart");

};

ArenaHelper.prototype.handleMidrollFinish = function ()
{
    console.log("[ArenaHelper] handleMidrollFinish");

};

ArenaHelper.prototype.sendEventChange = function ()
{
    console.log("[ArenaHelper] handleEventChange");
    if (this._arenaXapi)
    {
        this._arenaXapi.dispatch({type: 'EVENT_CHANGE', payload: null})
    }
    else
    {
        window["ARK_game_arena_connector"].fireEventToArena("event_change");
    }
};

ArenaHelper.prototype.sendGameStart = function ()
{
    console.log("[ArenaHelper] handleGameStart");
    if (this._arenaXapi)
    {
        this._arenaXapi.dispatch({type: 'GAME_START', payload: null});
    }
    else
    {
        window["ARK_game_arena_connector"].fireEventToArena("game_start");
    }
};

ArenaHelper.prototype.sendGameEnd = function (score)
{
    console.log("[ArenaHelper] handleGameEnd");
    if (this._arenaXapi)
    {
        this._arenaXapi.dispatch({type: 'CHANGE_SCORE', payload: score});
        this._arenaXapi.dispatch({type: 'GAME_END', payload: null});
    }
    else
    {
        window["ARK_game_arena_connector"].changeScore(score);
        window["ARK_game_arena_connector"].fireEventToArena('game_end');
    }
};

ArenaHelper.prototype.shouldShowGameEnd = function ()
{
    if(this._arenaXapi)
    {
        return true;
    }

    return window["ARK_game_arena_connector"].showGameEnd() == "true";
};

ArenaHelper.prototype.getAbsoluteURL = function (relativeUrl)
{
    if(this._arenaXapi)
    {
        return [this._arenaXapi.assetOriginUrl, relativeUrl].join('');
    }
    return relativeUrl;

}

ArenaHelper.prototype.getLocale = function ()
{
    if (this._arenaXapi)
    {
        return this._arenaXapi.locale;
    }
    else
    {
        return window["ARK_game_arena_connector"].getParam('locale', 'en-US');
    }
}

// ========================= Destruction =========================
ArenaHelper.prototype.destroy = function()
{
    if (this._arenaXapi)
    {
        this._arenaXapi.removeAction('GAME_PAUSE');
        this._arenaXapi.removeAction('GAME_RESUME');
    }

};



