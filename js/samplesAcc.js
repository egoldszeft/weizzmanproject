function samplesAccumulator() {
	return {
		maxBufferLength: 20,
		buffer: [],
		sumSamples: 0,
		numSamples: 0,
		min: 10000000,
		max: -10000000,
		
		addSample: function(sample){
			this.sumSamples += sample;
			if ( sample > this.max )
				this.max = sample;
			if ( sample < this.min )
				this.min = sample;
			
			this.numSamples++;
		},
		
		calcMean: function(){
			if ( this.numSamples == 0 )
				return 0;
			
			var mean = this.sumSamples / this.numSamples;
			this.buffer.push( {
				mean: mean,
				min: this.min,
				max: this.max
			});
			if ( this.buffer.length > this.maxBufferLength )
				this.buffer.shift();
			
			this.sumSamples = 0;
			this.numSamples = 0;
			this.min= 10000000;
			this.max= -10000000;
		},
		
		getSamples: function(){
			return this.buffer;
		},
		
		setMaxSamples: function(n){
			this.maxSamples = n;
			this.sumSamples = 0; 
			this.numSamples = 0;
		}
	};
};