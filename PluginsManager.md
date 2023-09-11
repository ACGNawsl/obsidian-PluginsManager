---
obsidianEditingMode: source
---

```dataview js
//=======================
//create by:ACGNawsl
//create time:2023/8/21
//last update:2023/9/6
//version:1.24
//=======================
const fs = require("fs");
const path = require("path");
const obsidian = require("obsidian");

//如果你想要把它用作自己的库中，你需要修改下面的四个路径，并将上面dataview js中的空格去掉

const SAVETABLEPATH = "08 - obsidian学习/插件/未命名1/Plugins.md";
const THENFASTLOADMDFILE = "99 - 其他/800 - 模板/FastStart/FastStart-Plugins-ShortDelay.md";
const THENSLOWLOADMDFILE = "99 - 其他/800 - 模板/FastStart/FastStart-Plugins-LongDelay.md";
const COMMONJSFILE = "08 - obsidian学习/插件/未命名1/common.js";

const HEADERSOBJ = [
  { text: "状态", width: "80px", clickEvent: "sort", generateTableExcept: true },
  { text: "id", width: "330px", clickEvent: "sort" },
  { text: "名称", width: "170px", clickEvent: "sort" },
  { text: "标签", width: "", clickEvent: "tagFilter" },
  { text: "操作区", width: "", clickEvent: "none", generateTableExcept: true }];
  //顺序为显示表格列的顺序，如果保存的md中表格列的顺序更改，这里也要同步更改，排除的不用添加

const ONLOADPLUGINTAG = "#插件/启动时加载";
const THENFASTLOADPLUGINTAG = "#插件/动态加载_快速";
const THENSLOWLOADPLUGINTAG = "#插件/动态加载_慢速";
const PLUGINUNLOADEDTAG = "#插件/已卸载"



let g_lastSortOption = { th: null, sortOrder: "asc"};//排序选项
let g_lastTagFilterLogic = true;
let g_lastFilterTags = [];//上次筛选的标签，在刷新列表按照这个筛选


//已完成
//直接修改manifests的name字段
//名称默认读取，manifests的name字段
//可以设置默认启动加载的插件
//设置插件为 启动时加载时，动态添加，删除tag标签
//默认生成 启动时加载的插件
//恢复上次排序
//打开文件夹
//标签快速添加完成
//标签懒加载实际功能
//标签删除逻辑
//打开设置界面
//卸载基本完成




/**
//默认获取当前目录下的common.js
//dv.currentFilePath
const currentFile = app.workspace.getActiveFile().path;
const fullPath = app.vault.adapter.basePath + '\\' + path.dirname(currentFile).replace('/','\\');
const jsContent = fs.readFileSync(fullPath + '\\common.js', 'utf-8');
*/
//手动定义目录
//const fullPath = app.vault.adapter.basePath + '\\' + '08 - obsidian学习/插件/未命名1/common.js'.replace('/','\\');
const fullPath = app.vault.adapter.basePath + '\\' + COMMONJSFILE.replace('/','\\');
const jsContent = fs.readFileSync(fullPath, 'utf-8');

//删除上次引入的js
let lastScript = document.getElementById("commonJS");
if(lastScript){ lastScript.parentNode.removeChild(lastScript); }
//引入js
let script = document.createElement('script');
script.id = 'commonJS';
script.text = jsContent;
document.head.appendChild(script);

//去除栏宽
let viewEles =  document.querySelectorAll('.workspace-leaf.mod-active .is-readable-line-width');
viewEles.forEach(function(viewEle) {
	viewEle.classList.remove('is-readable-line-width');
});


let import_obsidian2 = require("obsidian");
let GenericYesNoPrompt = class extends import_obsidian2.Modal {
  constructor(app2, header, text) {
    super(app2);
    this.header = header;
    this.text = text;
    this.didSubmit = false;
    this.waitForClose = new Promise((resolve, reject) => {
      this.resolvePromise = resolve;
      this.rejectPromise = reject;
    });
    this.open();
    this.display();
  }
  static Prompt(app2, header, text) {
    const newPromptModal = new GenericYesNoPrompt(app2, header, text);
    return newPromptModal.waitForClose;
  }
  display() {
    //this.containerEl.addClass("quickAddModal", "qaYesNoPrompt");
    this.contentEl.empty();
    this.titleEl.textContent = this.header;
    this.contentEl.createEl("p", { text: this.text });

    const buttonsDiv = this.contentEl.createDiv({
      cls: "modal-button-container"
    });
    
	const yesButton = new import_obsidian2.ButtonComponent(buttonsDiv).setButtonText("卸载").onClick(() => this.submit(true)).setWarning();
    const canButton = new import_obsidian2.ButtonComponent(buttonsDiv).setButtonText("取消").onClick(() => this.submit(false));
    canButton.buttonEl.focus();
  }
  submit(input) {
    this.input = input;
    this.didSubmit = true;
    this.close();
  }
  onClose() {
    super.onClose();
    if (!this.didSubmit)
      this.rejectPromise("No answer given.");
    else
      this.resolvePromise(this.input);
  }
};


defineColFilterStyle(this.container);//定义列筛选器样式
const manifestPathDictById = createIdToManifestPathDict();//id对应插件的manifest目录


//=====================刷新显示列表=====================
function refreshShowTable(originText,containerRef,showObsidian,setOnLoadPlugin,restoreLastSort = false){
	
	let loadedPlugins;
	if(setOnLoadPlugin == true){
		//loadedPlugins = Array.from(app.plugins.enabledPlugins);//动态加载的不包括，在设置启动时加载插件时，原本关闭的插件被打开，并写入到plugin.json中，但是在刷新后还是不会显示开启，用下面的代码可以解决这个问题
		loadedPlugins = getOnLoadPluginIdArray();
	}else{
		loadedPlugins = Object.keys(app.plugins.plugins);//包括动态加载的所有启用的插件
	}
	
	let obj = { idToColDict:{} }
	getInfoFromTableText(originText,obj);
	let idToColDict = obj.idToColDict;
	
	let table = document.getElementById("showTable");
	if(table){ table.parentNode.removeChild(table); }//删除上次生成的表
	
	table = containerRef.createEl("table");
	table.setAttribute("id", "showTable");
	
	// 创建表头
	const row = table.createTHead().insertRow();
	HEADERSOBJ.forEach((header) => {
		const th = document.createElement("th");
		th.textContent = header.text;
		th.width = header.width;
		//th.style.border = "1px solid black";		
		//th.style.padding = "5px";
		th.style.userSelect = "none";
		if (header.clickEvent == "sort") {
			th.addEventListener("click", () => sortTable(th));//th.cellIndex,
		}else if(header.clickEvent == "tagFilter"){
			th.addEventListener("click", (event) => {createTagFilter(th); event.stopPropagation();});
		}
		
		row.appendChild(th);
	});

	//创建标签下拉框
	function createTagFilter(th){
		let dropdownPanel = document.getElementById("tagDropdownPanel");
		if(dropdownPanel){ dropdownPanel.parentNode.removeChild(dropdownPanel); }//删除上次生成的标签筛选下拉框
		
		dropdownPanel = document.createElement('div');
		dropdownPanel.classList.add('dropdown-panel');
		dropdownPanel.id = 'tagDropdownPanel';
		const thRect = th.getBoundingClientRect();
		
		dropdownPanel.style.left = (thRect.left + 70) + "px";
		dropdownPanel.style.top = (thRect.top + 125) + "px";
		dropdownPanel.style.width = "160px";
		dropdownPanel.addEventListener('click', (event) => {
			event.stopPropagation();
		});

		/**
		let tagsCell = document.querySelectorAll('.tagsCell');
		const tagsContentSet = new Set();
		for (let item of tagsCell) {
			//console.log(item);
			let text = item.textContent.trim();
			if(text != ''){
				text.split('#').filter(item => item.trim() != '').map(item => item.trim()).forEach((element) => {tagsContentSet.add(element)})//取出不重复的标签
			}
		}*/
	
		const tagsContentArrayNoRepeat = getSplitCellContentInCol('.tagsCell','#');

		let count = 0;
		const optionsDict = tagsContentArrayNoRepeat.map(item => {return { value: count++, text: item }}).reduce(function(acc, cur) { acc[cur.value] = cur.text; return acc; }, {});//组成下面的字典，其中键值和checkbox.value是对应的
		//console.log(optionsDict);
		//const options = {"0":"标签1", "1":"标签2", "2":"标签3", "3":"标签4"}
		
		//标签筛选逻辑
		const logicOr = document.createElement('div');
		logicOr.textContent = "或";
		logicOr.style.display = "inline-block";
		logicOr.style.position = "relative"
		logicOr.style.top = "-5px";
		logicOr.style.marginRight = "5px";
		dropdownPanel.appendChild(logicOr);
		
		const filterLogic = document.createElement("my-custom-toggle");
		filterLogic.addEventListener("change", () => {
			g_lastTagFilterLogic = filterLogic.checked;
		});
		filterLogic.checked = g_lastTagFilterLogic;
		dropdownPanel.appendChild(filterLogic);
		
		const logicAnd = document.createElement('div');
		logicAnd.textContent = "且";
		logicAnd.style.display = "inline-block";
		logicAnd.style.position = "relative";
		logicAnd.style.top = "-5px";
		logicAnd.style.marginLeft = "5px";
		dropdownPanel.appendChild(logicAnd);
		
		
		let optionPanel = document.createElement('div');
		Object.keys(optionsDict).forEach((key) => {//创建面板中的选择
			let {checkbox, label} = createCheckBoxPanel(optionPanel, optionsDict[key], false, optionsDict[key],null)
			checkbox.style.marginLeft = "0px";
			checkbox.style.marginLeft = "5px";
			label.style.maxWidth = "140px";
		});
		dropdownPanel.appendChild(optionPanel);
		
		createButton(dropdownPanel, '确认', () => {
			const selectedTags = [];
			Array.from(dropdownPanel.querySelectorAll('input[type="checkbox"]')).forEach(checkbox => {
				if(checkbox.getAttribute('checked') == 'true'){
					selectedTags.push(checkbox.getAttribute('value'))
				}
			});
			//const selectedOptions = Array.from(dropdownPanel.querySelectorAll('input[type="checkbox"]:checked'))
				//.map((checkbox) => optionsDict[checkbox.value]);
			//console.log('选择的选项是：', selectedOptions);
			if(selectedTags.length != 0){
				g_lastFilterTags = selectedTags;
				tagsFilterProcess(selectedTags, filterLogic.checked);
			}
			if(dropdownPanel){ dropdownPanel.parentNode.removeChild(dropdownPanel); }//删除下拉框
			
		}).style.marginLeft = "0px";

		createButton(dropdownPanel, '取消', () => {
			if(dropdownPanel){ dropdownPanel.parentNode.removeChild(dropdownPanel); }//删除下拉框
		}).style.marginLeft = "8px";

		createButton(dropdownPanel, '重置', () => {
			g_lastFilterTags = [];
			refeshBtn.dispatchEvent(new Event("click"));
			if(dropdownPanel){ dropdownPanel.parentNode.removeChild(dropdownPanel); }//删除下拉框
		}).style.marginLeft = "0px";

		//containerRef.appendChild(dropdownPanel);
		document.body.appendChild(dropdownPanel);
	}

	function tagsFilterProcess(selectedTags, filterLogic){
		//console.log(filterLogic == false ? '标签或' : '标签且');
		let tagsCell = document.querySelectorAll('.tagsCell');
		let filterRow = [];
		for (let item of tagsCell) {//遍历所有存放tags的单元格
			let text = item.textContent.trim();
			if(text != ''){
				//console.log(text);
				let tagEls = text.split('#').filter(item => item.trim() != '').map(item => item.trim());
				for(let i=0;i<tagEls.length;i++){//遍历分割后的每一个tag
					//console.log(tagEl[i]);
					let ispush = false;
					if(filterLogic == false){//或
						for(let k=0;k<selectedTags.length;k++){
							//只有一个标签符合就符合筛选条件
							if(selectedTags[k].trim() == tagEls[i]){
								filterRow.push(item.parentNode);
								ispush = true; break;
							}
						}
					}else{//且
						ispush = true;
						for(let k=0;k<selectedTags.length;k++){
							if(!tagEls.includes(selectedTags[k].trim())){ ispush = false; break; }
						}
						if(ispush == true){ filterRow.push(item.parentNode); }//所有标签都符合了筛选条件才行
					}
					
					if(ispush == true){ break; }//这一行添加过了直接进入下一行的tagcell判断
				}
			}
		}
		
		//console.log(filterRow);
		let table = document.getElementById("showTable");
		let tbody = table.getElementsByTagName("tbody")[0];
		if(tbody){ table.removeChild(tbody); }//删除tbody，保留表头
		
		//创建tbody并添加行
		tbody = document.createElement("tbody");
		for(let i=0;i<filterRow.length;i++){ tbody.appendChild(filterRow[i]); }
		table.appendChild(tbody);
	}




	// 创建表格主体
	const tbody = table.createTBody();

	for(let id in idToColDict){
		let rowObj = {
			"state":  { "type":'toggle', "text": '', "editable": "false", "cellObj": null },//这里的文本是特殊组件标识文本，用于排序函数
			"idCell": { "type":'normalText', "text": showObsidian ? id : id.replace('obsidian-','').replace('-obsidian',''), "editable": "false", "cellObj": null },//列1
			"nameCell": { "type":'normalText', "text": idToColDict[id]["名称"], "editable": "true", "cellObj": null },
			"tagsCell": { "type":'normalText', "text": idToColDict[id]["标签"], "editable": "true", "cellObj": null },
			"operateCell": { "type":'none', "text": '', "editable": "false", "cellObj": null }
		};//[强 列相关]，其中text是初始值，在editable为true时，用户编辑完cell不会同步到text上，读取该值需要用cellObj.textContent

		let row = tbody.insertRow();//创建行
		for (let key in rowObj) {
			let cell = row.insertCell(); // 创建单元格
			cell.classList.add(key);//将key添加到class作为列单元格的标识
			cell.type = rowObj[key].type;
			if (rowObj[key].text !== ''){cell.textContent = rowObj[key].text;}
			if (rowObj[key].editable === "true"){cell.setAttribute("contenteditable", "true");}
			
			rowObj[key].cellObj = cell;
		}
		
		//============启用插件按钮============
		const toggle = document.createElement("my-custom-toggle");
		toggle.addEventListener("change", () => {
			//console.log(`${id}: ${toggle.checked}`);
			//动态加载/卸载插件
			if(toggle.checked){
				if(setOnLoadPlugin == true){
					if(!Object.keys(app.plugins.plugins).includes(id)){//防止重复加载插件
						app.plugins.enablePlugin(id);
					}
				}else{
					app.plugins.enablePlugin(id);
				}
				
			}else{
				app.plugins.disablePlugin(id)
			}
			//设置默认启动加载的插件，将id写到community-plugins.json文件中obsidian就会在启动时加载
			if(setOnLoadPlugin == true){
				let obj = { idToColDict:{} }
				getInfoFromTableText(originText,obj);
				let idToColDict = obj.idToColDict;
				
				let pluginArray = getOnLoadPluginIdArray();
				if(toggle.checked){
					if(!pluginArray.includes(id)){//不存在则添加到末尾
						pluginArray.push(id);
					}
					if(!idToColDict[id]["标签"].includes(ONLOADPLUGINTAG)){//不包含标签则添加标签
						if(idToColDict[id]["标签"].trim == ''){
							idToColDict[id]["标签"] = ONLOADPLUGINTAG;
						}else{
							idToColDict[id]["标签"] = idToColDict[id]["标签"] + ' ' + ONLOADPLUGINTAG;
						}
						
						let output = dictToTableText(idToColDict);//将idToColDict转为表格文本
						writeMDFile(SAVETABLEPATH, output);
						delayRefresh(output, containerRef, showObsidian, setOnLoadPlugin);
					}
				}else{
					pluginArray = pluginArray.filter(item => item != id);//删除某个id
					if(idToColDict[id]["标签"].includes(ONLOADPLUGINTAG)){//存在标签则删除标签
						idToColDict[id]["标签"] = idToColDict[id]["标签"].replace(ONLOADPLUGINTAG, '');
						
						let output = dictToTableText(idToColDict);//将idToColDict转为表格文本
						writeMDFile(SAVETABLEPATH, output);
						delayRefresh(output, containerRef, showObsidian, setOnLoadPlugin);
					}
				}
				
				const jsonStr = JSON.stringify(pluginArray,null,4);
				fs.writeFile(getOnLoadPluginConfigPath(), jsonStr, err => {  
				   if (err) { new Notice('json文件修改失败：' + err); return; }  
				   new Notice('json文件修改成功');  
				});
				console.log(pluginArray);
			}
		});
		toggle.checked = loadedPlugins.includes(id);
		rowObj["state"].cellObj.appendChild(toggle);


		//============单击id展开详细信息============
		/**
		rowObj["idCell"].cellObj.style.cursor = "pointer";
		rowObj["idCell"].cellObj.addEventListener("click", async () => {

			//删除上次展开的插件详细信息
		  	let pluginDatail = document.getElementById("datail-" + rowObj["idCell"].cellObj.textContent);
			if(pluginDatail){ pluginDatail.parentNode.removeChild(pluginDatail); return;}

			let clickRow = rowObj["idCell"].cellObj.parentNode;
			let newRow = tbody.insertRow(clickRow.rowIndex);//在点击的行后添加行
			newRow.setAttribute("id", "datail-" + rowObj["idCell"].cellObj.textContent);

			newRow.insertCell();
			//从第二个cell后开始打通成一个cell
			let cell2 = newRow.insertCell();
			cell2.setAttribute("colspan", (Object.keys(rowObj).length - 2).toString());


			const label = document.createElement("span");
			label.innerText = "abc\ndef\nghi";
			label.style.cursor = "pointer";
			label.style.userSelect = "none";
			
			
			cell2.appendChild(label)
		});
*/

		//============保存按钮============
		const saveBtn = document.createElement("button");
		//saveBtn.textContent = "保存";
		saveBtn.classList.add("saveBtn");
		saveBtn.style.display = 'inline-block';
		saveBtn.style.position = 'relative'
		saveBtn.style.top = '3px'
		saveBtn.style.marginLeft = '5px'
		saveBtn.setAttribute('aria-label', '保存');
		saveBtn.innerHTML = '<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="svg-icon lucide-save"><path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z"></path><polyline points="17 21 17 13 7 13 7 21"></polyline><polyline points="7 3 7 8 15 8"></polyline></svg>'
		saveBtn.addEventListener("click", async () => {
			//点击保存按钮重新读取md文件生成一次idToColDict
			let obj = { idToColDict:{} }
			getInfoFromTableText(originText,obj);
			let idToColDict = obj.idToColDict;
			
			if(id in idToColDict){//id in cell1.textContent //[列相关]
				//当前行的id是否在idToColDict，当保存表格更改后，这个显示表格可能不会及时刷新，所以要判断下
				if(rowObj["nameCell"].cellObj.textContent.trim() != ''){
					if(getManifestProp(manifestPathDictById[id],"name").trim() != rowObj["nameCell"].cellObj.textContent.trim()){//名称不一样则保存
						setManifestProp(manifestPathDictById[id],"name",rowObj["nameCell"].cellObj.textContent.trim());
					}

					//删除动态加载插件的md文档中值为id的插件
					let nowTagsArray = rowObj["tagsCell"].cellObj.textContent.split('#').map(item => item.trim()).filter(item => item != '');
					let lastTagsArray = idToColDict[id]["标签"].split('#').map(item => item.trim()).filter(item => item != '');
					let delTags = lastTagsArray.filter(item => !nowTagsArray.includes(item));
					//console.log(delTags);
					
					let saveMDFile = '';
					if(delTags.includes(THENFASTLOADPLUGINTAG.substring(1))){//插件/动态加载_快速
						saveMDFile = THENFASTLOADMDFILE;
					}else if(delTags.includes(THENSLOWLOADPLUGINTAG.substring(1))){//插件/动态加载_慢速
						saveMDFile = THENSLOWLOADMDFILE;
					}
					if(saveMDFile != ''){
						let originText = await readMDFile(saveMDFile);
						if(originText.includes(id)){
							//id在首行，中间行和尾行的替换逻辑
							const regex = new RegExp(`(?:(${id}\\s*\\n?)|(\\n${id}\\s*))`, "g");
							originText = originText.replace(regex, (match, p1, p2) => p1 ? "" : "\n");
							writeMDFile(saveMDFile, originText);
						}
					}

					idToColDict[id]["名称"] = rowObj["nameCell"].cellObj.textContent;//[强 列相关]
					idToColDict[id]["标签"] = rowObj["tagsCell"].cellObj.textContent;//[强 列相关]

					let output = dictToTableText(idToColDict);//将idToColDict转为表格文本
					writeMDFile(SAVETABLEPATH, output);
					delayRefresh(output, containerRef, showObsidian, setOnLoadPlugin);
				}else{
					//idToColDict[id]["名称"] = getManifestProp(manifestPathDictById[id],"name");//[强 列相关]，如果名称为空则默认值为Manifest的name字段
					new Notice("保存失败：名称不能为空");
				}
			}else{
				new Notice("保存失败：保存表格内不存在该插件");
			}
			
		});
		
		rowObj["operateCell"].cellObj.appendChild(saveBtn);
		
		//============打开文件夹按钮============
		const openDirBtn = document.createElement("button");
		//openDirBtn.textContent = "打开文件夹";
		openDirBtn.classList.add("openDirBtn");
		openDirBtn.style.display = 'inline-block';
		openDirBtn.style.position = 'relative'
		openDirBtn.style.top = '3px'
		openDirBtn.style.marginLeft = '5px'
		openDirBtn.setAttribute('aria-label', '打开文件夹');
		openDirBtn.innerHTML = '<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="svg-icon lucide-folder-open"><path d="m6 14 1.45-2.9A2 2 0 0 1 9.24 10H20a2 2 0 0 1 1.94 2.5l-1.55 6a2 2 0 0 1-1.94 1.5H4a2 2 0 0 1-2-2V5c0-1.1.9-2 2-2h3.93a2 2 0 0 1 1.66.9l.82 1.2a2 2 0 0 0 1.66.9H18a2 2 0 0 1 2 2v2"></path></svg>'
		openDirBtn.addEventListener("click", async () => {
			let filePath = path.dirname(manifestPathDictById[id]);
			openPathInExplorer(filePath);
		});
		rowObj["operateCell"].cellObj.appendChild(openDirBtn);


		//============设置按钮============
		let settingDiv = document.createElement("button");
		//settingDiv.className = "clickable-icon setting-editor-extra-setting-button"
		//settingDiv.style.padding = 'var(--size-2-2)';
		settingDiv.style.display = 'inline-block';
		settingDiv.style.position = 'relative'
		settingDiv.style.top = '3px'
		settingDiv.style.marginLeft = '5px'
		settingDiv.setAttribute('aria-label', '设置');

		settingDiv.innerHTML = '<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="svg-icon lucide-settings"><path d="M12.22 2h-.44a2 2 0 0 0-2 2v.18a2 2 0 0 1-1 1.73l-.43.25a2 2 0 0 1-2 0l-.15-.08a2 2 0 0 0-2.73.73l-.22.38a2 2 0 0 0 .73 2.73l.15.1a2 2 0 0 1 1 1.72v.51a2 2 0 0 1-1 1.74l-.15.09a2 2 0 0 0-.73 2.73l.22.38a2 2 0 0 0 2.73.73l.15-.08a2 2 0 0 1 2 0l.43.25a2 2 0 0 1 1 1.73V20a2 2 0 0 0 2 2h.44a2 2 0 0 0 2-2v-.18a2 2 0 0 1 1-1.73l.43-.25a2 2 0 0 1 2 0l.15.08a2 2 0 0 0 2.73-.73l.22-.39a2 2 0 0 0-.73-2.73l-.15-.08a2 2 0 0 1-1-1.74v-.5a2 2 0 0 1 1-1.74l.15-.09a2 2 0 0 0 .73-2.73l-.22-.38a2 2 0 0 0-2.73-.73l-.15.08a2 2 0 0 1-2 0l-.43-.25a2 2 0 0 1-1-1.73V4a2 2 0 0 0-2-2z"></path><circle cx="12" cy="12" r="3"></circle></svg>'
		
		settingDiv.addEventListener("click", async () => {
			//console.log(app.commands);
			app.commands.executeCommandById("app:open-settings");
			let pluginsPanel = document.querySelectorAll('.vertical-tab-header-group');	
			let pluginsSettingArray = pluginsPanel[2].querySelectorAll('.vertical-tab-nav-item');

			let nameToDomDict = [];

			pluginsSettingArray = Array.from(pluginsSettingArray).map(item => {
				nameToDomDict[item.innerText.trim()] = item;
				return item.innerText.trim();
			})

			let obj = { idToColDict:{} }
			getInfoFromTableText(originText,obj);
			let idToColDict = obj.idToColDict;
			//防止用户改了名称但是没有保存，于是从表格中取到的名称就是错误的


			let dom = nameToDomDict[ idToColDict[id]["名称"].trim() ];//通过抿成取出dom元素
			console.log(dom);
			if(dom != undefined){
				dom.dispatchEvent(new Event("click"));
			}else{

				//let pluginsSettingArray = pluginsPanel[0].querySelectorAll('.vertical-tab-nav-item');
				//let dom = pluginsSettingArray[pluginsSettingArray.length - 1]
				//dom.dispatchEvent(new Event("click"));//默认显示第三方插件
				document.querySelector('.modal-close-button').dispatchEvent(new Event("click"));

				new Notice("没有找到该插件的设置");
			}
		});
		rowObj["operateCell"].cellObj.appendChild(settingDiv)

		//卸载按钮
		const uninstallBtn = document.createElement("button");
		//uninstallBtn.textContent = "卸载";
		uninstallBtn.classList.add("openDirBtn");
		uninstallBtn.style.display = 'inline-block';
		uninstallBtn.style.position = 'relative'
		uninstallBtn.style.top = '3px'
		uninstallBtn.style.marginLeft = '5px'
		uninstallBtn.setAttribute('aria-label', '卸载');
		uninstallBtn.innerHTML = '<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="svg-icon lucide-x"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>'
		uninstallBtn.addEventListener("click", async () => {
			if(manifestPathDictById[id] == undefined){
				new Notice("欲删除的插件不存在");
				return;
			}
			
			let pluginDir = path.dirname(manifestPathDictById[id])
			const promptAnswer = await GenericYesNoPrompt.Prompt(app, "卸载插件", `您确定要卸载此插件吗？这将删除插件 ${path.basename(pluginDir)} 的文件夹。`);
			//console.log(promptAnswer);
			if(promptAnswer == true){
				console.log(pluginDir);
				//
				app.plugins.disablePlugin(id);
				if(deleteFolderRecursive(pluginDir)){
					new Notice(`插件 ${path.basename(pluginDir)} 删除成功`);
				}else{
					new Notice(`插件 ${path.basename(pluginDir)} 删除失败`);
				}
				//
				let tagCell = row.querySelector(".tagsCell")
				tagCell.textContent = tagCell.textContent.trim() + ' ' + PLUGINUNLOADEDTAG;
				row.querySelector(".saveBtn").dispatchEvent(new Event("click"));//保存表格按钮
			}
		});
		rowObj["operateCell"].cellObj.appendChild(uninstallBtn)



	}
	
	// 将表格添加到页面中
	containerRef.appendChild(table);
	
	function dictToTableText(idToColDict){//修改后的dict，转成表格格式的文本
		let finalText = genMDTableHeaderText(HEADERSOBJ);//[列相关]，表头
		for(let id in idToColDict){
			finalText = finalText + '| ' + id +' | ' + idToColDict[id]["名称"] + ' | ' + idToColDict[id]["标签"] + ' |\n';//[强 列相关]，按照idToColDict生成行
		}
		return finalText;
	}

	//恢复上次标签筛选
	if(g_lastFilterTags.length !== 0){
		tagsFilterProcess(g_lastFilterTags, g_lastTagFilterLogic);
	}

	//恢复上次排序
	if(restoreLastSort == true && g_lastSortOption.th){
		sortTable(g_lastSortOption.th, g_lastSortOption.sortOrder);
	}

	// 表格排序
	function sortTable(th, sortOrder) {
		let colIndex = th.cellIndex;

		const tableBody = table.tBodies[0];
		const rows = Array.from(tableBody.rows);
		const comparator = (a, b) => {
			if(a.cells[colIndex].type == "normalText" && b.cells[colIndex].type == "normalText"){
				const aText = a.cells[colIndex].textContent;
				const bText = b.cells[colIndex].textContent;
				return aText.localeCompare(bText);
			}else if(a.cells[colIndex].type == "toggle" && b.cells[colIndex].type == "toggle"){
				const aChecked = a.cells[colIndex].querySelector('my-custom-toggle').checked;
				const bChecked = b.cells[colIndex].querySelector('my-custom-toggle').checked;
				return aChecked === bChecked ? 0 : (aChecked ? 1 : -1);
			}
		};
	  	// 切换排序方向
		if(sortOrder == undefined){
			sortOrder = tableBody.getAttribute("data-sort-order") === "asc" ? "desc" : "asc";
			
			//保存本次排序的列和方向
			g_lastSortOption.th = th;
			g_lastSortOption.sortOrder = sortOrder;
		}else{//传入sortOrder就不改变上次的值
			//sortOrder = sortOrder === "asc" ? "desc" : "asc";
			//lastSortOption.sortOrder = sortOrder;
		}
		tableBody.setAttribute("data-sort-order", sortOrder);

		
		//清除其他列的箭头
		const ths = table.querySelectorAll("th");
		Array.from(ths).forEach((otherTh) => { if (otherTh !== th) { otherTh.textContent = otherTh.textContent.replace("⬆", "").replace("⬇", ""); } });
		
		th.textContent = `${th.textContent.replace("⬆","").replace("⬇","")} ${sortOrder === "asc" ? "⬆" : "⬇"}`;

		// 排序行
		rows.sort(comparator);
		if (sortOrder === "desc") {
		  rows.reverse();
		}
		// 重新插入排序后的行
		tableBody.innerHTML = "";
		rows.forEach((row) => {
			tableBody.appendChild(row);
		});
	}
	
	// 双击单元格时将其设置为可编辑状态
	table.addEventListener("click", (event) => {
		const cell = event.target.closest("td[contenteditable='true']");
		if(cell){
			cell.setAttribute("contenteditable", "true");
			cell.focus();
		}
	});
	
	// 在单元格失去焦点时将其设置为只读状态
	table.addEventListener("blur", (event) => {
		const cell = event.target.closest("td[contenteditable='true']");
		if(cell){
		  cell.removeAttribute("contenteditable");
		}
  	});
    

    table.addEventListener('input', (event) => {
	    const cell = event.target.closest("td[contenteditable='true']");
	    if (cell) {
	    	if(Array.from(cell.classList).includes('tagsCell')){
	    		if(cell.textContent.trim().length == 1 && cell.textContent.trim().slice(0, 1) == '#' || cell.textContent.slice(-1) == "#" && cell.textContent.slice(-2, -1) == ' '){
					let suggestPanel = document.getElementById("suggestPanel");
					if(suggestPanel){ suggestPanel.parentNode.removeChild(suggestPanel); }//删除上次生成的提示框
					
					let tagsContentArrayNoRepeat = getSplitCellContentInCol('.tagsCell','#');
					tagsContentArrayNoRepeat.unshift(THENSLOWLOADPLUGINTAG.substring(1));
					tagsContentArrayNoRepeat.unshift(THENFASTLOADPLUGINTAG.substring(1));
					//tagsContentArrayNoRepeat.unshift(ONLOADPLUGINTAG.substring(1));
					tagsContentArrayNoRepeat = [...new Set(tagsContentArrayNoRepeat)];
					tagsContentArrayNoRepeat = tagsContentArrayNoRepeat.filter(item => item !== ONLOADPLUGINTAG.substring(1));
					
					suggestPanel = createSuggestPanel(document.body, tagsContentArrayNoRepeat, async (clickText) => { 
						cell.textContent = cell.textContent.trim() + clickText// + ' #';
						//cell.focus();
						//console.log(clickText);
						let suggestPanel = document.getElementById("suggestPanel");
						if(suggestPanel){ suggestPanel.parentNode.removeChild(suggestPanel); }//删除上次生成的提示框
						
						let lineId = cell.parentNode.querySelector(".idCell").textContent;
						cell.parentNode.querySelector(".saveBtn").dispatchEvent(new Event("click"));//保存表格按钮

						if(clickText.includes(THENFASTLOADPLUGINTAG.substring(1)) || clickText.includes(THENSLOWLOADPLUGINTAG.substring(1))){
							let saveMDFile = '';
							if(cell.textContent.includes(THENFASTLOADPLUGINTAG)){//插件/动态加载_快速
								saveMDFile = THENFASTLOADMDFILE;
							}else if(cell.textContent.includes(THENSLOWLOADPLUGINTAG)){//插件/动态加载_慢速
								saveMDFile = THENSLOWLOADMDFILE;
							}
							let originText = await readMDFile(saveMDFile);
							if(!originText.includes(lineId)){
								originText = originText + '\n' + lineId;
								writeMDFile(saveMDFile, originText);
							}else{
								new Notice("md文件写入失败：已存在该插件");
							}
						}
					})
					suggestPanel.id = 'suggestPanel';


					//获取鼠标指针的位置
					const selection = window.getSelection();
					let cursorPosition = 0;
					if (selection.rangeCount > 0) {
						var range = selection.getRangeAt(0);
						cursorPosition = range.getBoundingClientRect();
					} else {
						cursorPosition = selection.focusNode.getBoundingClientRect();
					}

					suggestPanel.style.left = (cursorPosition.left + 2) + "px";
					suggestPanel.style.top = (cursorPosition.top + 20) + "px";
	    		}else{
					let suggestPanel = document.getElementById("suggestPanel");
					if(suggestPanel){ suggestPanel.parentNode.removeChild(suggestPanel); }//删除上次生成的提示框
				}
		    }
	    }
    });


}

this.container.addEventListener('click', (event) => {
  	let dropdownPanel = document.getElementById("tagDropdownPanel");
	if(dropdownPanel){ dropdownPanel.parentNode.removeChild(dropdownPanel); }//删除生成的标签筛选下拉框

	let suggestPanel = document.getElementById("suggestPanel");
	if(suggestPanel){ suggestPanel.parentNode.removeChild(suggestPanel); }//删除上次生成的提示框
});

const viewContent = document.querySelector(".view-content");
viewContent.addEventListener("click", (event) => {
  	let dropdownPanel = document.getElementById("tagDropdownPanel");
	if(dropdownPanel){ dropdownPanel.parentNode.removeChild(dropdownPanel); }//删除生成的标签筛选下拉框

	let suggestPanel = document.getElementById("suggestPanel");
	if(suggestPanel){ suggestPanel.parentNode.removeChild(suggestPanel); }//删除上次生成的提示框
});

this.container.addEventListener("keydown", function(event) { 
	if (event.key === "Escape") {
		let suggestPanel = document.getElementById("suggestPanel");
		if(suggestPanel){ suggestPanel.parentNode.removeChild(suggestPanel); }//删除上次生成的提示框 
	}
});




//=====================其他功能函数=====================

function getInfoFromTableText(originText,outObj){
	let idArr = [];//表格内存在的id
	let idToColDict = {};//id到其他列内容的字典
	
	let lineArr = originText.split('\n');
	lineArr.splice(0, 2);//删除数组的前两个，在表格中对应表头
	
	//取出表格内存在的id
	for(let i=0;i < lineArr.length;i++){
		let cellArr = lineArr[i].split('|').filter(cell => cell != '');//不为空的格，对应的是具体列中的内容
		let tableHeaderTextArray = getMDTableHeaderArray(HEADERSOBJ);
		if(cellArr.length == tableHeaderTextArray.length){//行单元格数是否等于显示表头的列数
			let idIndex = tableHeaderTextArray.indexOf('id');//[列相关]，id为第几列，参数值要为HEADERSOBJ中的text值
			let id = cellArr[idIndex].trim();
			if(id != ''){
				idArr.push(id);
				//idDict[id] = [cellArr[1], cellArr[2]];
				//idToColDict[id] = [
				//cellArr[tableHeaderTextArray.indexOf('名称')],
				//cellArr[tableHeaderTextArray.indexOf('标签')]];//[强 列相关]
				
				idToColDict[id] = {
					"名称": cellArr[tableHeaderTextArray.indexOf('名称')],
					"标签": cellArr[tableHeaderTextArray.indexOf('标签')]
				}
			}
		}
	}
	outObj.idArr = idArr
	outObj.idToColDict = idToColDict
}

function delayRefresh(originText,containerRef,showObsidian,setOnLoadPlugin){//延迟刷新
	setTimeout(function() {
		if(!fs.existsSync(app.vault.adapter.basePath + "\\" + SAVETABLEPATH.replace("/","\\"))){return}
		refreshShowTable(originText, containerRef, showObsidian, setOnLoadPlugin);
	}, 500);
}



//=====================生成表格文本=====================
//将原表格中不存在的插件id增加到末尾，不会删除原表格中存在但是未安装的插件id
async function generateTableText(originText){
	const pluginArr = getInstallPluginIdArray();
	
	let obj = { idArr:[] }
	getInfoFromTableText(originText,obj)
	let idArr = obj.idArr;//表格内存在的id
	
	//取出pluginArr特有的id，但不会删除idArr中有但是pluginArr中没有的
	idArr = idArr.filter(item => pluginArr.includes(item));//取出共有的id
	idArr = pluginArr.filter(item => !idArr.includes(item))//删除掉共有的id
	
	let sourceText = delLastEmptyLines(originText);
	sourceText = sourceText.join('\n');
	
	//生成表格文本
	const defaultEnable = getOnLoadPluginIdArray();//Array.from(app.plugins.enabledPlugins); 默认加载的插件
	let fastOnload = await readMDFile(THENFASTLOADMDFILE);
	let slowOnload = await readMDFile(THENSLOWLOADMDFILE);
	
	
	let output = '\n';
	for(let i=0;i < idArr.length;i++){
		let defaultTag = defaultEnable.includes(idArr[i]) ? ONLOADPLUGINTAG : ' ';
		let fastTag = fastOnload.includes(idArr[i]) ? THENFASTLOADPLUGINTAG : '';
		let slowTag = slowOnload.includes(idArr[i]) ? THENSLOWLOADPLUGINTAG : '';
		output = output + '|' + idArr[i] + '|' + getManifestProp(manifestPathDictById[idArr[i]],"name").trim() +
		'| ' + defaultTag + ' ' + fastTag + ' ' + slowTag + ' |\n';
		//[强 列相关]，生成的新行格式
	}
	//拼接源文本和生成表格文本形成最后写入的文本
	output = sourceText + output;
	
	return output;
}


//=====================增量生成插件id并写入文件=====================
createButton(this.container,"增量更新插件并写入文件", async() => {
	let output = '';
	if(!fs.existsSync(app.vault.adapter.basePath + "\\" + SAVETABLEPATH.replace("/","\\"))){
		let originText = genMDTableHeaderText(HEADERSOBJ);
		await app.vault.create(SAVETABLEPATH, originText)
		.then(async () => {
			output = await generateTableText(originText);
		}).catch((error) => {
		    new Notice(`创建文件失败：${error}`);
		    return;
	    });
	}else{
		let originText = await readMDFile(SAVETABLEPATH);
		output = await generateTableText(originText);
	}

	writeMDFile(SAVETABLEPATH,output);
	delayRefresh(output, this.container, showObsidian.checked, setOnLoadPlugin.checked);
})

//=====================刷新显示列表=====================
const refeshBtn = createButton(this.container,"刷新显示列表", async() => {
	if(!fs.existsSync(app.vault.adapter.basePath + "\\" + SAVETABLEPATH.replace("/","\\"))){return}
	let originText = await readMDFile(SAVETABLEPATH);
	refreshShowTable(originText, this.container, showObsidian.checked, setOnLoadPlugin.checked);//checkbox实际上是下面才定义的
})
refeshBtn.dispatchEvent(new Event("click"));//打开时触发一下刷新事件

//=====================显示obsidian前后缀=====================

const { checkbox: showObsidian } = createCheckBoxPanel(this.container,"显示obsidian前后缀",true, null,async () => {
	if(!fs.existsSync(app.vault.adapter.basePath + "\\" + SAVETABLEPATH.replace("/","\\"))){return}
	let originText = await readMDFile(SAVETABLEPATH);
	refreshShowTable(originText, this.container, showObsidian.checked, setOnLoadPlugin.checked, true);
});

//=====================设置启动加载插件=====================
const { checkbox: setOnLoadPlugin } = createCheckBoxPanel(this.container,"设置启动时加载插件",true, null,async () => {
	if(!fs.existsSync(app.vault.adapter.basePath + "\\" + SAVETABLEPATH.replace("/","\\"))){return}
	let originText = await readMDFile(SAVETABLEPATH);
	refreshShowTable(originText, this.container, showObsidian.checked, setOnLoadPlugin.checked, true);
});

```

