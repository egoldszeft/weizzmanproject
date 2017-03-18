var audioContext = null;
var isPlaying = false;
var sourceNode = null;
var samplesBuffer = null;
var analyser;
var waveCanvas;
var waveElem;
var pitchCanvas;
var pitchElem;
var pitchValue;
var freqElem;
var freqCanvas;
var rafID;
var pitchesBuffer = null;
var pitchInterval = null;

window.AudioContext = window.AudioContext || window.webkitAudioContext;

window.onload = function(){
	
	audioContext = new AudioContext();
	var request = new XMLHttpRequest();
//	request.open("GET", "./sounds/testSound.wav", true);
	request.open("GET", "./sounds/Scala.m4a", true);
	request.responseType = "arraybuffer";
	request.onload = function(){
		audioContext.decodeAudioData( request.response, function(buffer) { 
	    	samplesBuffer = buffer;
		});
	}
	request.send();
	
	waveElem = document.getElementById('wfGraph');
	waveCanvas = waveElem.getContext('2d');

	pitchElem = document.getElementById('pitchGraph');
	pitchCanvas = pitchElem.getContext('2d');
	pitchValue = document.getElementById("pitchValue");

	freqElem = document.getElementById('freqGraph');
	freqCanvas = freqElem.getContext('2d');

	pitchesBuffer = new samplesAccumulator();
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
		clearInterval();
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

	setInterval( ()=>{
		pitchesBuffer.calcMean();
	}, 1000);
	
	return "stop";
}

var bufLen = 1024;
var buf = new Float32Array( bufLen );

function updateVisuals( time ){
	analyser.getFloatTimeDomainData(buf);
	
	drawWaveform( waveElem, waveCanvas, buf, bufLen );
	
	var samples = pitchesBuffer.getSamples();
	drawPitchGraph( pitchElem, pitchCanvas, samples, samples.length );
	
	var pitch = calcPitch(buf, audioContext.sampleRate);
	pitchValue.innerText = Math.floor(pitch).toString();
	pitchesBuffer.addSample( pitch );
	
	drawFrequency( freqElem, freqCanvas );
	
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

function drawFrequency( elem, canvas ){
	var width = elem.offsetWidth;
	var height = elem.offsetHeight;
	var barWidth = 10;
	var numBars = Math.round(width/barWidth);
	var data = new Uint8Array(analyser.frequencyBinCount);
	
	analyser.getByteFrequencyData(data);
	
	canvas.clearRect(0,0,width,height);
  	canvas.fillStyle = '#F6D565';
  	canvas.lineCap = 'round';
	var multiplier = analyser.frequencyBinCount / numBars;
	
	for (var i = 0; i < numBars; ++i) {
		var magnitude = 0;
		var offset = Math.floor( i * multiplier );
		// gotta sum/average the block, or we miss narrow-bandwidth spikes
		for (var j = 0; j< multiplier; j++)
			magnitude += data[offset + j];
		magnitude = magnitude / multiplier;
		var magnitude2 = data[i * multiplier];
    	canvas.fillStyle = "hsl( " + Math.round((i*360)/numBars) + ", 100%, 50%)";
    	canvas.fillRect(i * barWidth, height, barWidth, -magnitude);
	}
}

function drawPitchGraph( elem, canvas, buf, len ){
	var width = elem.offsetWidth;
	var height = elem.offsetHeight;
	var maxHz = 5000;
	
	canvas.clearRect(0,0,width,height);
	canvas.strokeStyle = "red";
	canvas.beginPath();
	canvas.moveTo(0, 0);
	canvas.lineTo(0, height);
	canvas.moveTo(0, height);
	canvas.lineTo(width, height);
	canvas.strokeStyle = "black";
	canvas.stroke();	

	canvas.beginPath();
	
	var dx = 0.0 + width/len;
	var x = 1.0;
	for (var i=0;i<len;i++) {
		var val = (maxHz-buf[i])/maxHz*height
		canvas.moveTo(x, val);
		canvas.lineTo(x+dx,val);
		x += dx;
	}
	canvas.stroke();	
}

var MIN_SAMPLES = 0;  // will be initialized when AudioContext is created.
var GOOD_ENOUGH_CORRELATION = 0.9; // this is the "bar" for how close a correlation needs to be

function calcPitch( buf, sampleRate ) {
	var SIZE = buf.length;
	var MAX_SAMPLES = Math.floor(SIZE/2);
	var best_offset = -1;
	var best_correlation = 0;
	var rms = 0;
	var foundGoodCorrelation = false;
	var correlations = new Array(MAX_SAMPLES);

	for (var i=0;i<SIZE;i++) {
		var val = buf[i];
		rms += val*val;
	}
	rms = Math.sqrt(rms/SIZE);
	if (rms<0.01) 
		return -1;

	var lastCorrelation=1;
	for (var offset = MIN_SAMPLES; offset < MAX_SAMPLES; offset++) {
		var correlation = 0;

		for (var i=0; i<MAX_SAMPLES; i++) {
			correlation += Math.abs((buf[i])-(buf[i+offset]));
		}
		correlation = 1 - (correlation/MAX_SAMPLES);
		correlations[offset] = correlation; // store it, for the tweaking we need to do below.
		if ((correlation>GOOD_ENOUGH_CORRELATION) && (correlation > lastCorrelation)) {
			foundGoodCorrelation = true;
			if (correlation > best_correlation) {
				best_correlation = correlation;
				best_offset = offset;
			}
		} else if (foundGoodCorrelation) {
			var shift = (correlations[best_offset+1] - correlations[best_offset-1])/correlations[best_offset];  
			return sampleRate/(best_offset+(8*shift));
		}
		lastCorrelation = correlation;
	}
	if (best_correlation > 0.01) {
		// console.log("f = " + sampleRate/best_offset + "Hz (rms: " + rms + " confidence: " + best_correlation + ")")
		return sampleRate/best_offset;
	}
	return -1;
}
