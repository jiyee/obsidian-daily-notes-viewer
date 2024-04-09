import { App, TFile } from "obsidian";
import { getDailyNoteSettings, getAllDailyNotes, getDateUID } from "obsidian-daily-notes-interface";
import moment from "moment";
import { ViewerSettings } from "./settings";

export const createOrUpdateViewer = async (
	app: App,
	settings: ViewerSettings
): Promise<void> => {
	// 获取 daily notes 的 basename
	let allDailyNotesBasename: string[];
	if (settings.Filter === "recent") {
		allDailyNotesBasename = getRecent(settings);
	} else if (settings.Filter === "range") {
		allDailyNotesBasename = getRange(settings);
	}

	// 将 basename 转成链接
	let links: string[] = [];
	for (let dailyNote of allDailyNotesBasename) {
		if (settings.IgnoreEmptyHeading) { // 过滤指定标题后的内容为空的 Daily Note
			const folder = getDailyNoteSettings().folder
			let file = app.vault.getAbstractFileByPath(`${folder}/${dailyNote}.md`) as TFile
			let content = await app.vault.cachedRead(file)
			let headingNotEmptyRegExp = new RegExp(`(?<=(^#+)\\s+)${settings.Heading}\n*[^\n]+\n*(?=(\n^#+))`, 'gm')
			if (!headingNotEmptyRegExp.test(content)) {
				continue
			}
		}

		let linkText: string;
		linkText =
			settings.Heading?.length > 0
				? `${dailyNote}` + "#^" + settings.Heading
				: `${dailyNote}`; // 显示全部内容或指定标题后的内容
		links.push(`![[${linkText}]]`);
	}

	let fileText: string = "";
	let spacing = settings.Spacing;
	for (let link of links) {
		fileText += `${link}\n`;

		// 设定插入间隔
		for (let i = 0; i < spacing; i++) {
			fileText += `\n`;
		}
	}

	// 设置开头的内容
	let beginning = settings.Beginning;

	// 检测 Viewer 文件是否存在，创建 Viewer 文件或更新 Viewer 内容
	let pathRegex = /^\s*$/;
	let path = getViewerPath(settings);
	let filename = settings.Filename;
	let file = app.vault.getAbstractFileByPath(path) as TFile;
	if (!pathRegex.test(filename)) {
		let contentNew = `${beginning}\n${fileText}`;
		if (file === null) {
			await app.vault.create(path, contentNew);
			return;
		} else {
			let contentOld = await app.vault.cachedRead(file);
			if (contentNew !== contentOld) {
				await app.vault.modify(file, contentNew);
			}
			return;
		}
	}
};

const getRecent = (settings: ViewerSettings) => {
	// 获取 today note 的 UID
	let now = moment();
	let today = getDateUID(now, "day");

	// 获取 daily notes 的 basename
	let allDailyNotes = getAllDailyNotes();
	let allDailyNotesUID = Object.keys(allDailyNotes).sort().reverse();
	let allDailyNotesRecent: any = {};
	if (settings.Future) {
		for (let i = 0; i < allDailyNotesUID.length; i++) {
			allDailyNotesRecent[allDailyNotesUID[i]] =
				allDailyNotes[allDailyNotesUID[i]];
		}
	} else {
		for (let i = 0; i < allDailyNotesUID.length; i++) {
			if (allDailyNotesUID[i] <= today) {
				allDailyNotesRecent[allDailyNotesUID[i]] =
					allDailyNotes[allDailyNotesUID[i]];
			}
		}
	}
	let allDailyNotesBasename: string[] = [];
	for (let [string, TFile] of Object.entries(allDailyNotesRecent)) {
		allDailyNotesBasename.push(TFile.basename);
	}
	allDailyNotesBasename = allDailyNotesBasename.slice(0, settings.Quantity);
	return allDailyNotesBasename;
};

const getRange = (settings: ViewerSettings) => {
	// 获取 Range 的 UID
	let startDate = moment(settings.Start);
	let endDate = moment(settings.End);
	let startDateUID = getDateUID(startDate, "day");
	let endDateUID = getDateUID(endDate, "day");

	// 获取 daily notes 的 basename
	let allDailyNotes = getAllDailyNotes();
	let allDailyNotesUID = Object.keys(allDailyNotes).sort();
	let allDailyNotesRange: any = {};
	let dateRegex = /^\d{4}\-\d{2}\-\d{2}$/;
	if (dateRegex.test(settings.Start) && dateRegex.test(settings.End)) {
		for (let i = 0; i < allDailyNotesUID.length; i++) {
			if (
				allDailyNotesUID[i] >= startDateUID &&
				allDailyNotesUID[i] <= endDateUID
			) {
				allDailyNotesRange[allDailyNotesUID[i]] =
					allDailyNotes[allDailyNotesUID[i]];
			}
		}
	}
	let allDailyNotesBasename: string[] = [];
	for (let [string, TFile] of Object.entries(allDailyNotesRange)) {
		allDailyNotesBasename.push(TFile.basename);
	}
	return allDailyNotesBasename;
};

export const getViewerPath = (settings: ViewerSettings) => {
	let filename = settings.Filename;
	let folder = settings.Folder;
	let pathRegex = /^\s*$/;
	let path;

	if (pathRegex.test(folder)) {
		path = `${filename}.md`;
	} else {
		path = `${folder}/${filename}.md`;
	}
	return path;
};
