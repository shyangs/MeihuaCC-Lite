'use strict';
/* MeihuaCC Lite is licensed under GPLv2 or later versions. See the LICENSE file. */

let gEl = function(id){
	return document.getElementById(id);
};

self.port.emit('eRequestPrefLang');
self.port.on('eResponsePrefLang', function(prefLang){
	if(prefLang === 'zh-CN'){
		gEl('radioCN').checked = true;
		gEl('radioTW').checked = false;
	}else{
		gEl('radioCN').checked = false;
		gEl('radioTW').checked = true;
	}

	[gEl('radioCN'), gEl('radioTW')].forEach(function(elmt){
		elmt.addEventListener('change', function(event){
			//basicModal 待處理 重設規則 警示
			basicModal.show({
				body: '<p>改變慣用語言將會重設Pattern. Are you sure you want to continue?</p>',
				closable: true,
				buttons: {
					cancel: {
						title: 'Cancel',
						fn: function(){
							let bool = gEl('radioTW').checked;
							gEl('radioCN').checked = bool;
							gEl('radioTW').checked = !bool;
							basicModal.close();
						}
					},
					action: {
						title: 'Continue',
						fn:  function(){
							self.port.emit('eChangePrefLang', (gEl('radioCN').checked?'zh-CN':'zh-TW') );
							basicModal.close();
						}
					}
				}
			});

		});
	});

});

self.port.on('eChangePrefLang', function(){
	document.location.reload(true);
});

let saveStorage = function(arr){
	self.port.emit(
		'eSaveStorage',
		arr.map(function(o){
			return o._values;
		})
	);
};

self.port.emit('eRequestTableData');
self.port.on('eResponseTableData', function(ssIncludes){
	//alert(JSON.stringify(ssIncludes));
	let hackerList = new List('hacker-list', {
			item: 'hacker-item',
			listClass: 'list-container',
			page: 9007199254740992
		},
		ssIncludes
	);

	gEl('hacker-list').addEventListener('click', function(event){
		let arr = hackerList.items;
		let elmt = event.target;
		if(elmt.className.indexOf('fa-trash-o') !== -1){
			let index = elmt.closest('tr').firstElementChild.firstChild.nodeValue|0;
			hackerList.remove('index', index);

			for(let i = index-1, len = arr.length; i<len; i++){
				let item = arr[i];
				item.values({
					index: i+1,
					name: item.values().name,
					pattern: item.values().pattern,
					command: item.values().command,
				});
			}
			saveStorage(arr);
		}else if(elmt.className.indexOf('fa-arrows-v') !== -1){

			basicModal.show({
				body: '<p>請輸入新編號：</p><input id="basicModal__text" class="basicModal__text" type="text" name="value" />',
				buttons: {
					cancel: {
						title: 'Cancel',
						fn: basicModal.close
					},
					action: {
						title: 'OK',
						fn: (data) => {
							let newIndex = data.value|0;
							if(newIndex >= 1 && newIndex <= hackerList.items.length){
								let index = elmt.closest('tr').firstElementChild.firstChild.nodeValue|0;
								let arrTmp = Array.apply(null, Array(arr.length)).map(function(x, i){
									return i;
								});
								arrTmp.splice(index-1, 1);
								arrTmp.splice(newIndex-1, 0, index-1);
								arrTmp = arrTmp.map(function(x, i){
									if( i < Math.min(index, newIndex)-1 || i > Math.max(index, newIndex)-1 ){
										return arr[i]._values;
									}else{
										let o = arr[arrTmp[i]]._values;
										return {
											name: o.name,
											pattern: o.pattern,
											command: o.command
										};
									}
								});
								
								for(let i = Math.min(index, newIndex)-1; i < Math.max(index, newIndex); i++){
									let item = arr[i];
									item.values({
										index: i+1,
										name: arrTmp[i].name,
										pattern: arrTmp[i].pattern,
										command: arrTmp[i].command,
									});
								}
								saveStorage(arr);
								basicModal.close();

							}else{
								let elInput = gEl('basicModal__text');
								elInput.value = '';
								elInput.setAttribute('placeholder', '新編號必須是一個介於 1 與目前最大編號之間的整數！');
								return basicModal.error('value');
							}

						}
					}
				}
			});

		}
	}, false);

	gEl('btnAdd').addEventListener('click', function(){
		let inputName = gEl('inputName');
		let inputPattern = gEl('inputPattern');
		let inputCommand = gEl('inputCommand');

		if(inputPattern.value === ''){
			basicModal.show({
				body: '<p>未填寫「網址樣式」欄位！</p>',
				buttons: {
					action: {
						title: 'OK',
						fn: basicModal.close
					}
				}
			});
			
			return;
		}

		hackerList.add({
			index: hackerList.items.length + 1,
			name: inputName.value||'',
			pattern: inputPattern.value,
			command: (inputCommand.checked?'include':'exclude')
		});

		saveStorage(hackerList.items);

		inputName.value = '';
		inputPattern.value = '';

	}, false);

});