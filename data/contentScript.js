'use strict';
/* MeihuaCC Lite is licensed under GPLv2 or later versions. See the LICENSE file. */

let Core = function(win){
	let {document: document, MutationObserver: MutationObserver, NodeFilter: NodeFilter, setTimeout: setTimeout, console: console} = win,
		config = {bConvFrame: true, bConvTitle: true, bConvAlt: true},
		observeOpt = {
			childList: true,
			subtree:true
		};
	
	let setTable = function(oTables){
		return {
			mPhrases: new Map(oTables.aMappings),
			maxPhLen: oTables.maxPhLen
		};
	},

	convert = function(str, table){
		let leng = Math.min(table.maxPhLen, str.length);
		let mPhrases = table.mPhrases;
		let txt = '';
		for(let idx = 0, strLen = str.length; idx < strLen;){
			let bHit = false;
			for(let j = leng; j > 0; j--){
				let ss = str.substr(idx, j);
				if(mPhrases.has(ss)){
					txt += mPhrases.get(ss);
					idx += j;
					bHit = true;
					break;
				}
			}

			if(!bHit){
				txt += str.substr(idx, 1);
				idx++;
			}
		}
		if (txt !== '') str = txt;
		return str;
	},

	observerCallback = function(mutations, self){
		mutations.forEach(function(mutation){
			for( let node of mutation.addedNodes ){
				switch(node.nodeType){
					case 1: // ELEMENT_NODE
						transPage({elmt: node, bObs: false, table: self.table});
					break;
					case 3: // TEXT_NODE
						node.nodeValue = convert(node.nodeValue, self.table);
					break;
				}
			}
		});
	},

	walkStep = function(walker, type, startTime, table){
		let node = walker.nextNode();
		if(!node) return;
		switch(type){
			case 'frame':
				let doc = node.contentDocument;
				if('undefined' !== typeof doc) transPage({elmt: doc, bObs: true, table: table});
			break;
			case 'nodeValue':
				node[type] = convert(node.nodeValue, table);
			break;
			case 'alt':
			case 'title':
				node[type] = convert(node.getAttribute(type), table);
			break;
		}

		if(Date.now() - startTime < 50){
			walkStep(walker, type, startTime, table);
		}else{
			setTimeout(function(){
				walkStep(walker, type, Date.now(), table);
			}, 0);
		}
	},

	treeWalker = function(root, whatToShow, type, table){
		let filter;
		switch(type){
			case 'nodeValue':
				filter = {
					acceptNode: function(node){
						switch(node.parentNode.nodeName.toUpperCase()){
							case 'SCRIPT':
							case 'STYLE':
								return NodeFilter.FILTER_REJECT;
						}
						return NodeFilter.FILTER_ACCEPT;
					}
				};
			break;
			case 'frame':
				filter = {
					acceptNode: function(node){
						let tag = node.nodeName.toUpperCase();
						return ( (tag === 'FRAME' || tag === 'IFRAME') ? NodeFilter.FILTER_ACCEPT : NodeFilter.FILTER_SKIP );
					}
				};
			break;
			case 'alt':
			case 'title':
				filter = {
					acceptNode: function(node){
						return ( node.hasAttribute(type) ? NodeFilter.FILTER_ACCEPT : NodeFilter.FILTER_SKIP );
					}
				};
			break;
		}
		
		let doc = (root.nodeType === 9 ? root : root.ownerDocument),
		walker = doc.createTreeWalker(root, whatToShow, filter);
		walkStep(walker, type, Date.now(), table);
	},

	transPage = function(obj){
		let { elmt, bObs, table } = obj;
		if(bObs){
			let observer = new MutationObserver(observerCallback);
			observer.table = table;
			observer.observe(elmt, observeOpt);
		}

		treeWalker(elmt, NodeFilter.SHOW_TEXT, 'nodeValue', table);
		if(config.bConvFrame) treeWalker(elmt, NodeFilter.SHOW_ELEMENT, 'frame', table);
		if(config.bConvTitle) treeWalker(elmt, NodeFilter.SHOW_ELEMENT, 'title', table);
		if(config.bConvAlt) treeWalker(elmt, NodeFilter.SHOW_ELEMENT, 'alt', table);
	};

	return {
		setTable: setTable,
		transPage: transPage
	};
};

self.port.on('eTransPage', function(oTables){
  let MeihuaCC = Core(window);
	let oCacheMaps = MeihuaCC.setTable(oTables);

	MeihuaCC.transPage({
		elmt: document,
		bObs: true,
		table: oCacheMaps
	});
});