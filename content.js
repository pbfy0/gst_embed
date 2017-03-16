console.log('hello')

function attach(pipeline, element, cb) {
	chrome.runtime.sendMessage({cmd: 'attach', args: [pipeline, document.title || (location.host + location.pathname)]}, function(arg) {
		chrome.runtime.sendMessage({cmd: 'get_rw_loc', args: [arg.chrome]}, function(r) {
			var f = function(ev) { 
				var x = element.getBoundingClientRect()
				
				chrome.runtime.sendMessage({cmd: 'setpos', args: [{hwnd: arg.gst, x: Math.round(x.left + r.x), y: Math.round(x.top + r.y), h: Math.round(x.height), w: Math.round(x.width)}]}, function(){})
			}
			document.addEventListener('scroll', f)
			f();
			cb(arg.gst)
		})
	})
}