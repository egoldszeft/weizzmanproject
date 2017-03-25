/**
 * class Graph(element) - receives the id of an element in the HTML file. Used as base class of all the graphs classes. 
 */
 
function Graph( element ){
	
	// Stores the element and canvas in which the graph ought to be drawn.
	this.element = document.getElementById(element);
	this.canvas = this.element.getContext('2d');
	
	// Dummy method to be overriden by the subclasses.
	this.draw = function(audioController){
		console.log("Graph.draw(): Not implemented.");
	};
};

/**
 * class WaveformGraph - Subclass of Graph that renders a waveform.
 */
 
function WaveformGraph( element ){
	var me = this;
	
	// Subclass from Graph.
	this.base = Graph;
	
	// Call Graph's constructor.
	this.base(element);
	
	// draw() - method that gets the samples from the audio control and draws the waveform.
	this.draw = function(audioController){
		
		// Get the samples.
		var buf = audioController.getSamples();
		var len = buf.length;
		
		// Get the actual size of the HTML element.
		var canvas = me.canvas;
		var width = me.element.offsetWidth;
		var height = me.element.offsetHeight;
		
		// Render the graph based on the width and the height.
		canvas.clearRect(0,0,width,height);
		canvas.strokeStyle = "red";
		canvas.beginPath();
		canvas.moveTo(0, height/2);
		canvas.lineTo(width, height/2);
		canvas.moveTo(0,0);
		canvas.lineTo(0,height);
		canvas.moveTo(width/4,0);
		canvas.lineTo(width/4,height);
		canvas.moveTo(width/2,0);
		canvas.lineTo(width/2,height);
		canvas.moveTo(width*3/4,0);
		canvas.lineTo(width*3/4,height)	;
		canvas.moveTo(width-1,0);
		canvas.lineTo(width-1,height);
		canvas.stroke();
		canvas.strokeStyle = "black";
		canvas.beginPath();
		canvas.moveTo(0,buf[0]);
		
		var dx = 0.0 + width/len;
		var x = 1.0;
		for (var i=1;i<len;i++) {
			canvas.lineTo(x,(1-buf[i])*height/2);
			x += dx;
		}
		canvas.stroke();	
	};
};

/**
 * class FrequencyGraph - Subclass of Graph that renders a frequency representation of the signal.
 */
function FrequencyGraph( element ){
	var me = this;
	
	// Subclass from Graph and call its constructor.
	this.base = Graph;
	this.base(element);

	// draw() - renders the graph.
	this.draw = function(audioController){
		
		// Get the frequency data.
		var data = audioController.getFrequencyBins();
		var binsCount = data.length;
		
		// Get the size of the canvas to draw.
		var canvas = me.canvas;
		var width = me.element.offsetWidth;
		var height = me.element.offsetHeight;
		
		// Set the bar width to 10 pixels.
		var barWidth = 10;
		
		// Calculate the number of bars.
		var numBars = Math.round(width/barWidth);
		
		// Multiplier is the ratio between the number of bins and the number of bars.
		// It's used to calculate the position of the bars.
		var multiplier = binsCount / numBars;
		
		// Clear the canvas.
		canvas.clearRect(0,0,width,height);
		canvas.fillStyle = '#F6D565';
		canvas.lineCap = 'round';
		
		// Draw the bars.
		for (var i = 0; i < numBars; ++i) {
			var magnitude = 0;
			
			// Calculate the position of the bar.
			var offset = Math.floor( i * multiplier );
			
			// gotta sum/average the block, or we miss narrow-bandwidth spikes
			for (var j = 0; j< multiplier; j++)
				magnitude += data[offset + j];
			magnitude = magnitude / multiplier;
			
			// Draw the bar.
			canvas.fillStyle = "hsl( " + Math.round((i*360)/numBars) + ", 100%, 50%)";
			canvas.fillRect(i * barWidth, height, barWidth, -magnitude);
		}
	};
};

/**
 * class PitchGraph - Subclass of Graph that renders a temporal representation of the pitch.
 */

function PitchGraph( element ){
	var me = this;
	
	// Subclass from Graph and call its constructor.
	this.base = Graph;
	this.base(element);
	
	// draw() - Renders a series of horizontal lines representing the average of the pitches and a bounding box of all the pitches in the period.
	this.draw = function(audioController){
		
		// Get the actual size of the canvas.
		var width = me.element.offsetWidth;
		var height = me.element.offsetHeight;
		var canvas = me.canvas;
		var maxHz = 3000;
		
		// Read the pitches in a buffer.
		var buf = audioController.getPitchesBuffer();
		var len = buf.length;
		
		// Clear the canvas and draw axes.
		canvas.clearRect(0,0,width,height);
		canvas.strokeStyle = "red";
		canvas.beginPath();
		canvas.moveTo(0, 0);
		canvas.lineTo(0, height);
		canvas.moveTo(0, height);
		canvas.lineTo(width, height);
		canvas.strokeStyle = "black";
		canvas.fillStyle = '#F6D565';
		canvas.stroke();	

		// Draw the lines and the boxes.
		canvas.beginPath();
		
		// dx is the distance from one period to the other.
		var dx = 0.0 + width/len;
		var x = 1.0;
		for (var i=0;i<len;i++) {
			var val = (maxHz-buf[i].mean)/maxHz*height;
			var min = (maxHz-buf[i].min)/maxHz*height;
			var max = (maxHz-buf[i].max)/maxHz*height;
			
			// Draw the line representing the average of the pitch in the period of time.
			canvas.moveTo(x, val);
			canvas.lineTo(x+dx,val);
			
			// Draw a box defined by the minimum and the maximum pitches.
			canvas.fillRect(x, min, dx, max-min);
			
			// Advance x by dx.
			x += dx;
		}
		canvas.stroke();	
	};
};