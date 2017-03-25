/**
 * class samplesAccumulator - Calculates the average, min and max of a stream of samples.
 *							When the method calcMean() is called those values are pushed to a buffer to be read.
 */
 
 function samplesAccumulator() {
	return {
		maxBufferLength: 20,
		buffer: [],
		sumSamples: 0,
		numSamples: 0,
		min: 10000000,
		max: -10000000,
		
		/** 
		 * addSample() - used to add a sample to the calculus.
		 */
		addSample: function(sample){
			this.sumSamples += sample;		// Sum the samples.
			if ( sample > this.max )		// Calculate the max and min.
				this.max = sample;
			if ( sample < this.min )
				this.min = sample;
			
			this.numSamples++;				// Count the number of samples to calculate the average.
		},
		
		/** 
		 * calcMean() - called to finish the calculus and push the results to the buffer.
		 */
		calcMean: function(){
			if ( this.numSamples == 0 )
				return 0;
			
			// Calculate the mean.
			var mean = this.sumSamples / this.numSamples;
			
			// Push the results to the buffer.
			this.buffer.push( {
				mean: mean,
				min: this.min,
				max: this.max
			});
			
			// If the length of the buffer is greater than the maximum buffer length, get rid of the first 
			// element.
			if ( this.buffer.length > this.maxBufferLength )
				this.buffer.shift();
			
			// Reset all the parameters.
			this.sumSamples = 0;
			this.numSamples = 0;
			this.min= 10000000;
			this.max= -10000000;
		},
		
		/**
		 * getSamples() - return the buffer.
		 */
		getSamples: function(){
			return this.buffer;
		}
	};
};