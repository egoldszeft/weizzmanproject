function samplesAccumulator() {
	return {
		maxBufferLength: 20,
		buffer: [],
		sumSamples: 0,
		numSamples: 0,
		
		addSample: function(sample){
			this.sumSamples += sample;
			this.numSamples++;
		},
		
		calcMean: function(){
			if ( this.numSamples == 0 )
				return 0;
			
			var mean = this.sumSamples / this.numSamples;
			this.buffer.push(mean);
			if ( this.buffer.length > this.maxBufferLength )
				this.buffer.shift();
			
			this.sumSamples = 0;
			this.numSamples = 0;
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