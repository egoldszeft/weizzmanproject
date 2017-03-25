/**
 *	class AudioControl - provides services for everything related to audio.
 */
function AudioControl( params ){
	var me = this;
	this.isPlaying = false;					// Is it playing or not.
	this.playMode = 'file';					// Play mode can be either 'file' or 'mic'.
	this.audioContext = new AudioContext(); // Initialize the audio context.
	this.lowPassFilter = null;				// Contains the Biquad filter.
	this.sourceNode = null;					// Source node.  Part of the audio pipe.
	this.samplesBuffer = null;				// Audio buffer that contains the samples.
	this.analyser = null;					// Analyser node that calculates the frequency chart.
	this.pitchesBuffer = new samplesAccumulator();  // Pitches accumulator.
	this.accumulationInterval = 500;		// Calculates the average of the pitches every half second. 
	this.pitch = 0;							// Current pitch
	this.highFreq = params.highFreq;		// The frequency that defines the lowpass filter.
	
	this.samplesBufLen = 1024;				// Number of the samples to be stored for the app to read.
	this.samplesBuf = new Float32Array( this.samplesBufLen ); // Buffer of samples.
	this.freqBins = null;					// Bins of frequencies.
		
	/**
	 * openFile(event) - Loads the file selected by the user and decodes the samples into the samples buffer.
	 */
	this.openFile = function( event ){
		var me = this;
		var input = event.target;
		
		// Initialize the file reader.
		var reader = new FileReader();
		
		// onload() is called as the data is read from the file.
		reader.onload = function(){
			var arraybuffer = reader.result;
			
			// Decode the audio data read from the file and store in the samples buffer.
			me.audioContext.decodeAudioData( arraybuffer, function(decoded) {
				me.samplesBuffer = decoded;
			});
		}
		
		// Read the file asynchronously in an ArrayBuffer.
		reader.readAsArrayBuffer(input.files[0]);
	};
	
	
	/**
	 * setupPipeline(source, connectOutput) - called whenever a new source is set up.  
	 */
	this.setupPipeline = function(source, connectOutput){
		// Use the source node
		var sourceNode = source;

		// Create a low pass filter and initialize its frequency according to the GUI.
		var lowPassFilter = me.audioContext.createBiquadFilter();
		lowPassFilter.type = "lowpass";
		lowPassFilter.frequency.value = me.highFreq;

		// Connect the source node's output to the low pass filter's input.
		sourceNode.connect(lowPassFilter);

		// Create an analyser node.  Connect the LPF's output to its input.
		var analyser = me.audioContext.createAnalyser();
		analyser.fftSize = 2048;
		lowPassFilter.connect(analyser);
		
		// Connect the analyser output to the destination (speakers, headphones, etc..).
		// In the case the source is the mic, then we want to avoid connecting the output, to avoid
		// positive feedback.
		if ( connectOutput )
			analyser.connect( me.audioContext.destination );
		
		// Store all the nodes for further handling.
		me.sourceNode = sourceNode;
		me.analyser = analyser;
		me.lowPassFilter = lowPassFilter;
	};
	
	/**
	 * updateLPFilter(freq) - sets the LPF's frequency.
	 */
	this.updateLPFilter = function( high ){
		me.highFreq = high;
		if ( me.lowPassFilter )
			me.lowPassFilter.frequency.value = me.highFreq;
	}
	
	/**
	 *	stopPlayback() - stops the stream of audio.
	 */
	this.stopPlayback = function(){
		if ( this.isPlaying ){
			
			// This is tricky as it's different between the case of reading from a file or a device (mic)
			if ( !( this.sourceNode instanceof MediaStreamAudioSourceNode ) )
				this.sourceNode.stop( 0 );
			else
				this.sourceNode.disconnect();
			
			// Release all the nodes
			this.sourceNode = null;
			this.analyser = null;
			this.lowPassFilter = null;
			
			// Set the mode as not playing.
			this.isPlaying = false;
			
			// Clear the pitch interval.  No calculus while the data doesn't flow.
			clearInterval( this.pitchInterval );
		}
	};
	
	/**
	 *	setPlayback() - Starts the stream of audio where the source is a file.
	 */
	this.setPlayback = function( onoff ){
		if (this.isPlaying){
			this.stopPlayback();
		}
		else{
			// Create the source node.
			var sourceNode = this.audioContext.createBufferSource();
			sourceNode.buffer = this.samplesBuffer;
			sourceNode.loop = true;
			
			// Setup the pipeline.  Request to connect the output (speakers).
			this.setupPipeline(sourceNode, true);
			
			// Start the stream.
			this.sourceNode.start(0);

			// Set the mode to be "playing".
			this.isPlaying = true;

			// Every half a second, calculate the mean pitch.
			var me = this;
			this.pitchInterval = setInterval( function() {
				me.pitchesBuffer.calcMean();
			}, this.accumulationInterval);
		}
	};
	
	/**
	 *	getUserMedia() - Asks permision to use the microphone.
	 */
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

	/** 
	 * gotStream() - Creates the MediaStreamSource out of the stream coming from the microphone.
	 */
	this.gotStream = function(stream) {
		// Create an AudioNode from the stream.
		me.mediaStreamSource = me.audioContext.createMediaStreamSource(stream);

		// Setup the pipe without connecting the output.
		me.setupPipeline(me.mediaStreamSource, false);
	};

	/**
	 * setLiveInput() - Called to start reading samples from the mic.
	 */
	this.setLiveInput = function() {
		if (this.isPlaying) {
			this.stopPlayback();
			return "Mic";
		}
		
		// Set the mode to be "playing".
		this.isPlaying = true;
		
		// Ask for a connection to the mic and if the browser allows it, create the source node.
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
			
		// Calculate the average of the pitches every half second.
		var me = this;
		this.pitchInterval = setInterval( function(){
			me.pitchesBuffer.calcMean();
		}, this.accumulationInterval);
		
		return "Stop";
	};
	
	/**
	 * update() - Called right before the render. to to read the samples and 
	 *				calculate the current pitch.
	 */
	this.update = function(){
		if ( !this.analyser )
			return false;
		
		// Get the samples 
		this.analyser.getFloatTimeDomainData(this.samplesBuf);
		
		// Calculate the pitch.
		this.pitch = this.calcPitch( this.samplesBuf, this.audioContext.sampleRate );
		
		// Add the current pitch in the accumulator.
		this.pitchesBuffer.addSample( this.pitch );
		
		return true;
	};
	
	/**
	 * getSamples() - Returns the audio samples buffer.
	 */
	this.getSamples = function(){
		return this.samplesBuf;
	};

	/**
	 * getFrequencyBins() - Returns a buffer with the frequencies.
	 */	
	this.getFrequencyBins = function(){
		if ( this.freqBins == null )
			this.freqBins = new Uint8Array(this.analyser.frequencyBinCount);
		this.analyser.getByteFrequencyData(this.freqBins);
		return this.freqBins;
	};
	
	/**
	 * getPitchesBuffer() - Returns a buffer with the accumulated pitches.
	 */	
	this.getPitchesBuffer = function() {
		var samples = this.pitchesBuffer.getSamples();
		return samples;
	};
	
	/** 
	 * getCurrentPitch() - returns the current pitch.
	 */
	this.getCurrentPitch = function(){
		return this.pitch;
	};
	
	/** 
	 * calcPitch() - calculates the current pitch.
	 */
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

		// Calculate the Root Mean Square 
		for (var i=0;i<SIZE;i++) {
			var val = buf[i];
			rms += val*val;
		}
		rms = Math.sqrt(rms/SIZE);
		
		// If we have "silence", return -1.
		if (rms<0.01) 
			return -1;

		// We take a window of half the buffer, slide the window and make an autocorrelation.
		var lastCorrelation=1;
		for (var offset = MIN_SAMPLES; offset < MAX_SAMPLES; offset++) {
			var correlation = 0;

			// Calculate the correlation between the signal with itself, shifted by 'offset'.
			for (var i=0; i<MAX_SAMPLES; i++) {
				correlation += Math.abs((buf[i])-(buf[i+offset]));
			}
			correlation = 1 - (correlation/MAX_SAMPLES);
			correlations[offset] = correlation; // store it, for the tweaking we need to do below.
			
			// If the correlation is above 90% and it's better than the last correlation, keep the
			// result and the offset.
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