/**
 * League - Progression system with named rivals, save/load
 */

var League = (function() {

    var LEAGUES = [
        {
            name: 'Bronze League',
            rivals: [
                { name: 'Chip', style: 'aggressive', difficulty: 1 },
                { name: 'Daisy', style: 'defensive', difficulty: 1 },
                { name: 'Rex', style: 'sneaky', difficulty: 2 }
            ]
        },
        {
            name: 'Silver League',
            rivals: [
                { name: 'Storm', style: 'aggressive', difficulty: 2 },
                { name: 'Luna', style: 'defensive', difficulty: 3 },
                { name: 'Blaze', style: 'sneaky', difficulty: 3 }
            ]
        },
        {
            name: 'Gold League',
            rivals: [
                { name: 'Viper', style: 'aggressive', difficulty: 3 },
                { name: 'Sage', style: 'defensive', difficulty: 4 },
                { name: 'Ghost', style: 'sneaky', difficulty: 4 }
            ]
        },
        {
            name: 'Platinum League',
            rivals: [
                { name: 'Titan', style: 'aggressive', difficulty: 4 },
                { name: 'Oracle', style: 'defensive', difficulty: 5 },
                { name: 'Shadow', style: 'sneaky', difficulty: 5 }
            ]
        },
        {
            name: 'Diamond League',
            rivals: [
                { name: 'Inferno', style: 'aggressive', difficulty: 5 },
                { name: 'Aegis', style: 'defensive', difficulty: 5 },
                { name: 'Nexus', style: 'sneaky', difficulty: 5 }
            ]
        }
    ];

    var progress = {
        leagueIndex: 0,
        rivalIndex: 0,
        wins: 0,
        losses: 0,
        totalWins: 0,
        totalGames: 0
    };

    function load() {
        try {
            var saved = localStorage.getItem('hexclash_progress');
            if (saved) {
                var parsed = JSON.parse(saved);
                progress.leagueIndex = parsed.leagueIndex || 0;
                progress.rivalIndex = parsed.rivalIndex || 0;
                progress.wins = parsed.wins || 0;
                progress.losses = parsed.losses || 0;
                progress.totalWins = parsed.totalWins || 0;
                progress.totalGames = parsed.totalGames || 0;
            }
        } catch (e) {}
    }

    function save() {
        try {
            localStorage.setItem('hexclash_progress', JSON.stringify(progress));
        } catch (e) {}
    }

    function getCurrentRival() {
        var league = LEAGUES[progress.leagueIndex];
        if (!league) league = LEAGUES[LEAGUES.length - 1];
        var rival = league.rivals[progress.rivalIndex];
        if (!rival) rival = league.rivals[league.rivals.length - 1];
        return rival;
    }

    function getCurrentLeague() {
        return LEAGUES[progress.leagueIndex] || LEAGUES[LEAGUES.length - 1];
    }

    function getInfo() {
        var league = getCurrentLeague();
        var rival = getCurrentRival();
        return {
            leagueName: league.name,
            rivalName: rival.name,
            rivalStyle: rival.style,
            rivalDifficulty: rival.difficulty,
            wins: progress.wins,
            losses: progress.losses,
            totalWins: progress.totalWins,
            totalGames: progress.totalGames,
            leagueIndex: progress.leagueIndex,
            rivalIndex: progress.rivalIndex
        };
    }

    function recordWin() {
        progress.wins++;
        progress.totalWins++;
        progress.totalGames++;

        // Advance to next rival
        progress.rivalIndex++;
        var league = LEAGUES[progress.leagueIndex];
        if (league && progress.rivalIndex >= league.rivals.length) {
            // League completed, advance to next
            progress.rivalIndex = 0;
            progress.leagueIndex++;
            if (progress.leagueIndex >= LEAGUES.length) {
                progress.leagueIndex = LEAGUES.length - 1; // Stay at max
                progress.rivalIndex = 0; // Replay last league
            }
        }

        save();
    }

    function recordLoss() {
        progress.losses++;
        progress.totalGames++;
        save();
        // Don't advance - replay same rival
    }

    function reset() {
        progress.leagueIndex = 0;
        progress.rivalIndex = 0;
        progress.wins = 0;
        progress.losses = 0;
        progress.totalWins = 0;
        progress.totalGames = 0;
        save();
    }

    return {
        load: load,
        save: save,
        getCurrentRival: getCurrentRival,
        getCurrentLeague: getCurrentLeague,
        getInfo: getInfo,
        recordWin: recordWin,
        recordLoss: recordLoss,
        reset: reset,
        LEAGUES: LEAGUES
    };
})();
