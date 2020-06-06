//DESCRIPTION:The script creates InDesign hyperlinks from URLs and e-mail addresses.
//SCRIPTMENU:Create Hyperlinks
//This script is licensed under the GNU General Public License v3.0 https://www.gnu.org/licenses/gpl-3.0.txt
//Project: https://github.com/grefel/clearOverrides
//Contact: Gregor Fellenz - http://www.publishingx.de


var px = {
	projectName: "createHyperlinks_v2.3.jsx",
	version: "2019-08-13-v2.3",

	showSummary: true,

	// Verwaltung
	runWithUndo: true,
	showGUI: true,
	appendLog: true,
	debug: false
}

if (app.extractLabel("px:debugID") == "Jp07qcLlW3aDHuCoNpBK_Gregor-") {
	px.debug = true;
	px.showGUI = true;

}

/****************
* Logging Class 
* @Version: 1.18
* @Date: 2020-05-20
* @Author: Gregor Fellenz, http://www.publishingx.de
* Acknowledgments: Library design pattern from Marc Aturet https://forums.adobe.com/thread/1111415

* Usage: 

log = idsLog.getLogger("~/Desktop/testLog.txt", "INFO");
log.warnAlert("Warn message");

*/
$.global.hasOwnProperty('idsLog') || (function (HOST, SELF) {
	HOST[SELF] = SELF;

	/****************
	* PRIVATE
	*/
	var INNER = {};
	INNER.disableAlerts = false;
	INNER.logLevel = 0;
	INNER.SEVERITY = [];
	INNER.SEVERITY["OFF"] = 4;
	INNER.SEVERITY["ERROR"] = 3;
	INNER.SEVERITY["WARN"] = 2;
	INNER.SEVERITY["INFO"] = 1;
	INNER.SEVERITY["DEBUG"] = 0;

	INNER.processMsg = function (msg, object) {
		if (msg == undefined) {
			msg = ""; // return ?
		}
		if ((msg instanceof Error)) {
			msg = msg + " Line: " + msg.line + " # " + msg.number + " File: " + msg.fileName;
		}
		if (msg.constructor.name != "String") {
			msg = msg.toString();
		}

		if (object != undefined) {
			msg += " " + localize({ en: "Object is located at", de: "Objekt befindet sich auf" }) + " [" + INNER.getPageNameFromObject(object) + "]";
		}
		return msg;
	}

	INNER.getPageNameFromObject = function (object) {
		var pagePositionMessage = "";
		if (object != null) {
			object = object.getElements()[0]; // Get Object from Superclass like PageItem
			if (object.hasOwnProperty("sourceText")) {
				object = object.sourceText;
			}
			// Text
			if (object.hasOwnProperty("baseline")) {
				if (object.parentTextFrames.length == 0) {
					if (object.parent.constructor.name == "XmlStory") {
						return localize({ en: "XML Content", de: "In der XML Struktur" });
					}
					else {
						object = object.parent.parentStory.textContainers[object.parentStory.textContainers.length - 1];
						pagePositionMessage += localize({ en: "Overset text. Position of the last text frame: ", de: "Im Übersatz. Position des letzten Textrahmens: " });
					}
				}
				else {
					object = object.parentTextFrames[0];
				}
			}
			// Anchored Object
			if (object.parent.constructor.name == "Character") {
				if (object.parent.parentTextFrames.length == 0) {
					object = object.parentStory.textContainers[object.parentStory.textContainers.length - 1];
					pagePositionMessage += localize({ en: "Overset text. Position of the last text frame: ", de: "Im Übersatz. Position des letzten Textrahmens: " });
				}
				else {
					object = object.parent.parentTextFrames[0];
				}
			}


			while (object != null) {
				if (object.hasOwnProperty("parentPage")) {
					if (object.parentPage == null && object.parent instanceof Spread) {
						pagePositionMessage += localize({ en: "Spread ", de: "Druckbogen " });
						return pagePositionMessage + (object.parent.index + 1);
					}
					else if (object.parentPage == null) {
						object = object.parent;
						continue;
					}
					else {
						return localize({ en: "Page ", de: "Seite " }) + object.parentPage.name;
					}
				}
				var whatIsIt = object.constructor;
				switch (whatIsIt) {
					case Page: return pagePositionMessage + localize({ en: "Page ", de: "Seite " }) + object.name;
					case Character: object = object.parentTextFrames[0]; break;
					case Footnote: ; // drop through
					case Cell: object = object.insertionPoints[0].parentTextFrames[0]; break;
					case Note: object = object.storyOffset.parentTextFrames[0]; break;
					case XMLElement:
						if (object.pageItems.length > 0) {
							object = object.pageItems[0];
						}
						else if (object.insertionPoints[0] != null) {
							if (object.insertionPoints[0].parentTextFrames.length > 0) {
								object = object.insertionPoints[0].parentTextFrames[0];
							}
							else {
								return pagePositionMessage + localize({ en: "Could not detect page", de: "Konnte Seite nicht ermitteln" });
							}
						}
						break;
					case Application: return pagePositionMessage + localize({ en: "Could not detect page Application", de: "Konnte Seite nicht ermitteln Application" });
					default: object = object.parent;
				}
				if (object == null) return pagePositionMessage + localize({ en: "Could not detect page null", de: "Konnte Seite nicht ermitteln null" });
			}
			return pagePositionMessage + object;
		}
		else {
			return pagePositionMessage + localize({ en: "Could not detect page", de: "Konnte Seite nicht ermitteln" });
		}
	}


	INNER.writeLog = function (msg, severity, file) {
		var date = new Date();
		var month = date.getMonth() + 1;
		var day = date.getDate();
		var hour = date.getHours();
		var minute = date.getMinutes();
		var second = date.getSeconds();
		var dateString = (date.getYear() + 1900) + "-" + ((month < 10) ? "0" : "") + month + "-" + ((day < 10) ? "0" : "") + day + " " + ((hour < 10) ? "0" : "") + hour + ":" + ((minute < 10) ? "0" : "") + minute + ":" + ((second < 10) ? "0" : "") + second;
		var padString = (severity.length == 4) ? " " : ""
		msg = msg.replace(/\r|\n/g, '<br/>');
		file.encoding = "UTF-8";
		file.open("a");
		if (INNER.logLevel == 0) {
			var stack = $.stack.split("\n");
			stack = stack[stack.length - 4];
			file.writeln(dateString + " [" + severity + "] " + padString + "[" + msg + "] Function: " + stack.substr(0, 100));
		} else {
			file.writeln(dateString + " [" + severity + "] " + padString + "[" + msg + "]");
		}
		file.close();
	};
	INNER.showAlert = function (title, msg, type) {
		if (!INNER.disableAlerts) {
			if (msg.length < 300) {
				alert(msg, title)
			}
			else {
				INNER.showMessages(title, [msg], type);
			}
		}
	};
	INNER.showMessages = function (title, msgArray, type) {
		if (!INNER.disableAlerts && msgArray.length > 0) {
			var callingScriptVersion = "    ";
			if ($.global.hasOwnProperty("px") && $.global.px.hasOwnProperty("projectName")) {
				callingScriptVersion += px.projectName;
			}
			if ($.global.hasOwnProperty("px") && $.global.px.hasOwnProperty("version")) {
				callingScriptVersion += " v" + px.version;
			}
			for (var i = 0; i < msgArray.length; i++) {
				if (msgArray[i] == undefined) {
					msg = ""; // return ?
				}
				if (msgArray[i] instanceof Error) {
					msgArray[i] = msgArray[i] + " -> " + msgArray[i].line
				}
				if (msgArray[i].constructor.name != String) {
					msgArray[i] = msgArray[i].toString();
				}
			}
			var msg = msgArray.join("\n");
			var dialogWin = new Window("dialog", title + callingScriptVersion);
			dialogWin.etMsg = dialogWin.add("edittext", undefined, msg, { multiline: true, scrolling: true });
			dialogWin.etMsg.maximumSize.height = 300;
			dialogWin.etMsg.minimumSize.width = 500;

			dialogWin.gControl = dialogWin.add("group");
			dialogWin.gControl.preferredSize.width = 500;
			dialogWin.gControl.alignChildren = ['right', 'center'];
			dialogWin.gControl.margins = 0;
			dialogWin.gControl.btSave = null;
			dialogWin.gControl.btSave = dialogWin.gControl.add("button", undefined, localize({ en: "Save", de: "Speichern" }) + " " + type);
			dialogWin.gControl.btSave.onClick = function () {
				var texFile = File.saveDialog(localize({ en: "Save information in text file ", de: "Speichern der Informationen in einer Textdatei" }), INNER.getFileFilter(localize({ en: "Textfile ", de: "Textdatei" }) + ":*.txt"));
				if (texFile) {
					if (!texFile.name.match(/\.txt$/)) {
						texFile = File(texFile.fullName + ".txt");
					}
					texFile.encoding = "UTF-8";
					texFile.open("e");
					texFile.writeln(msg);
					texFile.close();
					dialogWin.close();
				}
			}
			dialogWin.gControl.add("button", undefined, "Ok", { name: "ok" });
			dialogWin.show();
		}
	};
	INNER.confirmMessages = function (title, msgArray, type) {
		if (!INNER.disableAlerts && msgArray.length > 0) {
			var callingScriptVersion = "    ";
			// if ($.global.hasOwnProperty("px") && $.global.px.hasOwnProperty("projectName")) {
			// 	callingScriptVersion += px.projectName;
			// }
			// if ($.global.hasOwnProperty("px") && $.global.px.hasOwnProperty("version")) {
			// 	callingScriptVersion += " v" + px.version;
			// }
			var msg = msgArray.join("\n");
			var dialogWin = new Window("dialog", title + callingScriptVersion);
			dialogWin.etMsg = dialogWin.add("edittext", undefined, msg, { multiline: true, scrolling: true });
			dialogWin.etMsg.maximumSize.height = 400;
			dialogWin.etMsg.minimumSize.width = 500;

			dialogWin.gControl = dialogWin.add("group");
			dialogWin.gControl.preferredSize.width = 500;
			dialogWin.gControl.alignChildren = ['right', 'center'];
			dialogWin.gControl.margins = 0;
			dialogWin.gControl.btSave = null;
			dialogWin.gControl.btSave = dialogWin.gControl.add("button", undefined, localize({ en: "Save", de: "Speichern" }) + " " + type);
			dialogWin.gControl.btSave.onClick = function () {
				var texFile = File.saveDialog(localize({ en: "Save information in text file ", de: "Speichern der Informationen in einer Textdatei" }), INNER.getFileFilter(".txt", localize({ en: "Textfile ", de: "Textdatei" })));
				if (texFile) {
					if (!texFile.name.match(/\.txt$/)) {
						texFile = File(texFile.fullName + ".txt");
					}
					texFile.encoding = "UTF-8";
					texFile.open("e");
					texFile.writeln(msg);
					texFile.close();
				}
			}
			dialogWin.gControl.add("button", undefined, localize({ en: "Cancel", de: "Abbrechen" }), { name: "cancel" });
			dialogWin.gControl.add("button", undefined, "Ok", { name: "ok" });
			return dialogWin.show();
		}
	};

	INNER.confirm = function (message, noAsDefault, title) {
		return confirm(message, noAsDefault, title);
	}

	INNER.getFileFilter = function (fileFilter) {
		if (fileFilter == undefined || File.fs == "Windows") {
			return fileFilter;
		}
		else {
			// Mac
			var extArray = fileFilter.split(":")[1].split(";");
			return function fileFilter(file) {
				if (file.constructor.name === "Folder") return true;
				if (file.alias) return true;
				for (var e = 0; e < extArray.length; e++) {
					var ext = extArray[e];
					ext = ext.replace(/\*/g, "");
					if (file.name.slice(ext.length * -1) === ext) return true;
				}
			}
		}
	};

	INNER.msToTime = function (microseconds) {
		var milliseconds = microseconds / 1000;
		var ms = parseInt((milliseconds % 1000) / 100)
		//Get hours from milliseconds
		var hours = milliseconds / (1000 * 60 * 60);
		var absoluteHours = Math.floor(hours);
		var h = absoluteHours > 9 ? absoluteHours : '0' + absoluteHours;

		//Get remainder from hours and convert to minutes
		var minutes = (hours - absoluteHours) * 60;
		var absoluteMinutes = Math.floor(minutes);
		var m = absoluteMinutes > 9 ? absoluteMinutes : '0' + absoluteMinutes;

		//Get remainder from minutes and convert to seconds
		var seconds = (minutes - absoluteMinutes) * 60;
		var absoluteSeconds = Math.floor(seconds);
		var s = absoluteSeconds > 9 ? absoluteSeconds : '0' + absoluteSeconds;


		return h + ':' + m + ':' + s + "." + ms;
	};
	/****************
    * API 
    */

    /**
    * Returns a log Object
    * @logFile {File|String} Path to logfile as File Object or String.
    * @logLevel {String} Log Threshold  "OFF", "ERROR", "WARN", "INFO", "DEBUG"
    * @disableAlerts {Boolean} Show alerts
    */
	SELF.getLogger = function (logFile, logLevel, disableAlerts) {
		if (logFile == undefined) {
			throw Error("Cannot instantiate Log without Logfile. Please provide a File");
		}
		$.hiresTimer;
		if (logFile instanceof String) {
			logFile = File(logFile);
		}
		if (!(logFile instanceof File)) {
			throw Error("Cannot instantiate Log. Please provide a File");
		}
		// Logrotate > 1 MB
		if (logFile.length > 1000000) {
			try {
				var rotateFile = File(logFile.toString().replace(/\.txt$/, "") + "_logrotate.txt");
				logFile.copy(rotateFile);
				logFile.remove();
			}
			catch (e) {
				throw Error("Could not move the log File! Error: " + e);
			}
		}
		if (logLevel == undefined) {
			logLevel = "INFO";
		}
		if (disableAlerts == undefined) {
			disableAlerts = false;
		}

		INNER.logLevel = INNER.SEVERITY[logLevel];
		INNER.disableAlerts = disableAlerts;

		var counter = {
			debug: 0,
			info: 0,
			warn: 0,
			error: 0
		}
		var messages = {
			all: [],
			info: [],
			warn: [],
			error: []
		}

		return {
			/**
			* Writes a debug log message
			* @message {String} message Message to log.
			* @object {Object} Log the page name of the given object
			*/
			writeln: function (message, object) {
				message = INNER.processMsg(message, object);
				if (typeof px != "undefined" && px.hasOwnProperty("debug") && px.debug) {
					$.writeln(message);
				}
				if (INNER.logLevel == 0) {
					INNER.writeLog(message, "DEBUG", logFile);
					counter.debug++;
				}
			},
			/**
			* Writes a debug log message
			* @message {String} message Message to log.
			* @object {Object} Log the page name of the given object
			*/
			debug: function (message, object) {
				message = INNER.processMsg(message, object);
				if (INNER.logLevel == 0) {
					INNER.writeLog(message, "DEBUG", logFile);
					counter.debug++;
				}
			},
			/**
			* Writes an info log message
			* @message {String} message Message to log.
			* @object {Object} Log the page name of the given object
			*/
			info: function (message, object) {
				message = INNER.processMsg(message, object);
				if (INNER.logLevel <= 1) {
					INNER.writeLog(message, "INFO", logFile);
					counter.info++;
					messages.info.push(message);
					messages.all.push(message);
				}
			},
			/**
			* Writes an info log message und displays an Alert-Window
			* @message {String} message Message to log.
			* @object {Object} Log the page name of the given object
			*/
			infoAlert: function (message, object) {
				message = INNER.processMsg(message, object);
				if (INNER.logLevel <= 2) {
					INNER.writeLog(message, "INFO", logFile);
					counter.info++;
					messages.info.push(message);
					messages.all.push(message);
					INNER.showAlert("[INFO]", message, localize({ en: "informations", de: " der Informationen" }));
				}
			},
			/**
			* Writes an info message and adds the message to the warn array
				useful to add information to the warning messages without incrementing the warn counter.
				e.g. put information about file name while processing different documents.
			* @message {String} message Message to log.
			* @object {Object} Log the page name of the given object
			*/
			warnInfo: function (message, object) {
				message = INNER.processMsg(message, object);
				if (INNER.logLevel <= 1) {
					INNER.writeLog(message, "INFO", logFile);
					counter.info++;
					messages.info.push(message);
					messages.all.push(message);
				}
				if (INNER.logLevel <= 2) {
					INNER.writeLog(message, "INFO", logFile);
					messages.warn.push(message);
					messages.all.push(message);
				}
			},
			/**
			* Writes a warn log message
			* @message {String} message Message to log.
			* @object {Object} Log the page name of the given object
			*/
			warn: function (message, object) {
				message = INNER.processMsg(message, object);
				if (typeof px != "undefined" && px.hasOwnProperty("debug") && px.debug) {
					$.writeln("WARN: \n" + message);
				}
				if (INNER.logLevel <= 2) {
					INNER.writeLog(message, "WARN", logFile);
					counter.warn++;
					messages.warn.push(message);
					messages.all.push(message);
				}
			},
			/**
			* Writes a warn log message und displays an Alert-Window
			* @message {String} message Message to log.
			* @object {Object} Log the page name of the given object
			*/
			warnAlert: function (message, object) {
				message = INNER.processMsg(message, object);
				if (INNER.logLevel <= 2) {
					INNER.writeLog(message, "WARN", logFile);
					counter.warn++;
					messages.warn.push(message);
					messages.all.push(message);
					INNER.showAlert("[WARN]", message + "\n\nPrüfen Sie auch das Logfile:\n" + logFile, localize({ en: "warnings", de: "der Warnungen" }));
				}
			},
			/**
			* Writes a error log message
			* @message {String} message Message to log.
			* @object {Object} Log the page name of the given object
			*/
			error: function (message, object) {
				message = INNER.processMsg(message, object);
				if (INNER.logLevel <= 3) {
					INNER.writeLog(message, "ERROR", logFile);
					counter.error++;
					messages.error.push(message);
					messages.all.push(message);
				}
			},

			/**
			* Shows all warnings
			*/
			showWarnings: function () {
				INNER.showMessages("Es gab " + counter.warn + " Warnmeldungen", messages.warn, localize({ en: "warnings", de: "der Warnungen" }));
			},
			/**
			* Confirm all infos
			*/
			confirmInfos: function () {
				var message = "Die folgenden Probleme sind aufgetreten. Soll das Skript weiter ausgeführt werden?";
				INNER.writeLog(message, "INFO", logFile);

				var res = INNER.confirmMessages(message, messages.info, localize({ en: "warnings", de: "der Warnungen" }));
				INNER.writeLog("User interaction: " + res, "INFO", logFile);
				messages.info = [];
				if (res == 1) {
					return true;
				}
				else {
					return false;
				}
			},
			/**
			* Confirm all warnings
			*/
			confirmWarnings: function () {
				var message = "Die folgenden Probleme sind aufgetreten. Soll das Skript weiter ausgeführt werden?";
				INNER.writeLog(message, "INFO", logFile);

				var res = INNER.confirmMessages(message, messages.warn, localize({ en: "warnings", de: "der Warnungen" }));
				INNER.writeLog("User interaction: " + res, "INFO", logFile);
				messages.warn = [];
				if (res == 1) {
					return true;
				}
				else {
					return false;
				}
			},
			/**
			* Confirm all messages
			*/
			confirmMessages: function () {
				var message = "Die folgenden Probleme sind aufgetreten. Soll das Skript weiter ausgeführt werden?";
				INNER.writeLog(message, "INFO", logFile);

				var res = INNER.confirmMessages(message, messages.all, localize({ en: "warnings", de: "der Warnungen" }));
				INNER.writeLog("User interaction: " + res, "INFO", logFile);
				messages.all = [];
				if (res == 1) {
					return true;
				}
				else {
					return false;
				}
			},

			/** 
			 * Confirm a warning 
			 * @message {String} message Message to log.
			 * @noAsDefault {Boolean} 
			 * @title {String}
			 * @object {Object} Log the page name of the given object
			 * */
			confirm: function (message, noAsDefault, title, object) {
				message = INNER.processMsg(message, object);
				if (title == undefined) {
					title = "";
				}
				INNER.writeLog("log: " + message, "INFO", logFile);
				var res = INNER.confirm(message, noAsDefault, title);
				INNER.writeLog("User interaction: " + res, "INFO", logFile);
				return res;
			},


			/**
			* Returns all warnings
			*/
			getWarnings: function () {
				return messages.warn.join("\n");
			},
			/**
			* Shows all messages
			*/
			showMessages: function () {
				INNER.showMessages("Es gab " + (counter.debug + counter.info + counter.warn + counter.error) + " Meldungen", messages.all, localize({ en: "Messages", de: "Meldungen" }));
			},
			/**
			* Shows all infos
			*/
			showInfos: function () {
				INNER.showMessages("Es gab " + counter.info + " Infos", messages.info, localize({ en: "Informations", de: " Informationen" }));
			},
			/**
			* Returns all infos
			*/
			getInfos: function () {
				return messages.info.join("\n");
			},
			/**
			* Shows all errors
			*/
			showErrors: function () {
				INNER.showMessages("Es gab " + counter.error + " Fehler", messages.error, localize({ en: "Errors", de: "Fehler" }));
			},
			/**
			* Returns all errors
			*/
			getErrors: function () {
				return messages.error.join("\n");
			},
			/**
			* Returns the counter Object
			*/
			getCounters: function () {
				return counter;
			},


			/**
			* Set silent Mode
			* @message {Boolean} true will not show alerts!
			*/
			disableAlerts: function (mode) {
				INNER.disableAlerts = mode;
			},

			/**
			* Clear Logfile and counters
			*/
			clearLog: function () {
				logFile.open("w");
				logFile.write("");
				logFile.close();
				counter.debug = 0;
				counter.info = 0;
				counter.warn = 0;
				counter.error = 0;
				messages.info = [];
				messages.warn = [];
				messages.error = [];
				messages.all = [];
			},
			/**
			* Reset Message and counters - use showWarning before !
			*/
			resetCounterAndMessages: function () {
				counter.debug = 0;
				counter.info = 0;
				counter.warn = 0;
				counter.error = 0;
				messages.info = [];
				messages.warn = [];
				messages.error = [];
				messages.all = [];
			},
			/**
			* Shows the log file in the system editor
			*/
			showLog: function () {
				logFile.execute();
			},
			/**
			* Prints elapsed time since and resets Timer 
			*/
			elapsedTime: function () {
				var message = "Elapsed time: " + INNER.msToTime($.hiresTimer);
				INNER.writeLog(message, "INFO", logFile);
				counter.info++;
				messages.info.push(message);
				messages.all.push(message);
				if (typeof px != "undefined" && px.hasOwnProperty("debug") && px.debug) {
					$.writeln(message);
				}
			},
			/**
			* reset the elapsed Time Timer
			*/
			resetTimer: function () {
				$.hiresTimer;
			},
			/**
			* Returns elapsed time without writing to log or resetting
			*/
			getElapsedTime: function () {
				return INNER.msToTime($.hiresTimer);
			},
			/**
			* Returns the current log Folder path
			*/
			getLogFolder: function () {
				return logFile.parent;
			},
			/**
			* Returns the current log File path
			*/
			getLogFile: function () {
				return logFile;
			}
		}
	};
})($.global, { toString: function () { return 'idsLog'; } });



main();

function main() {
	if (app.documents.length == 0) {
		alert("Kein Dokument geöffnet", "Hinweis");
		return;
	}
	if (app.layoutWindows.length == 0) {
		alert("Kein Dokument sichtbar", "Hinweis");
		return;
	}

	// Init Log
	initLog();

	var dok = app.documents[0];
	log.info("Verarbeite Datei: " + dok.name);

	var ial = app.scriptPreferences.userInteractionLevel;
	var redraw = app.scriptPreferences.enableRedraw;
	var scriptPrefVersion = app.scriptPreferences.version;

	if (px.debug) {
		app.scriptPreferences.version = parseInt(app.version);
		log.info("processDok mit app.scriptPreferences.version " + app.scriptPreferences.version + " app.version " + app.version);
		if (checkDok(dok)) {
			if (px.runWithUndo) {
				app.doScript(processDok, ScriptLanguage.JAVASCRIPT, [dok], UndoModes.ENTIRE_SCRIPT, px.projectName);
			}
			else {
				processDok(dok);
			}
		}
	}
	else {
		try {
			if (dok && dok.isValid) {

				app.scriptPreferences.userInteractionLevel = UserInteractionLevels.NEVER_INTERACT;
				app.scriptPreferences.enableRedraw = false;
				app.scriptPreferences.version = parseInt(app.version);
				log.info("processDok mit app.scriptPreferences.version " + app.scriptPreferences.version + " app.version " + app.version);

				if (checkDok(dok)) {
					if (px.runWithUndo) {
						app.doScript(processDok, ScriptLanguage.JAVASCRIPT, [dok], UndoModes.ENTIRE_SCRIPT, px.projectName);
					}
					else {
						processDok(dok);
					}
				}
			}
		}
		catch (e) {
			log.warn(e);
		}
		finally {
			app.scriptPreferences.userInteractionLevel = ial;
			app.scriptPreferences.enableRedraw = redraw;
			app.scriptPreferences.version = scriptPrefVersion;
			app.findGrepPreferences = NothingEnum.NOTHING;
			app.changeGrepPreferences = NothingEnum.NOTHING;
		}
	}

	if (log.getCounters().warn > 0) {
		log.showWarnings();
	}
	log.info("Skriptlauf Ende");
	log.elapsedTime();
	if (px.showSummary) {
		var dialogWin = new Window("dialog", px.projectName + px.version);
		dialogWin.etMsg = dialogWin.add("edittext", undefined, px.mailtoSummary + "\n" + px.urlSummary, { multiline: true, scrolling: true });
		dialogWin.etMsg.maximumSize.height = 300;
		dialogWin.etMsg.minimumSize.width = 500;

		dialogWin.gControl = dialogWin.add("group");
		dialogWin.gControl.preferredSize.width = 500;
		dialogWin.gControl.alignChildren = ['right', 'center'];
		dialogWin.gControl.margins = 0;
		dialogWin.gControl.add("button", undefined, "Ok", { name: "ok" });
		dialogWin.show();
	}
}




/* Functions structuring the execution */
function checkDok(dok) {
	// Hier darf im Dokument keine Änderung vorgenommen werden, weil diese Außerhalb des UNDO wären!
	// Fehler --> 
	// log.warn("Wir haben ein Problem --> return false");

	return true;
}

function processDok(dok) {
	if (px.runWithUndo) {
		dok = dok[0];
	}
	var configObject = getConfig(dok);
	if (configObject == 2) {
		// User canceled
		px.showSummary = false;
		return;
	}

	try {
		// Save Options
		var saveFindGrepOptions = {};
		saveFindGrepOptions.includeFootnotes = app.findChangeGrepOptions.includeFootnotes;
		saveFindGrepOptions.includeHiddenLayers = app.findChangeGrepOptions.includeHiddenLayers;
		saveFindGrepOptions.includeLockedLayersForFind = app.findChangeGrepOptions.includeLockedLayersForFind;
		saveFindGrepOptions.includeLockedStoriesForFind = app.findChangeGrepOptions.includeLockedStoriesForFind;
		saveFindGrepOptions.includeMasterPages = app.findChangeGrepOptions.includeMasterPages;
		if (app.findChangeGrepOptions.hasOwnProperty("searchBackwards")) saveFindGrepOptions.searchBackwards = app.findChangeGrepOptions.searchBackwards;

		// Set Options
		app.findChangeGrepOptions.includeFootnotes = true;
		app.findChangeGrepOptions.includeHiddenLayers = true;
		app.findChangeGrepOptions.includeLockedLayersForFind = false;
		app.findChangeGrepOptions.includeLockedStoriesForFind = false;
		app.findChangeGrepOptions.includeMasterPages = configObject.processMasterSpread;
		if (app.findChangeGrepOptions.hasOwnProperty("searchBackwards")) app.findChangeGrepOptions.searchBackwards = false;

		// Reset Dialog
		app.findGrepPreferences = NothingEnum.nothing;
		app.changeGrepPreferences = NothingEnum.nothing;

		var result = false;
		var counter = 0;

		// fixLineEndings this breaks existing links ... especially toc
		// app.findGrepPreferences.findWhat = "\\n|\\r";
		// app.changeGrepPreferences.changeTo = "\\x{E009}$0"
		// dok.changeGrep();

		app.findGrepPreferences.findWhat = "\\z";
		var textEndings = dok.findGrep(true);
		for (var t = 0; t < textEndings.length; t++) {
			textEndings[t].contents = "\uE009";
		}

		// Mails Adressen verarbeiten 
		if (configObject.createMailLinks) {
			var MailProtocol = "(?i)(?<![@\\-])\\b(?:mailto://)?";
			var MailName = "[\\n\\x{E009}\\l][\\n\\x{E009}\\l._-]+\\@";
			var MailDomain = "(?:[\\n\\x{E009}\\l\\d][\\n\\x{E009}\\l\\d_-]+\\.){1,}";
			if (configObject.allowLongTLDs) {
				var MailTLD = "(?:[\\n\\x{E009}\\l]{2,}+|xn--[\\n\\x{E009}\\l\\d]{2,})";
			}
			else {
				var MailTLD = "(?:AC|AD|AE|AERO|AF|AG|AI|AL|AM|AN|AO|AQ|AR|ARPA|AS|ASIA|AT|AU|AW|AX|AZ|BA|BB|BD|BE|BF|BG|BH|BI|BIZ|BJ|BM|BN|BO|BR|BS|BT|BV|BW|BY|BZ|CA|CAT|CC|CD|CF|CG|CH|CI|CK|CL|CM|CN|CO|COM|COOP|CR|CU|CV|CW|CX|CY|CZ|DE|DJ|DK|DM|DO|DZ|EC|EDU|EE|EG|ER|ES|ET|EU|FI|FJ|FK|FM|FO|FR|GA|GB|GD|GE|GF|GG|GH|GI|GL|GM|GN|GOV|GP|GQ|GR|GS|GT|GU|GW|GY|HK|HM|HN|HR|HT|HU|ID|IE|IL|IM|IN|INFO|INT|IO|IQ|IR|IS|IT|JE|JM|JO|JOBS|JP|KE|KG|KH|KI|KM|KN|KP|KR|KW|KY|KZ|LA|LB|LC|LI|LK|LR|LS|LT|LU|LV|LY|MA|MC|MD|ME|MG|MH|MIL|MK|ML|MM|MN|MO|MOBI|MP|MQ|MR|MS|MT|MU|MUSEUM|MV|MW|MX|MY|MZ|NA|NAME|NC|NE|NET|NF|NG|NI|NL|NO|NP|NR|NU|NZ|OM|ORG|PA|PE|PF|PG|PH|PK|PL|PM|PN|PR|PRO|PS|PT|PW|PY|QA|RE|RO|RS|RU|RW|SA|SB|SC|SD|SE|SG|SH|SI|SJ|SK|SL|SM|SN|SO|SR|ST|SU|SV|SX|SY|SZ|TC|TD|TEL|TF|TG|TH|TJ|TK|TL|TM|TN|TO|TP|TR|TRAVEL|TT|TV|TW|TZ|UA|UG|UK|US|UY|UZ|VA|VC|VE|VG|VI|VN|VU|WF|WS|XXX|YE|YT|ZA|ZM|ZW)";
			}
			var MailEnd = "(?=(\\.\\s|\\.\\x{E009}|,|;|>|:|\\)|]|\"|\'|\\x{E009}|/|\\s))";
			app.findGrepPreferences.findWhat = MailProtocol + MailName + MailDomain + MailTLD + MailEnd;
			var findResults = dok.findGrep(true);

			for (var i = 0; i < findResults.length; i++) {
				var textObject = findResults[i];
				var mailAdress = getMail(textObject.contents);
				result = createHyperLink(dok, textObject, mailAdress, configObject);
				if (result) {
					counter++;
					log.info("Mailto-Hyperlink: " + textObject.contents + " -> " + mailAdress);
				}
			}
			log.info(counter + " Mailto-Hyperlinks!");
			px.mailtoSummary = counter + " Mailto-Hyperlinks";
			counter = 0;
		}
		// Web URLs verarbeiten 
		if (configObject.createWebLinks) {
			var URLProtocol = "(?i)(?<![@\\-])\\b(?:http://|https://|www\\.)?";
			var URLFirstDomainPart = "(?:[\\l\\d][\\l\\d_-]+\\.){1,}";
			var URLDomain = "(?:[\\n\\x{E009}\\l\\d][\\n\\x{E009}\\l\\d_-]+\\.){1,}";
			var URLTLD = MailTLD;
			var URLText = "(?:(?:/|/\\x{E009}\\n|\\?|#|:)[^\\s\\].,;>:\"')]{2,}(?:\\.[a-Z]{2,5})?)?";

			var URLEnd = MailEnd;
			app.findGrepPreferences.findWhat = URLProtocol + URLFirstDomainPart + URLDomain + URLTLD + URLText + URLEnd;
			findResults = dok.findGrep(true);

			for (var i = 0; i < findResults.length; i++) {
				var textObject = findResults[i];
				var url = getWebURL(textObject.contents);
				result = createHyperLink(dok, textObject, url, configObject);
				if (result) {
					counter++;
					log.info("URL-Hyperlink 1: " + textObject.contents + " -> " + url + " counter " + counter);
				}
			}

			// Force http(s) or www at beginning at the beginning of line and end of line
			URLProtocol = "(?i)^(?:http://|https://|www\\.)";
			URLFirstDomainPart = "";
			URLDomain = "(?:[\\n\\x{E009}\\l\\d][\\n\\x{E009}\\l\\d_-]+\\.){1,}";
			var URLEnd = "$";
			app.findGrepPreferences.findWhat = URLProtocol + URLFirstDomainPart + URLDomain + URLTLD + URLText + URLEnd;
			findResults = dok.findGrep(true);

			for (var i = 0; i < findResults.length; i++) {
				var textObject = findResults[i];
				var url = getWebURL(textObject.contents);
				var result = createHyperLink(dok, textObject, url, configObject);
				if (result) {
					counter++;
					log.info("URL-Hyperlink Force http(s) or www at the beginning of line and end of line: " + textObject.contents + " -> " + url + " counter " + counter);
				}
			}

			// Force http(s) or www at beginning
			URLProtocol = "(?i)(?<![@\\-])\\b(?:http://|https://|www\\.)";
			URLFirstDomainPart = "";
			URLDomain = "(?:[\\n\\x{E009}\\l\\d][\\n\\x{E009}\\l\\d_-]+\\.){1,}";
			var URLEnd = MailEnd;

			app.findGrepPreferences.findWhat = URLProtocol + URLFirstDomainPart + URLDomain + URLTLD + URLText + URLEnd;
			findResults = dok.findGrep(true);

			for (var i = 0; i < findResults.length; i++) {
				var textObject = findResults[i];
				var url = getWebURL(textObject.contents);
				var result = createHyperLink(dok, textObject, url, configObject);
				if (result) {
					counter++;
					log.info("URL-Hyperlink Force http(s) or www at beginning: " + textObject.contents + " -> " + url + " counter " + counter);
				}
			}



			// Force short and old TLDs
			URLProtocol = "(?i)(?<![@\\-])\\b";
			URLFirstDomainPart = "";
			URLDomain = "(?:[\\n\\x{E009}\\l\\d][\\n\\x{E009}\\l\\d_-]+\\.){1,}";
			URLTLD = "(?:AC|AD|AE|AERO|AF|AG|AI|AL|AM|AN|AO|AQ|AR|ARPA|AS|ASIA|AT|AU|AW|AX|AZ|BA|BB|BD|BE|BF|BG|BH|BI|BIZ|BJ|BM|BN|BO|BR|BS|BT|BV|BW|BY|BZ|CA|CAT|CC|CD|CF|CG|CH|CI|CK|CL|CM|CN|CO|COM|COOP|CR|CU|CV|CW|CX|CY|CZ|DE|DJ|DK|DM|DO|DZ|EC|EDU|EE|EG|ER|ES|ET|EU|FI|FJ|FK|FM|FO|FR|GA|GB|GD|GE|GF|GG|GH|GI|GL|GM|GN|GOV|GP|GQ|GR|GS|GT|GU|GW|GY|HK|HM|HN|HR|HT|HU|ID|IE|IL|IM|IN|INFO|INT|IO|IQ|IR|IS|IT|JE|JM|JO|JOBS|JP|KE|KG|KH|KI|KM|KN|KP|KR|KW|KY|KZ|LA|LB|LC|LI|LK|LR|LS|LT|LU|LV|LY|MA|MC|MD|ME|MG|MH|MIL|MK|ML|MM|MN|MO|MOBI|MP|MQ|MR|MS|MT|MU|MUSEUM|MV|MW|MX|MY|MZ|NA|NAME|NC|NE|NET|NF|NG|NI|NL|NO|NP|NR|NU|NZ|OM|ORG|PA|PE|PF|PG|PH|PK|PL|PM|PN|PR|PRO|PS|PT|PW|PY|QA|RE|RO|RS|RU|RW|SA|SB|SC|SD|SE|SG|SH|SI|SJ|SK|SL|SM|SN|SO|SR|ST|SU|SV|SX|SY|SZ|TC|TD|TEL|TF|TG|TH|TJ|TK|TL|TM|TN|TO|TP|TR|TRAVEL|TT|TV|TW|TZ|UA|UG|UK|US|UY|UZ|VA|VC|VE|VG|VI|VN|VU|WF|WS|XXX|YE|YT|ZA|ZM|ZW)";
			app.findGrepPreferences.findWhat = URLProtocol + URLFirstDomainPart + URLDomain + URLTLD + URLText + URLEnd;
			findResults = dok.findGrep(true);

			for (var i = 0; i < findResults.length; i++) {
				var textObject = findResults[i];
				var url = getWebURL(textObject.contents);
				var result = createHyperLink(dok, textObject, url, configObject);
				if (result) {
					counter++;
					log.info("URL-Hyperlink Force short and old TLDs: " + textObject.contents + " -> " + url + " counter " + counter);
				}
			}


			log.info(counter + " URL-Hyperlinks!");
			px.urlSummary = counter + " URL-Hyperlinks";
			counter = 0;

			app.findGrepPreferences = NothingEnum.nothing;
			app.changeGrepPreferences = NothingEnum.nothing;
		}
	}
	catch (e) {
		log.warn(e);
	}
	finally {

		app.findGrepPreferences.findWhat = "\\x{E009}+$";
		app.changeGrepPreferences.changeTo = ""
		dok.changeGrep();

		// Reset Options
		app.findChangeGrepOptions.includeFootnotes = saveFindGrepOptions.includeFootnotes;
		app.findChangeGrepOptions.includeHiddenLayers = saveFindGrepOptions.includeHiddenLayers;
		app.findChangeGrepOptions.includeLockedLayersForFind = saveFindGrepOptions.includeLockedLayersForFind;
		app.findChangeGrepOptions.includeLockedStoriesForFind = saveFindGrepOptions.includeLockedStoriesForFind;
		app.findChangeGrepOptions.includeMasterPages = saveFindGrepOptions.includeMasterPages;
		if (app.findChangeGrepOptions.hasOwnProperty("searchBackwards")) app.findChangeGrepOptions.searchBackwards = saveFindGrepOptions.searchBackwards;

		app.findGrepPreferences = NothingEnum.nothing;
		app.changeGrepPreferences = NothingEnum.nothing;

	}
}


/* Functions with fine grained tasks */
function getConfig(dok) {
	configObject = {};

	if (!px.showGUI) {
		configObject.applyCStyle = true;
		configObject.cStyle = dok.characterStyles[0];
		configObject.processMasterSpread = true;
		return configObject;
	}
	var win = new Window("dialog", px.projectName + " – v" + px.version);
	with (win) {
		//~ 		win.sInfo = add( "statictext", undefined, "Konfigurationseinstellungen für die Erstellung der Hyperlinks", {multiline: true} );
		//~ 		win.sInfo.alignment = "left";
		//~ 		win.sInfo.preferredSize.width = 410;
		//~ 		win.sInfo.preferredSize.height = 32; 

		win.pInfo = add("panel", undefined, "Welche Hyperlinks sollen erstellt werden?");
		win.pInfo.preferredSize.width = 420;
		win.pInfo.orientation = 'row';
		win.pInfo.spacing = 10;
		with (win.pInfo) {
			win.pInfo.gInfo = add("group");
			win.pInfo.gInfo.orientation = 'column';
			win.pInfo.gInfo.alignChildren = ['left', 'top'];
			win.pInfo.gInfo.margins = [0, 10, 0, 0];
			win.pInfo.gInfo.spacing = 5;
			with (win.pInfo.gInfo) {
				win.pInfo.gInfo.addWebLinks = add("checkbox", undefined, "Web Hyperlinks erstellen");
				win.pInfo.gInfo.addWebLinks.value = true;
				win.pInfo.gInfo.addMailLinks = add("checkbox", undefined, "Mailto Hyperlinks erstellen");
				win.pInfo.gInfo.addMailLinks.value = true;
				win.pInfo.gInfo.allowLongTLDs = add("checkbox", undefined, "Lange/Neue TLDs erlauben (.köln ...)");
				win.pInfo.gInfo.allowLongTLDs.value = true;
			}
		}


		win.pCharStyle = add("panel", undefined, "Soll ein Zeichenformat angewendet werden?");
		win.pCharStyle.preferredSize.width = 420;
		win.pCharStyle.orientation = 'row';
		win.pCharStyle.spacing = 10;
		with (win.pCharStyle) {
			win.pCharStyle.gInfo = add("group");
			win.pCharStyle.gInfo.orientation = 'column';
			win.pCharStyle.gInfo.alignChildren = ['left', 'top'];
			win.pCharStyle.gInfo.margins = [0, 10, 0, 0];
			win.pCharStyle.gInfo.spacing = 5;
			with (win.pCharStyle.gInfo) {
				win.pCharStyle.gInfo.addCStyleCB = add("checkbox", undefined, "Zeichenformat anwenden");
				win.pCharStyle.gInfo.addCStyleCB.value = false;
				win.pCharStyle.gInfo.gZeichenformat = add("group");
				with (win.pCharStyle.gInfo.gZeichenformat) {

					win.pCharStyle.gInfo.gZeichenformat.sText = add("statictext", undefined, "Zeichenformat:");
					win.pCharStyle.gInfo.gZeichenformat.sText.preferredSize.width = 100;
					win.pCharStyle.gInfo.gZeichenformat.dd = add("dropdownlist", undefined, []);
					for (var p = 0; p < dok.allCharacterStyles.length; p++) {
						temp = win.pCharStyle.gInfo.gZeichenformat.dd.add('item', dok.allCharacterStyles[p].name);
						temp.cstyle = dok.allCharacterStyles[p];
					}
					win.pCharStyle.gInfo.gZeichenformat.dd.preferredSize.width = 280;
					win.pCharStyle.gInfo.gZeichenformat.dd.selection = 0;
				}
			}
		}
		win.pMasterSpread = add("panel", undefined, "Sollen Hyperlinks auf Musterdruckbögen erstellt werden?");
		win.pMasterSpread.preferredSize.width = 420;
		win.pMasterSpread.orientation = 'row';
		win.pMasterSpread.spacing = 10;
		with (win.pMasterSpread) {
			win.pMasterSpread.gInfo = add("group");
			win.pMasterSpread.gInfo.orientation = 'column';
			win.pMasterSpread.gInfo.alignChildren = ['left', 'top'];
			win.pMasterSpread.gInfo.margins = [0, 10, 0, 0];
			win.pMasterSpread.gInfo.spacing = 5;
			with (win.pMasterSpread.gInfo) {
				win.pMasterSpread.gInfo.gZeichenformat = add("group");
				with (win.pMasterSpread.gInfo.gZeichenformat) {
					win.pMasterSpread.gInfo.gZeichenformat.addCStyleCB = add("checkbox", undefined, "Musterdruckbögen einbeziehen");
					win.pMasterSpread.gInfo.gZeichenformat.addCStyleCB.value = false;
				}
			}
		}

		// Steuerung Ok/Cancel
		win.groupStart = add("group");
		win.groupStart.preferredSize.width = 420;
		win.groupStart.alignChildren = ['right', 'center'];
		win.groupStart.margins = 0;
		with (win.groupStart) {
			win.groupStart.butOk = add("button", undefined, "Ok");
			win.groupStart.butCancel = add("button", undefined, "Abbrechen");
		}
	}


	// Ok / Cancel
	win.groupStart.butOk.onClick = function () {
		configObject.createWebLinks = win.pInfo.gInfo.addWebLinks.value;
		log.info("User Web-Links erstellen : " + configObject.createWebLinks);
		configObject.createMailLinks = win.pInfo.gInfo.addMailLinks.value;
		log.info("User Mail-Links erstellen : " + configObject.createMailLinks);
		configObject.allowLongTLDs = win.pInfo.gInfo.allowLongTLDs.value;
		log.info("User erlaubt lange TLD : " + configObject.allowLongTLDs);

		configObject.applyCStyle = win.pCharStyle.gInfo.addCStyleCB.value;
		log.info("User will Zeichenformat anwenden: " + configObject.applyCStyle);
		configObject.cStyle = win.pCharStyle.gInfo.gZeichenformat.dd.selection.cstyle;
		log.info("User wählt Zeichenformat: " + configObject.cStyle.name);
		configObject.processMasterSpread = win.pMasterSpread.gInfo.gZeichenformat.addCStyleCB.value;
		log.info("User will Musterseiten verarbeiten: " + configObject.processMasterSpread);
		win.close(0);
	}
	win.groupStart.butCancel.onClick = function () {
		win.close(2);
	}

	// Show Window
	win.center();
	var result = win.show();
	if (result == 2) {
		return 2
	}
	else {
		return configObject;
	}
}


/* Erstellt einen Hyperlink */
function createHyperLink(dok, textObject, url, configObject) {
	try {
		if (configObject.applyCStyle) {
			textObject.appliedCharacterStyle = configObject.cStyle;
		}
		var quelle = dok.hyperlinkTextSources.add(textObject);
		var urlDestination = dok.hyperlinkURLDestinations.itemByName(url);
		if (!urlDestination.isValid) urlDestination = dok.hyperlinkURLDestinations.add(url, { name: url });
		var hlink = dok.hyperlinks.add(quelle, urlDestination);
		hlink.name = url;
		//~ 		log.info("Hyperink erstellt: " + textObject.contents + " -> " + url);
		return true;
	}
	catch (e) {
		if (e.number == 79111) {
			/* "Das ausgewählte Objekt wird bereits von einem anderen Hyperlink verwendet." -> weiter, schneller als die Prüfung mit isHyperlink() */
		}
		else if (e.number == 79110) {
			/* "Dieser Name wird bereits von einem anderen Objekt verwendet" -> weiter, schneller als die Prüfung mit isHyperlink() */
			return true;
		}
		else {
			log.warn(e);
		}
	}
	return false;
}

function getWebURL(url) {
	url = cleanInDesignString(url);
	if (url.indexOf("http") != 0) {
		url = "http://" + url;
	}
	return url;
}

function getMail(url) {
	url = cleanInDesignString(url);
	if (url.indexOf("mailto") != 0) {
		url = "mailto:" + url;
	}
	return url;
}

// Clean Special Characters ... 
function cleanInDesignString(string) {
	string = string.replace(/[\u0003\u0007\u0016\u0008]/g, ''); // <control> Character können raus
	string = string.replace(/\s/g, ''); // Leerräume entfernen  
	//~ 	string = string.replace(/\n/g, ' '); // Leerräume
	//~ 	string = string.replace(/\r/g, ' '); // Leerräume
	//~ 	string = string.replace(/\t/g, ' '); // Leerräume
	//~ 	string = string.replace(/[\u00A0\u202F\u2001\u2002\u2003\u2004\u2005\u2006\u2007\u2008\u2009\u200A]/g, ' '); // Leerräume
	//~ 	string = string.replace(/  +/g, ' '); // Leerräume
	string = string.replace(/\uFEFF/g, ''); // InDesign Spezialzeichen entfernen 
	string = string.replace(/\u00AD/g, ''); // Bedingte Trennung 
	string = string.replace(/^\s+/, '').replace(/\s+$/, ''); // trim;
	string = string.replace(/\uE009/g, ''); // E009 entfernen (wurde eingesetzt um den $ Bug in GREP zu umschiffen)
	return string;
}

/**  Init Log File and System */
function initLog() {
	var scriptFolderPath = getScriptFolderPath();
	if (scriptFolderPath.fullName.match(/lib$/)) {
		scriptFolderPath = scriptFolderPath.parent;
	}

	var logFolder = Folder(scriptFolderPath + "/log/");
	if (!logFolder.create()) {
		// Schreibe Log auf den Desktop
		logFolder = Folder(Folder.desktop + "/indesign-log/");
		logFolder.create();
	}
	if (px.appendLog) {
		var logFile = File(logFolder + "/" + px.projectName + "_log.txt");
	}
	else {
		var date = new Date();
		date = date.getFullYear() + "-" + pad(date.getMonth() + 1, 2) + "-" + pad(date.getDate(), 2) + "_" + pad(date.getHours(), 2) + "-" + pad(date.getMinutes(), 2) + "-" + pad(date.getSeconds(), 2);
		var logFile = File(logFolder + "/" + date + "_" + px.projectName + "_log.txt");
	}

	if (px.debug) {
		log = idsLog.getLogger(logFile, "DEBUG", true);
		log.clearLog();
	}
	else {
		log = idsLog.getLogger(logFile, "INFO", false);
	}
	log.info("Starte " + px.projectName + " v " + px.version + " Debug: " + px.debug + " ScriptPrefVersion: " + app.scriptPreferences.version + " InDesign v " + app.version);
	return logFile;
}
/** Pad a numer witth leading zeros */
function pad(number, length, fill) {
	if (fill == undefined) fill = "0";
	var str = '' + number;
	while (str.length < length) {
		str = fill + str;
	}
	return str;
}

/** Get Filepath from current script  */
/*Folder*/ function getScriptFolderPath() {
	var skriptPath;
	try {
		skriptPath = app.activeScript.parent;
	}
	catch (e) {
		/* We're running from the ESTK*/
		skriptPath = File(e.fileName).parent;
	}
	return skriptPath;
}