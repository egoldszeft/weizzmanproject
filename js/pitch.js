var audioContext = null;
var isPlaying = false;
var sourceNode = null;
var samplesBuffer = null;
var analyser;
var waveCanvas;
var waveElem;
var rafID;

window.AudioContext = window.AudioContext || window.webkitAudioContext;

window.onload = function(){
	audioContext = new AudioContext();
	var request = new XMLHttpRequest();
	request.open("GET", "./sounds/testSound.wav", true);
	request.responseType = "arraybuffer";
	request.onload = function(){
		audioContext.decodeAudioData( request.response, function(buffer) { 
	    	samplesBuffer = buffer;
		});
	}
	request.send();
	
	waveElem = document.getElementById('wfGraph');
	waveCanvas = waveElem.getContext('2d');
}

function setPlayback( onoff ){
	if ( isPlaying ){
		sourceNode.stop( 0 );
		sourceNode = null;
		analyser = null;
		isPlaying = false;
		if ( !window.cancelAnimationFrame )
			window.cancelAnimationFrame = window.webkitCancelAnimationFrame;
        window.cancelAnimationFrame( rafID );
        return "start";
		
	}
	
	sourceNode = audioContext.createBufferSource();
	sourceNode.buffer = samplesBuffer;
	sourceNode.loop = true;
	
	analyser = audioContext.createAnalyser();
	analyser.fftSize = 2048;
	sourceNode.connect( analyser );
	analyser.connect( audioContext.destination );
	sourceNode.start( 0 );
	isPlaying = true;
	updateVisuals();
	return "stop";
}

var bufLen = 1024;
var buf = new Float32Array( bufLen );

function updateVisuals( time ){
	analyser.getFloatTimeDomainData(buf);
	
	drawWaveform( waveElem, waveCanvas, buf, bufLen );
	if (!window.requestAnimationFrame)
		window.requestAnimationFrame = window.webkitRequestAnimationFrame;
	rafID = window.requestAnimationFrame( updateVisuals );

}

function drawWaveform( elem, waveCanvas, buf, len ){
	var width = elem.offsetWidth;
	var height = elem.offsetHeight;
	
	waveCanvas.clearRect(0,0,width,height);
	waveCanvas.strokeStyle = "red";
	waveCanvas.beginPath();
	waveCanvas.moveTo(0, height/2);
	waveCanvas.lineTo(width, height/2);
	waveCanvas.moveTo(0,0);
	waveCanvas.lineTo(0,height);
	waveCanvas.moveTo(width/4,0);
	waveCanvas.lineTo(width/4,height);
	waveCanvas.moveTo(width/2,0);
	waveCanvas.lineTo(width/2,height);
	waveCanvas.moveTo(width*3/4,0);
	waveCanvas.lineTo(width*3/4,height)	;
	waveCanvas.moveTo(width-1,0);
	waveCanvas.lineTo(width-1,height);
	waveCanvas.stroke();
	waveCanvas.strokeStyle = "black";
	waveCanvas.beginPath();
	waveCanvas.moveTo(0,buf[0]);
	
	var dx = 0.0 + width/len;
	var x = 1.0;
	for (var i=1;i<len;i++) {
		waveCanvas.lineTo(x,(1-buf[i])*height/2);
		x += dx;
	}
	waveCanvas.stroke();	
}