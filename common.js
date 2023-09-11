
const fs_ = require("fs");
const path_ = require("path");

//=====================定义toggle组件=====================
if(customElements.get('my-custom-toggle') == undefined){
	class Toggle extends HTMLElement {
	constructor() {
	  super();
	  this._checked = false;
	  this.attachShadow({ mode: "open" });
	  this.shadowRoot.innerHTML = `
		<style>
		  :host {
			display: inline-block;
			width: 40px;
			height: 20px;
			border-radius: 10px;
			background-color: grey;
			position: relative;
			cursor: pointer;
		  }
		  :host([checked]) {
			background-color: green;
		  }
		  #knob {
			position: absolute;
			top: 2px;
			left: 2px;
			width: 16px;
			height: 16px;
			border-radius: 50%;
			background-color: white;
			transition: transform 0.2s ease-in-out;
		  }
		  :host([checked]) #knob {
			transform: translateX(20px);
		  }
		</style>
		<div id="knob"></div>
	  `;
	  this.addEventListener("click", this._onClick.bind(this));
	}
  
	get checked() {
	  return this._checked;
	}
  
	set checked(value) {
	  this._checked = Boolean(value);
	  if (this._checked) {
		this.setAttribute("checked", "");
	  } else {
		this.removeAttribute("checked");
	  }
	}
  
	_onClick() {
	  this.checked = !this.checked;
	  this.dispatchEvent(new Event("change"));
	}
  }
	
	customElements.define('my-custom-toggle', Toggle);
}




function defineColFilterStyle(container){//行筛选器样式
	let lastdropdownStyle = document.getElementById("colFilterStyle");
	if(lastdropdownStyle){ lastdropdownStyle.parentNode.removeChild(lastdropdownStyle); }

	const colFilterStyle = document.createElement('style');
	colFilterStyle.id = "colFilterStyle";
	colFilterStyle.textContent = `
		.dropdown-panel {
			position: absolute;

			/*
			top: 50%;
			left: 50%;*/
			transform: translate(-50%, -50%);
			z-index: 999;
			background-color: #fff;
			border: 1px solid #ccc;
			box-shadow: 0 2px 4px rgba(0, 0, 0, 0.2);
			padding: 10px;
			max-height: 200px;
			overflow-y: auto;
		}

		.dropdown-panel label {
			display: block;
			margin-bottom: 5px;
		}

		.dropdown-panel input[type="checkbox"] {
			margin-right: 5px;
		}

		.dropdown-panel button {
			display: block;
			margin-top: 10px;
			padding: 5px 10px;
			background-color: #007bff;
			color: #fff;
			border: none;
			border-radius: 3px;
			cursor: pointer;
		}

		.dropdown-panel button:hover {
			background-color: #0069d9;
		}
		`;
	container.appendChild(colFilterStyle);
}


function defineOtherStyle(container){//其他样式
	let lastOtherStyle = document.getElementById("otherStyle");
	if(lastOtherStyle){ lastOtherStyle.parentNode.removeChild(lastOtherStyle); }

	const otherStyle = document.createElement('style');
	otherStyle.id = "otherStyle";
	otherStyle.textContent = `
	.yesNoPromptButtonContainer {
		display: flex;
		align-items: center;
		justify-content: space-around;
		margin-top: 2rem;
	}
		`;
	container.appendChild(otherStyle);
}





function openPathInExplorer(path){//在任务管理器中打开文件夹
	const { exec } = require('child_process');

	if (process.platform === 'win32') {
		//Windows 系统
		exec(`start "" "${path}"`, (error, stdout, stderr) => {
			if (error) {
				console.error(`exec error: ${error}`);
				return;
			}
			//console.log(`stdout: ${stdout}`);
			//console.error(`stderr: ${stderr}`);
		});
	}else{
		// macOS 和 Linux 系统
		exec(`open "${path}"`, (error, stdout, stderr) => {
			if (error) {
				console.error(`exec error: ${error}`);
				return;
			}
			//console.log(`stdout: ${stdout}`);
			//console.error(`stderr: ${stderr}`);
		});
	}
	//const { shell } = require('electron');  
	//shell.openPath(path.dirname(manifestPathDictById[id]));
}



//=====================插件相关=====================
function getPluginRootDir(){//取插件根目录
	return app.vault.adapter.basePath + '\\' + app.plugins.getPluginFolder().replace('/','\\'); 
}

function getOnLoadPluginConfigPath(){//获取启动时加载插件的保存json路径
	return app.vault.adapter.basePath + "\\" + app.vault.configDir + "\\community-plugins.json";
}

function getOnLoadPluginIdArray(){//获取启动时加载的插件ID数组
	const jsonPath = getOnLoadPluginConfigPath();
	const jsonContent = fs_.readFileSync(jsonPath, 'utf-8');
	let pluginArray = JSON.parse(jsonContent);
	return pluginArray;
}

function getInstallPluginIdArray(){//获取全部安装的插件id数组
	return Object.values(app.plugins.manifests).map(p=>p.id).sort((a,b)=>a.localeCompare(b));
}



//=====================Manifest文件操作相关=====================
function getManifestProp(manifestPath,key){//获取Manifest的某个字段值
	const manifestString = fs_.readFileSync(manifestPath, 'utf-8');
	let jsonData = JSON.parse(manifestString);  
	return jsonData[key];
}

function setManifestProp(manifestPath,key,value){//设置Manifest的某个字段值
	const manifestString = fs_.readFileSync(manifestPath, 'utf-8');
	let jsonData = JSON.parse(manifestString);  
	jsonData[key] = value;  
	let jsonStr = JSON.stringify(jsonData,null,4);
	
	//写入manifestPath文件  
	fs_.writeFile(manifestPath, jsonStr, err => {  
	   if (err) { new Notice('manifest修改失败：' + err); return; }  
	   new Notice('manifest修改成功');
	});
}

function createIdToManifestPathDict(){//生成id对应插件的manifest目录
	let dict = {};

	const pluginBaseDir = getPluginRootDir();
	fs_.readdirSync(pluginBaseDir).forEach(pluginName => {
		const pluginPath = path_.join(pluginBaseDir, pluginName);
		const manifestPath = path_.join(pluginBaseDir, pluginName, 'manifest.json');
		if(fs_.statSync(pluginPath).isDirectory()){//是否为目录
			try{
				const manifestContent = fs_.readFileSync(manifestPath, 'utf-8');
				const manifestData = JSON.parse(manifestContent);
				if(manifestData.id != ''){
					dict[manifestData.id] = manifestPath;
				}
			}catch (err){}
		}
	});
	return dict;
}


//=====================MarkDown读写=====================
async function writeMDFile(path, data) {//写入markdown文件，覆盖
	const file = app.vault.getAbstractFileByPath(path);
	await app.vault.modify(file, data)
	.then(() => {
	    new Notice('md文件写入成功');
    }).catch((err) => {
	    new Notice('md文件写入失败：' + err);
    });
}

async function readMDFile(path){//读取markdown文件
	//let originText = await dv.io.load(SAVETABLEPATH);

	const file = app.vault.getAbstractFileByPath(path);
	let MDText = await app.vault.read(file);
	return MDText;
}


function deleteFolderRecursive(folderPath) {//递归删除文件夹
  if (fs_.existsSync(folderPath)) {
    fs_.readdirSync(folderPath).forEach((file, index) => {
      const curPath = path_.join(folderPath, file);
      if (fs_.lstatSync(curPath).isDirectory()) { // 递归删除子目录
        deleteFolderRecursive(curPath);
      } else { // 删除文件
        fs_.unlinkSync(curPath);
      }
    });
    fs_.rmdirSync(folderPath); // 删除空目录
	return !fs_.existsSync(folderPath)
  }else{
	  return false;
  }
}






//=====================文本操作=====================
function delLastEmptyLines(operateText){//删除文本末尾的空行
	let LinesArray = operateText.split('\n');//行数组
	for(let i=LinesArray.length - 1;i > 0;i--){
		if(LinesArray[i].trim().length == 0){
			LinesArray.pop();
		}
	}
	
	return LinesArray;
}



//=====================表格操作相关=====================
function genMDTableHeaderText(headersObj){//生成md表头文本，排除不参与生成的
	//"| id  | 名称 | 标签 |\n| --- | ------ | ---- |\n";//[列相关]，表头
	const filteredHeaders = headersObj.filter((header) => !header.generateTableExcept);
	let firstLine = '|' + filteredHeaders.map(item => item.text).join('|')+ '|\n';
	let secondLine = '|' + filteredHeaders.map(item => '---').join('|')+ '|\n';
	
	return firstLine + secondLine;
}

function getMDTableHeaderArray(headersObj){//获取不排除的表头文本数组
	const headerTextArray = headersObj.filter((header) => !header.generateTableExcept).map(item => item.text);
	return headerTextArray;
}

function getSplitCellContentInCol(cellCls,splitText){//获取列单元格中分割的不重复的文本

	let cellObj = document.querySelectorAll(cellCls);
	const contentSet = new Set();
	for (let item of cellObj) {
		//console.log(item);
		let text = item.textContent.trim();
		if(text != ''){
			text.split(splitText).filter(item => item.trim() != '').map(item => item.trim()).forEach((element) => {contentSet.add(element)})//取出不重复的文本
		}
	}
	return Array.from(contentSet).sort();
}




//=====================控件生成封装=====================
function createButton(container, title, clickEvent) {
	const button = document.createElement("button");
	button.textContent = title;
	button.style.marginLeft = "5px";
	button.style.display = "inline-block";
	button.addEventListener("click", () => {
		clickEvent();
	});
	container.appendChild(button);
	return button;
}



function createCheckBoxPanel(container, title, checked, value,changeEvent){
	const checkbox = document.createElement("input");//checkbox
	checkbox.type = "checkbox";
	checkbox.style.display = "inline-block";
	checkbox.style.verticalAlign = "middle";
	checkbox.style.marginLeft = "10px";
	checkbox.checked = checked ?? false;
	checkbox.setAttribute("checked", checked ? checked.toString() : false);
	if(!value || value!= ''){checkbox.value = value;}

	checkbox.addEventListener("change", () => {
		if (checkbox.checked) {
			checkbox.setAttribute("checked", "true");
		} else {
			checkbox.setAttribute("checked", "false");
			//checkbox.removeAttribute("checked");
		}



		if(!changeEvent || changeEvent!= ''){
			if (typeof changeEvent === 'function') {
				changeEvent();
			}
		}
	});
	
	const label = document.createElement("span");
	label.style.marginLeft = "1px";
	label.innerText = title;
	label.style.cursor = "pointer";
	label.style.userSelect = "none";
	label.addEventListener("click", function() {
		checkbox.checked = !checkbox.checked;
		checkbox.dispatchEvent(new Event("change"));
	});
	

	//label.insertBefore(checkbox, label.firstChild);
	//container.appendChild(label);

	const Panel = document.createElement("div");
	Panel.style.display = "inline-block"
	Panel.appendChild(checkbox);
	Panel.appendChild(label);
	container.appendChild(Panel);
	return { checkbox, label };
}


function createSuggestPanel(container,textArray,clickEvent){
	let suggestionPanel = document.createElement("div");
	suggestionPanel.className = "suggestion-container";

	/*
	suggestionPanel.style.position = 'absolute';
	suggestionPanel.style.maxWidth = '500px';
	suggestionPanel.style.setProperty("background-color", "var(--background-primary)");
	suggestionPanel.style.setProperty("border-radius","var(--radius-m)");
	suggestionPanel.style.setProperty("border","1px solid var(--background-modifier-border)");
	suggestionPanel.style.setProperty("box-shadow","var(--shadow-s)");
	//suggestionPanel.style.setProperty("opacity","0.8");
	suggestionPanel.style.setProperty("z-index","var(--layer-notice)");
	*/

	let suggestion = document.createElement("div");
	suggestion.className = "suggestion";
	textArray.forEach(text =>{
		var suggestionItem = document.createElement("div");
		suggestionItem.className = "suggestion-item";//is-selected
		suggestionItem.textContent = text;
		suggestionItem.addEventListener("mouseover", function() {
			this.classList.add("is-selected");
		});
		suggestionItem.addEventListener("mouseout", function() {
			this.classList.remove("is-selected");
		});
		suggestionItem.addEventListener("click", () => {
			clickEvent(text);
		});
		suggestion.appendChild(suggestionItem);
	})

	suggestionPanel.appendChild(suggestion);
	container.appendChild(suggestionPanel);
	return suggestionPanel;
}



