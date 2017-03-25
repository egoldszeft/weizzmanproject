var app = null;

function Application(){
	var me = this;
	this.audioControl = new AudioControl();	
	this.mode = "file";
	
	this.graphs = [];	
	this.graphs.push( new WaveformGraph('wfGraph') );
	this.graphs.push( new FrequencyGraph('freqGraph') );
	this.graphs.push( new PitchGraph('pitchGraph') );
	
	this.updateVisuals = function(){
		var audioControl = me.audioControl;
		if ( audioControl.update() ){
			me.graphs.forEach( function(graph) {
				graph.draw(audioControl);
			});
			document.getElementById("pitchValue").innerText = Math.round(audioControl.getCurrentPitch()).toString();
		}
		me.rafID = window.requestAnimationFrame( me.updateVisuals );
	};
	
	this.toggleMode = function(mode){
		this.mode = mode;
		if ( mode == 'file' )
			document.getElementById('fileChooser').style.visibility = 'visible';
		else
			document.getElementById('fileChooser').style.visibility = 'hidden';
	}
	
	this.play = function(){
		if ( this.mode == 'file' )
			this.audioControl.setPlayback();
		else
			this.audioControl.setLiveInput();
		this.updateVisuals();
	};
	
	this.stop = function(){
		this.audioControl.stopPlayback();
		if ( !window.cancelAnimationFrame )
		window.cancelAnimationFrame( this.rafID );

	};
	
	this.openFile = function( event ){
		this.audioControl.openFile(event);
	};
};

window.onload = function(){
	app = new Application(window);
	window.AudioContext = window.AudioContext || windows.webkitAudioContext;
	window.requestAnimationFrame = window.requestAnimationFrame|| window.webkitRequestAnimationFrame;
	window.cancelAnimationFrame = window.cancelAnimationFrame || window.webkitCancelAnimationFrame;

};