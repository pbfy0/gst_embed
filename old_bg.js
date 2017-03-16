var handler = null;
port.onMessage.addListener(function(msg) {
	if(handler == null) {
		console.error('handler should not have been null')
		return
	}
	//console.log('message', msg)
	handler(msg);
	msg = null;
});

function cb_gen(transform, f) {
	return function(val) {
		if(val.error) {
			throw new TypeError(val.error);
		}
		f(transform(val));
	}
}

function cmd(name, arg) {
	port.postMessage({cmd: name, args: arg});
}

function close_win(hwnd, callback) {
	handler = cb_gen(function(x){return null}, callback);
	cmd('close', {hwnd: hwnd});
}

function gst_launch(pipeline, callback) {
	handler = cb_gen(function(x){return x.hwnd}, callback);
	cmd('launch', {pipeline: pipeline});
}

function find_chrome(title, callback) {
	handler = cb_gen(function(x){return x.hwnd}, callback);
	cmd('findchromewin', {win_title: title});
}

function fix_chrome(hwnd, callback) {
	handler = cb_gen(function(x){return null}, callback);;
	cmd('fixchrome', {hwnd: hwnd})
}

function set_pos(args, callback) {
	handler = cb_gen(function(x){return x.ret}, callback);
	cmd('setpos', args);
}

function set_parent(hwnd, parent, callback) {
	handler = cb_gen(function(x){return null}, callback);
	cmd('setparent', {hwnd: hwnd, parent_hwnd: parent});
}
function set_visible(hwnd, visible, callback) {
	handler = cb_gen(function(x){return null}, callback);
	cmd('setvisible', {hwnd: hwnd, show: visible});
}

var tabstabs = {}

chrome.tabs.onRemoved.addListener(function(tabId) {
	if(tabId in tabstabs) {
		var t = tabstabs[tabId].hw;
		for(var f in t) {
			close_win(t[f], function(){})
		}
		delete tabstabs[tabId];
	}
})

chrome.tabs.onActivated.addListener(function(i) {
	var ii = i.tabId;
	for(var tt in tabstabs) {
		var tab = tabstabs[tt];
		if(tab.win == i.windowId) {
			for(var win in tab.hw) {
				set_visible(tab.hw[win], tt == ii.toString(), function(){});
			}
		}
	}
});

chrome.tabs.onUpdated.addListener(function(tabId, changeInfo, tab) {
	if(changeInfo.url) {
		if(tabId in tabstabs) {
			var t = tabstabs[tabId].hw;
			for(var f in t) {
				close_win(t[f], function(){})
			}
			delete tabstabs[tabId];
		}
	}
})

function attach_to_tab(pipeline, t_name, callback, sender) {
	console.log('a')
	find_chrome(t_name, function(chrome_hwnd) {
		console.log('b')
		fix_chrome(chrome_hwnd, function() {
			console.log('c')
			gst_launch(pipeline, function(gst_hwnd) {
				var id = sender.tab.id;
				if(!(id in tabstabs)) tabstabs[id] = {win: sender.tab.windowId, hw: []}
				tabstabs[id].hw.push(gst_hwnd)
				
				console.log('d', gst_hwnd, chrome_hwnd)
				set_parent(gst_hwnd, chrome_hwnd, function() {
					console.log('e')
					callback({chrome: chrome_hwnd, gst: gst_hwnd});
				});
			});
		})
	})
}

function get_rw_loc(hwnd, callback) {
	handler = cb_gen(function(x){return x}, callback);
	cmd('getrenderwidgetloc', {hwnd: hwnd});
}

var x = {
	attach: attach_to_tab,
	setpos: set_pos,
	close: close_win,
	get_rw_loc: get_rw_loc,
}

chrome.runtime.onMessage.addListener(
	function(req, sender, sendResponse) {
		if(req.cmd in x) {
			var a = req.args;
			a.push(sendResponse);
			a.push(sender)
			x[req.cmd].apply(null, a);
			return true;
		} else {
			sendResponse("invalid command")
		}
	}
)