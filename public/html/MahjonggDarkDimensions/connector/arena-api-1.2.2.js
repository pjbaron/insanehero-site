// This API is an implementation of HTML <-> Mbile Arena communication, see doc for more: http://sharepoint.arkadium.com/teamsites/Engineering/webdev/_layouts/WordViewer.aspx?id=/teamsites/Engineering/webdev/Shared%20Documents/Game%20Library%20Protocol/html5-Games-Protocol.docx&Source=http%3A%2F%2Fsharepoint%2Earkadium%2Ecom%2Fteamsites%2FEngineering%2Fwebdev%2FSitePages%2FHome%2Easpx%3FRootFolder%3D%252Fteamsites%252FEngineering%252Fwebdev%252FShared%2520Documents%252FGame%2520Library%2520Protocol%26FolderCTID%3D0x012000F9123EF6DE1AEA418BB61278044D464A%26View%3D%7BC1C02E7D-0EA8-41B1-ADD3-2B5D36CE1FBC%7D&DefaultItemOpen=1
// No external libs are required

var ARK_game_arena_connector = {
	_compatibilityMode: false,
	_actionHandler: {},
	_showGameEnd: true,
	_scoreChangleLog: [],
	_score: 0,
	_playId: '',
	_gameSecret: '',
	_params: [],
	_arena_events_subscription: {},
	_arena_return_values_subscription: {},
	_TRUE_AS_STRING: String(true).toLowerCase(),
	_messageSender: null,
	_postInitCallback: null,

	_md5: function(string) {
		function RotateLeft(lValue, iShiftBits) {
			return (lValue<<iShiftBits) | (lValue>>>(32-iShiftBits));
		}

		function AddUnsigned(lX,lY) {
			var lX4,lY4,lX8,lY8,lResult;
			lX8 = (lX & 0x80000000);
			lY8 = (lY & 0x80000000);
			lX4 = (lX & 0x40000000);
			lY4 = (lY & 0x40000000);
			lResult = (lX & 0x3FFFFFFF)+(lY & 0x3FFFFFFF);
			if (lX4 & lY4) {
				return (lResult ^ 0x80000000 ^ lX8 ^ lY8);
			}
			if (lX4 | lY4) {
				if (lResult & 0x40000000) {
					return (lResult ^ 0xC0000000 ^ lX8 ^ lY8);
				} else {
					return (lResult ^ 0x40000000 ^ lX8 ^ lY8);
				}
			} else {
				return (lResult ^ lX8 ^ lY8);
			}
		}

		function F(x,y,z) { return (x & y) | ((~x) & z); }
		function G(x,y,z) { return (x & z) | (y & (~z)); }
		function H(x,y,z) { return (x ^ y ^ z); }
		function I(x,y,z) { return (y ^ (x | (~z))); }

		function FF(a,b,c,d,x,s,ac) {
			a = AddUnsigned(a, AddUnsigned(AddUnsigned(F(b, c, d), x), ac));
			return AddUnsigned(RotateLeft(a, s), b);
		};

		function GG(a,b,c,d,x,s,ac) {
			a = AddUnsigned(a, AddUnsigned(AddUnsigned(G(b, c, d), x), ac));
			return AddUnsigned(RotateLeft(a, s), b);
		};

		function HH(a,b,c,d,x,s,ac) {
			a = AddUnsigned(a, AddUnsigned(AddUnsigned(H(b, c, d), x), ac));
			return AddUnsigned(RotateLeft(a, s), b);
		};

		function II(a,b,c,d,x,s,ac) {
			a = AddUnsigned(a, AddUnsigned(AddUnsigned(I(b, c, d), x), ac));
			return AddUnsigned(RotateLeft(a, s), b);
		};

		function ConvertToWordArray(string) {
			var lWordCount;
			var lMessageLength = string.length;
			var lNumberOfWords_temp1=lMessageLength + 8;
			var lNumberOfWords_temp2=(lNumberOfWords_temp1-(lNumberOfWords_temp1 % 64))/64;
			var lNumberOfWords = (lNumberOfWords_temp2+1)*16;
			var lWordArray=Array(lNumberOfWords-1);
			var lBytePosition = 0;
			var lByteCount = 0;
			while ( lByteCount < lMessageLength ) {
				lWordCount = (lByteCount-(lByteCount % 4))/4;
				lBytePosition = (lByteCount % 4)*8;
				lWordArray[lWordCount] = (lWordArray[lWordCount] | (string.charCodeAt(lByteCount)<<lBytePosition));
				lByteCount++;
			}
			lWordCount = (lByteCount-(lByteCount % 4))/4;
			lBytePosition = (lByteCount % 4)*8;
			lWordArray[lWordCount] = lWordArray[lWordCount] | (0x80<<lBytePosition);
			lWordArray[lNumberOfWords-2] = lMessageLength<<3;
			lWordArray[lNumberOfWords-1] = lMessageLength>>>29;
			return lWordArray;
		};

		function WordToHex(lValue) {
			var WordToHexValue="",WordToHexValue_temp="",lByte,lCount;
			for (lCount = 0;lCount<=3;lCount++) {
				lByte = (lValue>>>(lCount*8)) & 255;
				WordToHexValue_temp = "0" + lByte.toString(16);
				WordToHexValue = WordToHexValue + WordToHexValue_temp.substr(WordToHexValue_temp.length-2,2);
			}
			return WordToHexValue;
		};

		function Utf8Encode(string) {
			string = string.replace(/\r\n/g,"\n");
			var utftext = "";

			for (var n = 0; n < string.length; n++) {

				var c = string.charCodeAt(n);

				if (c < 128) {
					utftext += String.fromCharCode(c);
				}
				else if((c > 127) && (c < 2048)) {
					utftext += String.fromCharCode((c >> 6) | 192);
					utftext += String.fromCharCode((c & 63) | 128);
				}
				else {
					utftext += String.fromCharCode((c >> 12) | 224);
					utftext += String.fromCharCode(((c >> 6) & 63) | 128);
					utftext += String.fromCharCode((c & 63) | 128);
				}

			}

			return utftext;
		};

		var x=Array();
		var k,AA,BB,CC,DD,a,b,c,d;
		var S11=7, S12=12, S13=17, S14=22;
		var S21=5, S22=9 , S23=14, S24=20;
		var S31=4, S32=11, S33=16, S34=23;
		var S41=6, S42=10, S43=15, S44=21;

		string = Utf8Encode(string);

		x = ConvertToWordArray(string);

		a = 0x67452301; b = 0xEFCDAB89; c = 0x98BADCFE; d = 0x10325476;

		for (k=0;k<x.length;k+=16) {
			AA=a; BB=b; CC=c; DD=d;
			a=FF(a,b,c,d,x[k+0], S11,0xD76AA478);
			d=FF(d,a,b,c,x[k+1], S12,0xE8C7B756);
			c=FF(c,d,a,b,x[k+2], S13,0x242070DB);
			b=FF(b,c,d,a,x[k+3], S14,0xC1BDCEEE);
			a=FF(a,b,c,d,x[k+4], S11,0xF57C0FAF);
			d=FF(d,a,b,c,x[k+5], S12,0x4787C62A);
			c=FF(c,d,a,b,x[k+6], S13,0xA8304613);
			b=FF(b,c,d,a,x[k+7], S14,0xFD469501);
			a=FF(a,b,c,d,x[k+8], S11,0x698098D8);
			d=FF(d,a,b,c,x[k+9], S12,0x8B44F7AF);
			c=FF(c,d,a,b,x[k+10],S13,0xFFFF5BB1);
			b=FF(b,c,d,a,x[k+11],S14,0x895CD7BE);
			a=FF(a,b,c,d,x[k+12],S11,0x6B901122);
			d=FF(d,a,b,c,x[k+13],S12,0xFD987193);
			c=FF(c,d,a,b,x[k+14],S13,0xA679438E);
			b=FF(b,c,d,a,x[k+15],S14,0x49B40821);
			a=GG(a,b,c,d,x[k+1], S21,0xF61E2562);
			d=GG(d,a,b,c,x[k+6], S22,0xC040B340);
			c=GG(c,d,a,b,x[k+11],S23,0x265E5A51);
			b=GG(b,c,d,a,x[k+0], S24,0xE9B6C7AA);
			a=GG(a,b,c,d,x[k+5], S21,0xD62F105D);
			d=GG(d,a,b,c,x[k+10],S22,0x2441453);
			c=GG(c,d,a,b,x[k+15],S23,0xD8A1E681);
			b=GG(b,c,d,a,x[k+4], S24,0xE7D3FBC8);
			a=GG(a,b,c,d,x[k+9], S21,0x21E1CDE6);
			d=GG(d,a,b,c,x[k+14],S22,0xC33707D6);
			c=GG(c,d,a,b,x[k+3], S23,0xF4D50D87);
			b=GG(b,c,d,a,x[k+8], S24,0x455A14ED);
			a=GG(a,b,c,d,x[k+13],S21,0xA9E3E905);
			d=GG(d,a,b,c,x[k+2], S22,0xFCEFA3F8);
			c=GG(c,d,a,b,x[k+7], S23,0x676F02D9);
			b=GG(b,c,d,a,x[k+12],S24,0x8D2A4C8A);
			a=HH(a,b,c,d,x[k+5], S31,0xFFFA3942);
			d=HH(d,a,b,c,x[k+8], S32,0x8771F681);
			c=HH(c,d,a,b,x[k+11],S33,0x6D9D6122);
			b=HH(b,c,d,a,x[k+14],S34,0xFDE5380C);
			a=HH(a,b,c,d,x[k+1], S31,0xA4BEEA44);
			d=HH(d,a,b,c,x[k+4], S32,0x4BDECFA9);
			c=HH(c,d,a,b,x[k+7], S33,0xF6BB4B60);
			b=HH(b,c,d,a,x[k+10],S34,0xBEBFBC70);
			a=HH(a,b,c,d,x[k+13],S31,0x289B7EC6);
			d=HH(d,a,b,c,x[k+0], S32,0xEAA127FA);
			c=HH(c,d,a,b,x[k+3], S33,0xD4EF3085);
			b=HH(b,c,d,a,x[k+6], S34,0x4881D05);
			a=HH(a,b,c,d,x[k+9], S31,0xD9D4D039);
			d=HH(d,a,b,c,x[k+12],S32,0xE6DB99E5);
			c=HH(c,d,a,b,x[k+15],S33,0x1FA27CF8);
			b=HH(b,c,d,a,x[k+2], S34,0xC4AC5665);
			a=II(a,b,c,d,x[k+0], S41,0xF4292244);
			d=II(d,a,b,c,x[k+7], S42,0x432AFF97);
			c=II(c,d,a,b,x[k+14],S43,0xAB9423A7);
			b=II(b,c,d,a,x[k+5], S44,0xFC93A039);
			a=II(a,b,c,d,x[k+12],S41,0x655B59C3);
			d=II(d,a,b,c,x[k+3], S42,0x8F0CCC92);
			c=II(c,d,a,b,x[k+10],S43,0xFFEFF47D);
			b=II(b,c,d,a,x[k+1], S44,0x85845DD1);
			a=II(a,b,c,d,x[k+8], S41,0x6FA87E4F);
			d=II(d,a,b,c,x[k+15],S42,0xFE2CE6E0);
			c=II(c,d,a,b,x[k+6], S43,0xA3014314);
			b=II(b,c,d,a,x[k+13],S44,0x4E0811A1);
			a=II(a,b,c,d,x[k+4], S41,0xF7537E82);
			d=II(d,a,b,c,x[k+11],S42,0xBD3AF235);
			c=II(c,d,a,b,x[k+2], S43,0x2AD7D2BB);
			b=II(b,c,d,a,x[k+9], S44,0xEB86D391);
			a=AddUnsigned(a,AA);
			b=AddUnsigned(b,BB);
			c=AddUnsigned(c,CC);
			d=AddUnsigned(d,DD);
		}

		var temp = WordToHex(a)+WordToHex(b)+WordToHex(c)+WordToHex(d);

		return temp.toLowerCase();
	},

	/*
	 Argument list for UrlEncode must be formed as list of key-value objects.
	 So objects must contain parameters 'key' and 'value'.
	 'Key' is a single string. 'value' is an array of values represented as strings.
	 */
	_urlEncode: function() {
		var res = "";
		var args = arguments;

		for (var i = 0; i < args.length; i++) {
			var key = args[i].key;
			var vals = args[i].value;

			res += key + "=";

			for (var v = 0; v < vals.length; v++) {
				res += vals[v];
				if (v < vals.length-1) {
					res += ","
				}
			}

			if (i < args.length-1) {
				res += "&";
			}
		}

		return res;
	},

	_urlDecode: function(str) {
		return decodeURIComponent((str+'').replace(/\+/g, '%20'));
	},

	_parseMessage: function(string) {
		var obj = {
			empty: true
			,events: []
			,actions: []
			,params: ARK_game_arena_connector._params
			,returnValues: []
			,show_game_end: ARK_game_arena_connector._showGameEnd // use current value as default
			,play_id: ARK_game_arena_connector._playId
		};

		var parts = string.split('&');

		for (var p = 0; p < parts.length; p++) {
			var partSplitted = parts[p].split('=');
			if (partSplitted.length !== 2) {
				continue;
			}
			var lValue = partSplitted[0];

			if(lValue === "action")
			{
				lValue = "actions";
			}
			var rValue = decodeURIComponent(partSplitted[1]);
			var rValues = rValue.split(',');

			if (lValue === "events" || lValue === "actions") {
				obj[lValue] = rValues;
				obj.empty = false;
			} else if (lValue === "get_values") {
				obj["returnValues"] = rValues;
				obj.empty = false;
			} else if (lValue === "play_id") {
				obj[lValue] = rValue;
				obj.empty = false;
			} else if (lValue === "show_game_end") {
				obj[lValue] = (rValue === ARK_game_arena_connector._TRUE_AS_STRING);
				obj.empty = false;
			} else {
				if (rValues.length > 0) {
					obj.empty = false;
					var addNewParam = true;
					for (var val = 0; val < rValues.length; val++) {
						for (var i = 0; i < obj.params.length; ++i) {
							if (obj.params[i].name === lValue) {
								obj.params[i].value = decodeURIComponent(rValues[val]);
								addNewParam = false;
								break;
							}
						}
						if (addNewParam) {
							obj.params.push({
								name:lValue
								,value: decodeURIComponent(rValues[val])
							});
						}
					}
				}
			}
		}

		return obj;
	},

	registerAction: function(actionName, handler) {
		ARK_game_arena_connector._actionHandler[actionName] = handler;
	},

	fireEventToArena: function(eventName) {
		console.log('fireEventToArena message: ' + eventName);
		//deprecated code
		/*
		if (ARK_game_arena_connector._compatibilityMode && eventName === 'game_end') {
		 try { ARK_game_arena_connector._messageSender('sc' + ARK_game_arena_connector._score); }
		 catch(e) {}
		} else
		*/

		if (ARK_game_arena_connector._arena_events_subscription[eventName] === true || eventName === 'event_change') {
			var message = 'event=' + eventName;
			if (eventName === 'game_end') {
				message += '&score=' + encodeURIComponent(ARK_game_arena_connector._score) + '&score_hash=' + ARK_game_arena_connector._md5(ARK_game_arena_connector._score.toString() + '_' + ARK_game_arena_connector._playId + '_' + ARK_game_arena_connector._gameSecret);
				for (var i in ARK_game_arena_connector._arena_return_values_subscription) {
					if (i === 'game_log' && ARK_game_arena_connector._arena_return_values_subscription[i] === true) {
						message += '&game_log=' + encodeURIComponent(JSON.stringify(ARK_game_arena_connector._scoreChangleLog));
					}
				}
			}
			try {
				ARK_game_arena_connector._messageSender(message, "*");
			} catch(e) {}
		}
	},

	showGameEnd: function() {
		return ARK_game_arena_connector._showGameEnd;
	},

	// the game should call this whenever score changes
	changeScore: function(score, comment) {
		ARK_game_arena_connector._score = score;
		ARK_game_arena_connector._scoreChangleLog.push({ score: score, time: new Date().getTime(), comment: comment });
	},

	setGameSecret: function(gameSecret) {
		ARK_game_arena_connector._gameSecret = gameSecret;
	},

	_handleMessageFromArena: function(event) {
		ARK_game_arena_connector.doInit(event.data);
	},

	_iframe_messageSender: function(message) {
		console.log('_iframe_messageSender message: ' + message);
		parent.postMessage(message, "*");
	},

	_arkPage_messageSender: function(message) {
		console.log('arkpage_messageSender message: ' + message);
		arkPage.postMessage(message);
	},

	getParam: function(paramName, defaultValue) {
		console.log("Arena get params",ARK_game_arena_connector._params.length)
		for (var i = 0; i < ARK_game_arena_connector._params.length; ++i) {
			console.log("Arena Param ",ARK_game_arena_connector._params[i].name,ARK_game_arena_connector._params[i].value)
			if (ARK_game_arena_connector._params[i].name === paramName) {

				return ARK_game_arena_connector._params[i].value;
			}
		}
		return defaultValue;
	},

	init: function(postInitCallback, externalParams) {
		ARK_game_arena_connector._postInitCallback = (typeof postInitCallback === 'function' ? postInitCallback : null);
		if ('arkPage' in window && arkPage.postMessage != null) {
			ARK_game_arena_connector._messageSender = ARK_game_arena_connector._arkPage_messageSender;
			ARK_game_arena_connector._arkPage_messageSender('event=game_loaded&callback=ARK_game_arena_connector.doInit');
		} else {
			ARK_game_arena_connector._messageSender = ARK_game_arena_connector._iframe_messageSender;
			if (window.addEventListener) {
				window.addEventListener('message', ARK_game_arena_connector._handleMessageFromArena, false);
			} else {
				window.attachEvent('onmessage', ARK_game_arena_connector._handleMessageFromArena);
			}
			var params;
			if (externalParams) {
				params = ''.concat(window.location.search.substr(1), '&', externalParams);
			} else {
				params = window.location.search.substr(1);
			}
			ARK_game_arena_connector.doInit(params);
		}
	},

	doInit: function(params) {
		// message handle
		var handler, i;
		var messageObject = ARK_game_arena_connector._parseMessage(params);

		if (messageObject.empty) {
			// REMOVED: [ebuchholz] removing this section should prevent compatibility mode, and should fix the bug where the game end button does not work
			//ARK_game_arena_connector._compatibilityMode = true;
			//if (ARK_game_arena_connector._postInitCallback !== null) {
			//	// call post-init callback. This is used in scheme with in-page game rendering: the game should not start untill preroll Ad is completed.
			//	ARK_game_arena_connector._postInitCallback();
			//	ARK_game_arena_connector._postInitCallback = null; // safety check
			//}
			return;
		}

		ARK_game_arena_connector._showGameEnd = messageObject.show_game_end;
		ARK_game_arena_connector._playId = messageObject.play_id;
		ARK_game_arena_connector._params = messageObject.params;

		for (i = 0; i < messageObject.actions.length; ++i) {
			handler = ARK_game_arena_connector._actionHandler[messageObject.actions[i]];
			if (typeof handler === 'function') {
				handler(messageObject.params);
			}
		}

		var returnValuesMessage = '';
		for (i = 0; i < messageObject.returnValues.length; ++i) {
			ARK_game_arena_connector._arena_return_values_subscription[messageObject.returnValues[i]] = true;
			if (messageObject.returnValues[i] === 'score') {
				returnValuesMessage += 'score=' + encodeURIComponent(ARK_game_arena_connector._score); // <- Should score be encoded ???
			}
			if (messageObject.returnValues[i] === 'score_hash') {
				returnValuesMessage += '&score_hash=' + ARK_game_arena_connector._md5(ARK_game_arena_connector._score.toString() + '_' + ARK_game_arena_connector._playId);
			}
			if (messageObject.returnValues[i] === 'game_log') {
				returnValuesMessage += '&game_log=' + encodeURIComponent(JSON.stringify(ARK_game_arena_connector._scoreChangleLog));
			}
		}

		for (i = 0; i < messageObject.events.length; ++i) {
			ARK_game_arena_connector._arena_events_subscription[messageObject.events[i]] = true;
		}

		if (returnValuesMessage.length > 0) {
			ARK_game_arena_connector._messageSender(returnValuesMessage);
		}

		if (ARK_game_arena_connector._postInitCallback !== null) {
			// call post-init callback. This is used in scheme with in-page game rendering: the game should not start untill preroll Ad is completed.
			ARK_game_arena_connector._postInitCallback();
			ARK_game_arena_connector._postInitCallback = null; // safety check
		}
	}
}; // ARK_game_arena_connector END


/*
 function parse(string) {
 return {
 events: []
 ,actions: []
 ,playId: 123
 ,params: [ { name: "qwe", value: "ccc"} ]
 ,showGameEnd: false
 ,returnValues: []
 }
 }*/
