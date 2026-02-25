var ArenaXApi = (function () {

    function ArenaXApi(observable) {
        var _this = this;

        _this.observable = observable;
        _this.actions = [];
        _this.locale = '';
        _this.assetOriginUrl = 'http://localhost:8080/';
        _this.events = [];
        _this.observable.subscribe(function (data) {
            var storedAction = _this.actions.find(function (action) {
                return action.type === data.type;
            });
            if (typeof storedAction !== 'undefined' && typeof storedAction.action === 'function') {
                storedAction.action();
            }
            if (data.type === 'GAME_LOCALE') {
                _this.locale = data.payload;
            }
            if (data.type === 'GAME_ASSET_ORIGIN_URL') {
                _this.assetOriginUrl = data.payload;
            }
            if (data.type === 'GAME_EVENT_LIST') {
                _this.events = data.payload;
            }

        });
    }

    ArenaXApi.prototype.dispatch = function (action) {
        this.observable.next(action);
    };

    ArenaXApi.prototype.addAction = function (type, action) {
        this.actions.push({type: type, action: action});
    };

    ArenaXApi.prototype.removeAction = function (type, action) {
        this.actions = this.actions.filter(function (a) {
            return a.type !== type;
        });
    };

    var instance;

    return {
        init: function (observable) {
            if (instance == null) {
                instance = new ArenaXApi(observable);
                instance.constructor = null;
            }
            return instance;
        },
        getInstance: function () {
            return instance;
        }
    };
})();

module.exports = ArenaXApi;