function Graph( element ){
	this.element = document.getElementById(element);
	this.canvas = this.element.getContext('2d');
	
	this.draw = function(audioController){
		console.log("Graph.draw(): Not implemented.");
	};
};

function WaveformGraph( element ){
	var me = this;
	this.base = Graph;
	this.base(element);
	
	this.draw = function(audioController){
		var buf = audioController.getSamples();
		var len = buf.length;
		var canvas = me.canvas;
		var width = me.element.offsetWidth;
		var height = me.element.offsetHeight;
		
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

function FrequencyGraph( element ){
	var me = this;
	this.base = Graph;
	this.base(element);

	this.draw = function(audioController){
		var data = audioController.getFrequencyBins();
		var binsCount = data.length;
		var canvas = me.canvas;
		var width = me.element.offsetWidth;
		var height = me.element.offsetHeight;
		var barWidth = 10;
		var numBars = Math.round(width/barWidth);
		var multiplier = binsCount / numBars;
		
		canvas.clearRect(0,0,width,height);
		canvas.fillStyle = '#F6D565';
		canvas.lineCap = 'round';
		
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
	};
};

function PitchGraph( element ){
	var me = this;
	this.base = Graph;
	this.base(element);
	
	this.draw = function(audioController){
		var width = me.element.offsetWidth;
		var height = me.element.offsetHeight;
		var canvas = me.canvas;
		var maxHz = 3000;
		var buf = audioController.getPitchesBuffer();
		var len = buf.length;
		
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

		canvas.beginPath();
		
		var dx = 0.0 + width/len;
		var x = 1.0;
		for (var i=0;i<len;i++) {
			var val = (maxHz-buf[i].mean)/maxHz*height
			var min = (maxHz-buf[i].min)/maxHz*height
			var max = (maxHz-buf[i].max)/maxHz*height
			canvas.moveTo(x, val);
			canvas.lineTo(x+dx,val);
			
			canvas.fillRect(x, min, dx, max-min);
			
			x += dx;
		}
		canvas.stroke();	
	};
};