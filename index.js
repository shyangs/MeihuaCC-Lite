'use strict';
/* MeihuaCC Lite is licensed under GPLv2 or later versions. See the LICENSE file. */

let utils = require('sdk/window/utils');
let activeBrowserWindow = utils.getMostRecentBrowserWindow();
//var alert = activeBrowserWindow.alert;

let tabs = require("sdk/tabs");
let sp = require("sdk/simple-prefs");
let prefs = sp.prefs;
let self = require("sdk/self");

const DEFAULT_PATTERN_TW = [
	{pattern: '\\.tw/', command: 'exclude'},
	{pattern: '^https?://tw\\.', command: 'exclude'},
	{pattern: '[/.]big5[/.]', command: 'exclude'},
	{pattern: '\\.jp/', command: 'exclude'},
	{pattern: '^https?://jp\\.', command: 'exclude'},
	{pattern: 'moztw\\.org/', command: 'exclude'},
	{pattern: 'wikipedia\\.org/', command: 'exclude'},
	{pattern: '[-_=./]cn(?:[./:]|$)'},
	{pattern: '[-_=./]gbk?(?:[./]|$)'},
	{pattern: '123yq\\.com/'},
	{pattern: '\\.163\\.com/'},
	{pattern: '\\.17k\\.com/'},
	{pattern: '360doc\\.com/'},
	{pattern: 'alipay\\.com/'},
	{pattern: '\\.b5m\\.com/'},
	{pattern: 'baidu\\.com/'},
	{pattern: 'china\\.com/'},
	{pattern: 'douban\\.com/'},
	{pattern: '\\.dm5\\.com/'},
	{pattern: 'haosou\\.com/'},
	{pattern: 'hongxiu\\.com/'},
	{pattern: 'ifeng\\.net/'},
	{pattern: 'jjwxc\\.net/'},
	{pattern: 'mozest\\.com/'},
	{pattern: 'qdmm\\.com/'},
	{pattern: 'qidian\\.com/'},
	{pattern: '\\.qq\\.com/'},
	{pattern: 'readnovel\\.com/'},
	{pattern: 'sfacg\\.com/'},
	{pattern: 'sina\\.com/'},
	{pattern: 'sogou\\.com/'},
	{pattern: 'sohu\\.com/'},
	{pattern: 'soso\\.com/'},
	{pattern: 'taobao\\.com/'},
	{pattern: 'thethirdmedia\\.com/'},
	{pattern: 'tudou\\.com/'},
	{pattern: 'weibo\\.com/'},
	{pattern: 'xinhuanet\\.com/'},
	{pattern: 'youku\\.com/'},
	{pattern: 'zongheng\\.com/'}
];

const DEFAULT_PATTERN_CN = [
	{pattern: '\\.cn/', command: 'exclude'},
	{pattern: '^https?://cn\\.', command: 'exclude'},
	{pattern: '\\.jp/', command: 'exclude'},
	{pattern: '^https?://jp\\.', command: 'exclude'},
	{pattern: 'wikipedia\\.org/', command: 'exclude'},
	{pattern: '[-_=./]tw(?:[./:]|$)'},
	{pattern: '[-_=./]big5(?:[./]|$)'},
	{pattern: 'chinatimes\\.com/'},
	{pattern: '[./]ck101\\.com/'},
	{pattern: 'ettoday\\.net/'},
	{pattern: '\\.eyny\\.com/'},
	{pattern: 'mobile01\\.com/'},
	{pattern: 'moztw\\.org/'},
	{pattern: 'nownews\\.com/'},
	{pattern: 'pixnet\\.net/'},
	{pattern: '[./]udn\\.com/'},
	{pattern: 'xuite\\.net/'}
];

let oTables = {aMappings:[], maxPhLen:0};

let addTable = function(table){
		oTables = {
			aMappings: oTables.aMappings.concat(table.aMappings),
			maxPhLen: Math.max(oTables.maxPhLen, table.maxPhLen)
		};
};

let gPref = function(prefName){
	if( typeof(prefs[prefName]) === 'undefined' ){
		switch(prefName){
			case 'prefLang':
				prefs[prefName] = ('zh-CN'===require("sdk/preferences/service").get('general.useragent.locale'))?'zh-CN':'zh-TW';
				break;
			case 'patterns_zh-CN':
			case 'patterns_zh-TW':
				let arr = ('zh-CN'===gPref('prefLang')?DEFAULT_PATTERN_CN:DEFAULT_PATTERN_TW).map(function(o, i){
					return ({
						index: i+1,
						name: o.name||'',
						pattern: o.pattern,
						command: o.command||'include'
					});
				});

				prefs[prefName] = JSON.stringify(arr);
				break;
		}
	}

	return prefs[prefName];
};

let initTable = function(pattern, arrFileName){
	oTables = {aMappings:[], maxPhLen:0};
	arrFileName.forEach(function(json){
		addTable(JSON.parse(self.data.load(json)));
	});
};

let initRule = function(prefLang){
	if('zh-CN'===prefLang){
		initTable(DEFAULT_PATTERN_CN, ['tw2cn_c.json', 'tw2cn_p.json']);
	}else{
		initTable(DEFAULT_PATTERN_TW, ['cn2tw_n.json', 'cn2tw_c.json', 'cn2tw_p.json']);
	}
};

initRule(gPref('prefLang'));

let pm = require("sdk/page-mod").PageMod({
  include: /.*/,
  contentScriptFile: [
		self.data.url('contentScript.js')
	],
  onAttach: function(worker){
		let fUrlHandler = function(href){
			let aRules = JSON.parse( gPref('patterns_'+gPref('prefLang')) );
			for(let i=0, len=aRules.length; i<len; i++){
				let oRule = aRules[i], pattern = oRule.pattern, command = oRule.command, 
					regexp = new RegExp(pattern, 'i');
				if( !regexp.test(href) ) continue;
				if(command !== 'exclude'){
					return oRule;
				}else{
					return false;
				}
			}

			return false;
		};
		
		if(!(fUrlHandler(worker.url))) return;
    worker.port.emit('eTransPage', oTables);
  }
});


let openOptionsTab = function(){

	tabs.open({
		url: self.data.url('options.html'),
		onReady: function(tab){
			let worker = tab.attach({
				contentScriptFile: [
					self.data.url('thirdparty/list.js'),
					self.data.url('thirdparty/basicModal.min.js'),
					self.data.url('options.js')
				]
			});
			worker.port.on('eChangePrefLang', function(lang){
				prefs.prefLang = lang;
				initRule(lang);
				worker.port.emit('eChangePrefLang');
			});
			worker.port.on("eRequestPrefLang", function(){
				worker.port.emit('eResponsePrefLang', gPref('prefLang'));
			});
			worker.port.on("eRequestTableData", function(){
				worker.port.emit('eResponseTableData', JSON.parse( gPref('patterns_'+gPref('prefLang')) ));
			});
			worker.port.on('eSaveStorage', function(tableData){
				prefs['patterns_'+gPref('prefLang')] = JSON.stringify(tableData);
			});
		}
	});

};

sp.on('options', openOptionsTab);


if(activeBrowserWindow.NativeWindow){
	let nw = require('./data/thirdparty/nativewindow');

	let menuID = nw.addMenu({
		name: "MeihuaCC Lite Options",
		callback: openOptionsTab
	});
	
	let handleUnload = function(reason){
		if (reason !== 'shutdown'){
			nw.removeMenu(menuID);
		}
	};

	exports.onUnload = handleUnload;
}