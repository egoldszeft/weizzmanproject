/**
 * app - object of type Application that handles all the events from the DOM and controls the audio controller.
 * 		Aditionally, it controls the drawing of the graphs.
 **/
var app = null;	

/**
 * class Application - Links between the DOM, the audio controller and the graph drawing.
 */
 
function Application(){
	var me = this;		// Helps in cases the 'this' is not our object.
	
	// Prepare the parameters to initialize the audio control object.
	var params = {};
	params.highFreq = parseFloat(document.getElementById("lowPass").value);
	
	// Create the audioControl 
	this.audioControl = new AudioControl(params);	

	// Initialy the mode is 'file'
	this.mode = "file";
	
	// Define an array of graphs.
	this.graphs = [];	
	this.graphs.push( new WaveformGraph('wfGraph') );		// Add the waveform graph.
	this.graphs.push( new FrequencyGraph('freqGraph') );	// Add the frequency domain graph.
	this.graphs.push( new PitchGraph('pitchGraph') );		// Add the pitches graph.
	
	/**
	 * updateVisuals() - Called to update the application.  Updates the audio control and renders the graphs.
	 */
	this.updateVisuals = function(){
		var audioControl = me.audioControl;
		
		// Update the audioControl.  This returns 'true' in case there's a need to refresh the graphs.
		if ( audioControl.update() ){
			
			// Loop around the graphs array and draw each one of the graphs.
			me.graphs.forEach( function(graph) {
				graph.draw(audioControl);
			});
			
			// Get the current pitch from the audio controller and refresh the number in the DOM.
			document.getElementById("pitchValue").innerText = Math.round(audioControl.getCurrentPitch()).toString();
		}
		
		// Request the DOM to call updateVisuals() again in the next animation frame.
		me.rafID = window.requestAnimationFrame( me.updateVisuals );
	};
	
	/**
	 * toggleMode(mode) - sets the mode to either 'file' or 'mic' and show or hide the file chooser accordingly.
	 */
	this.toggleMode = function(mode){
		this.mode = mode;
		if ( mode == 'file' )
			document.getElementById('fileChooser').style.visibility = 'visible';
		else
			document.getElementById('fileChooser').style.visibility = 'hidden';
	}
	
	/**
	 * play() - Starts the audio stream.
	 */
	this.play = function(){
		// Must choose to run the playback or the live input (mic).
		if ( this.mode == 'file' )
			this.audioControl.setPlayback();
		else
			this.audioControl.setLiveInput();
		
		// Start the update process.
		this.updateVisuals();
	};
	
	/**
	 * stop() - stops the audio stream and the update process.
	 */
	this.stop = function(){
		this.audioControl.stopPlayback();
		if ( !window.cancelAnimationFrame )
			window.cancelAnimationFrame( this.rafID );
	};
	
	/**
	 * openFile(event) - Handles the open file event.
	 */
	this.openFile = function( event ){
		this.audioControl.openFile(event);
	};
	
	/**
	 * updateHPFilter(event) - Sets the frequency of the high pass filter.
	 */
	this.updateHPFilter = function(event){
		var value = event.target.value;
		me.audioControl.updateHPFilter(value);
		
		document.getElementById('highPass').value = value;
		document.getElementById('highPassText').value = value;
	};

	/**
	 * updateHPFilter(event) - Sets the frequency of the high pass filter.
	 */
	this.updateLPFilter = function(event){
		var value = event.target.value;
		me.audioControl.updateLPFilter(value);
		
		document.getElementById('lowPass').value = value;
		document.getElementById('lowPassText').value = value;
	};
	
	/**
	 * initFilters() - Initialize the frequency of the filters according to the values in the GUI.
	 */
	this.initFilters = function(){
		var low = parseFloat(document.getElementById('lowPass').value);
		me.audioControl.updateLPFilter(low);
	};
	
	// Invoke the initFilters() method to initialize the filters at the end of the constructor.
	this.initFilters();
};


// window.onload() is called right after the window is fully loaded.
 
window.onload = function(){
	
	// Create the application object.
	app = new Application(window);
	
	// These are to overcome browser incompatibility issues.
	window.AudioContext = window.AudioContext || windows.webkitAudioContext;
	window.requestAnimationFrame = window.requestAnimationFrame|| window.webkitRequestAnimationFrame;
	window.cancelAnimationFrame = window.cancelAnimationFrame || window.webkitCancelAnimationFrame;

};