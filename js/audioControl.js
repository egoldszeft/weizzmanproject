function AudioControl( params ){
	var me = this;
	this.isPlaying = null;
	this.playMode = null;
	this.audioContext = new AudioContext();
	this.lowPassFilter = null;
	this.highPassFilter = null;
	this.sourceNode = null;
	this.samplesBuffer = null;
	this.analyser = null;
	this.rafID = null;
	this.pitchesBuffer = new samplesAccumulator();
	this.accumulationInterval = 500;
	this.pitch = 0;
	this.highFreq = params.highFreq;
	
	this.samplesBufLen = 1024;
	this.samplesBuf = new Float32Array( this.samplesBufLen );
	this.freqBins = null;
		
	this.openFile = function( event ){
		var me = this;
		var input = event.target;
		var reader = new FileReader();
		reader.onload = function(){
			var arraybuffer = reader.result;
			me.audioContext.decodeAudioData( arraybuffer, function(decoded) {
				me.samplesBuffer = decoded;
//				me.stopPlayback();
//				me.setPlayback(true);
			});
		}
		reader.readAsArrayBuffer(input.files[0]);
	};
	
	this.setupPipeline = function(source, connectOutput){
		var sourceNode = source;

		var lowPassFilter = me.audioContext.createBiquadFilter();
		lowPassFilter.type = "lowpass";
		lowPassFilter.frequency.value = me.highFreq;
		sourceNode.disconnect();
		sourceNode.connect(lowPassFilter);

		var analyser = me.audioContext.createAnalyser();
		analyser.fftSize = 2048;
		lowPassFilter.connect(analyser);
		
		if ( connectOutput )
			analyser.connect( me.audioContext.destination );
		
		me.sourceNode = sourceNode;
		me.analyser = analyser;
		me.lowPassFilter = lowPassFilter;
	};
	
	this.updateLPFilter = function( high ){
		me.highFreq = high;
		if ( me.lowPassFilter )
			me.lowPassFilter.frequency.value = me.highFreq;
	}
	
	this.stopPlayback = function(){
		if ( this.isPlaying ){
			if ( !( this.sourceNode instanceof MediaStreamAudioSourceNode ) )
				this.sourceNode.stop( 0 );
			else
				this.sourceNode.disconnect();
			
			this.sourceNode = null;
			this.analyser = null;
			this.highPassFilter = null;
			this.lowPassFilter = null;
			this.isPlaying = false;
			clearInterval( this.pitchInterval );
		}
	};
	
	this.setPlayback = function( onoff ){
		if (this.isPlaying){
			this.stopPlayback();
		}
		else{
			var sourceNode = this.audioContext.createBufferSource();
			sourceNode.buffer = this.samplesBuffer;
			sourceNode.loop = true;
			
			this.setupPipeline(sourceNode, true);
			this.sourceNode.start(0);

			this.isPlaying = true;

			var me = this;
			this.pitchInterval = setInterval( function() {
				me.pitchesBuffer.calcMean();
			}, this.accumulationInterval);
		}
	};
	
	this.getUserMedia = function(dictionary, callback) {
		try {
			navigator.getUserMedia = 
				navigator.getUserMedia ||
				navigator.webkitGetUserMedia ||
				navigator.mozGetUserMedia;
			navigator.getUserMedia(dictionary, callback, ()=>{ 
				alert('Failed to generate a stream.'); 
				});
		} catch (e) {
			alert('getUserMedia threw exception :' + e);
		}
	};

	this.gotStream = function(stream) {
		// Create an AudioNode from the stream.
		me.mediaStreamSource = me.audioContext.createMediaStreamSource(stream);

		// Connect it to the destination.
		me.setupPipeline(me.mediaStreamSource, false);
	};

	this.setLiveInput = function() {
		if (this.isPlaying) {
			this.stopPlayback();
			return "Mic";
		}
		this.isPlaying = true;
		this.getUserMedia(
			{
				"audio": {
					"mandatory": {
						"googEchoCancellation": "false",
						"googAutoGainControl": "false",
						"googNoiseSuppression": "false",
						"googHighpassFilter": "false"
					},
					"optional": []
				},
			}, this.gotStream);
			
		var me = this;
		this.pitchInterval = setInterval( function(){
			me.pitchesBuffer.calcMean();
		}, this.accumulationInterval);
		
		return "Stop";
	};
	
	this.update = function(){
		if ( !this.analyser )
			return false;
		this.analyser.getFloatTimeDomainData(this.samplesBuf);
		
		this.pitch = this.calcPitch( this.samplesBuf, this.audioContext.sampleRate );
		this.pitchesBuffer.addSample( this.pitch );
		
		return true;
	};
	
	this.getSamples = function(){
		return this.samplesBuf;
	};
	
	this.getFrequencyBins = function(){
		if ( this.freqBins == null )
			this.freqBins = new Uint8Array(this.analyser.frequencyBinCount);
		this.analyser.getByteFrequencyData(this.freqBins);
		return this.freqBins;
	};
	
	this.getPitchesBuffer = function() {
		var samples = this.pitchesBuffer.getSamples();
		return samples;
	};
	
	this.getCurrentPitch = function(){
		return this.pitch;
	};
	
	this.calcPitch = function( buf, sampleRate ) {
		var MIN_SAMPLES = 0;  // will be initialized when AudioContext is created.
		var GOOD_ENOUGH_CORRELATION = 0.9; // this is the "bar" for how close a correlation 
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
	};
};