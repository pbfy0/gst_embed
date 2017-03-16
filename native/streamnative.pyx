#!/usr/bin/python3
#cython: language_level=3, boundscheck=False
import win32pipe, win32file, win32con
import uuid
import subprocess # for piping
import sys
import json
import struct
import base64
import ctypes, win32event
import atexit

#def enc(x, out, len):
#	i = 0
#	j = 0
cdef void enc(char *x, char *out, int len):
	cdef int j = 0
	cdef int i = 0
	while i < len:
		out[j] = (x[i] & 0xf) + 65
		j += 1
		out[j] = (x[i] >> 4) + 65
		j += 1
		i += 1
		#yield (x[i] & 0xf) + 65
		#yield (x[i] >> 4) + 65
	return


def w(bb):
	sys.stdout.buffer.write(struct.pack('<I', len(bb)))
	sys.stdout.buffer.write(bb)
	sys.stdout.buffer.flush()

ll, = struct.unpack('<I', sys.stdin.buffer.read(4))
print(ll, file=sys.stderr)
msg = sys.stdin.buffer.read(ll)
pipeline = json.loads(msg.decode('utf-8')) # udpsrc port=5810 ! application/x-rtp ! rtph264depay ! avdec_h264
#pipeline = json.loads(input())
pipe_name = r'\\.\pipe\gst-proxy-' + str(uuid.uuid1())
command = r'C:\gstreamer\1.0\x86_64\bin\gst-launch-1.0.exe {} ! filesink location={}'.format(pipeline, pipe_name.replace('\\', '\\\\'))

DataChunkSize = (640*480 * 3) //2

stdin_handle = ctypes.windll.kernel32.GetStdHandle(-10)

pipe = win32pipe.CreateNamedPipe(pipe_name,
	win32pipe.PIPE_ACCESS_DUPLEX | win32file.FILE_FLAG_OVERLAPPED,
	win32pipe.PIPE_TYPE_MESSAGE | win32pipe.PIPE_WAIT,
	1, DataChunkSize, DataChunkSize ,300,None)
print("running command: %s" % (command, ), file=sys.stderr)
p = subprocess.Popen(command, stdout=subprocess.PIPE)
def ex():
	print('running exit', file=sys.stderr)
	win32pipe.DisconnectNamedPipe(pipe)
	p.terminate()
atexit.register(ex)
win32pipe.ConnectNamedPipe(pipe, None)
print("pipe connected", file=sys.stderr)

ol = win32file.OVERLAPPED()
ol.hEvent = win32event.CreateEvent(None, 1, 0, None)
_buf = win32file.AllocateReadBuffer(DataChunkSize)
#buf = bytearray(_buf)
out = bytearray(DataChunkSize * 2)
_x, data = win32file.ReadFile(pipe, _buf, ol)
while True:
	idx = win32event.WaitForSingleObject(ol.hEvent, 1000)
	if win32event.WaitForSingleObject(stdin_handle, 0) != 0:
		ex()
		break
	#print(idx)
	if idx == 258:
		try:
			w(b'""')
		except OSError:
			ex()
			raise
	if idx == 0:
		#print(len(data))
		enc(bytearray(data), out, len(data))
		#print(data, file=sys.stderr)
		w(b'"' + out + b'"')
		_x, data = win32file.ReadFile(pipe, _buf, ol)
	#print(out[:20], file=sys.stderr)
