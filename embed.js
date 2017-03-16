if(location.hash != '') {
	console.log("hello")
	//var port = chrome.runtime.connectNative('com.pbfy0.gst_embed')

	var YUVCanvas = require('./../src/yuv-canvas.js')
	var YUVBuffer = require('yuv-buffer')

	port = chrome.runtime.connectNative('com.pbfy0.gst_embed')
	var aa = new Uint8Array(640*480+320*240*2);
	var format = YUVBuffer.format({
		width: 640,
		height: 480,
		chromaWidth: 640 / 2,
		chromaHeight: 480 / 2,
	})
	var frame = YUVBuffer.frame(format,
		{stride: 640, bytes: aa.subarray(0, 640*480)},
		{stride: 320, bytes: aa.subarray(640*480, 640*480+320*240)},
		{stride: 320, bytes: aa.subarray(640*480+320*240, 640*480+320*240*2)}
	);
	document.addEventListener("DOMContentLoaded", function(event) {
		var q = document.getElementById("video")
		q.width = 640
		q.height = 480
		var yuv = YUVCanvas.attach(q)

		function decode(str, buf) {
			var j = 0;
			for(var i = 0; i < buf.length; i++) {
				buf[i] = ((str.charCodeAt(j+1) - 65) << 4) | (str.charCodeAt(j) - 65)
				j += 2
			}
		}

		port.onMessage.addListener(function(r){
			/*var z = atob(r);
			for(var j = 0; j < 640*480+320*240*2; j++) {
				aa[j] = z.charCodeAt(j)
			}*/
			decode(r, aa);
			/*toByteArray(r, aa);*/
			yuv.drawFrame(frame);
		})
		
		port.postMessage(unescape(location.hash.substr(1)))
	})
}