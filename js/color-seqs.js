var cent_index = 5;

colorTags = {
	".":"aa-any","X":"aa-any",
	"R":"aa-basic", "K":"aa-basic", "H":"aa-basic",
	"N":"aa-neutral", "Q":"aa-neutral", 
	"D":"aa-acidic", "E":"aa-acidic",
	"G":"aa-polar", "S":"aa-polar", "T":"aa-polar", "Y":"aa-polar", "C":"aa-polar",
	"P":"aa-hphobic", "A":"aa-hphobic", "W":"aa-hphobic", "F":"aa-hphobic", "L":"aa-hphobic", "I":"aa-hphobic", "M":"aa-hphobic", "V":"aa-hphobic"
}


String.prototype.replaceAt=function(index, character) {
    return this.substr(0, index) + character + this.substr(index+1);
}

function sortTogether(array1, array2) {
    var merged = [];
    for(var i=0; i<array1.length; i++) { merged.push({'a1': array1[i], 'a2': array2[i]}); }
    merged.sort(function(o1, o2) { return ((o1.a1 < o2.a1) ? -1 : ((o1.a1 == o2.a1) ? 0 : 1)); });
    for(var i=0; i<merged.length; i++) { array1[i] = merged[i].a1; array2[i] = merged[i].a2; }
    return {'motifs_pos':array1, 'motifs_char':array2}
}



function motifsPositionAndChar() {
	// Get vector of motifs
	motifs = []
	for(var i = 0; i<motif_data.length; i++) motifs.push(motif_data[i].motif);
	
	// Positions and corresponding char of motif amino acids 
	motifs_pos = []
	motifs_char = []

	added_central = false;
	// For each motif
	jQuery.each( motifs, function( i, val ) {

		// Replace anything central
	  	val = val.replace("[ST]", "@");
	  	val = val.replaceAt(cent_index, "@");

		for(var j = 0; j < val.length; j++){
			// Get character at position j
			var c = val.charAt(j);
			if(c != "."){
				if(c == "@" & added_central) continue;
				motifs_pos.push(j);
				motifs_char.push(c);
				if(c == "@") added_central = true;
			}
		}

	});

	return sortTogether(motifs_pos, motifs_char);
}


function colorSequence(seq, position_and_char) {

	motifs_pos = position_and_char.motifs_pos
	motifs_char = position_and_char.motifs_char

	// Replace central stuff so doesnt mess with index
	seq = seq.replace("[ST]", "$");

	// String we're going to color
	seq_color = seq

	// Offset for color
	offset = 0;

	lens = motifs_pos.length || 0
	// For each motif position
	for (var i = 0; i < lens; i++) {
		// Current index
		curr_index = i 

		// Position of aa in motif and corresponding char
		curr_pos = motifs_pos[curr_index];
		curr_char = motifs_char[curr_index];
		
		// Index of amino acid in color string
		color_index = curr_pos + offset;
		c = seq_color.charAt(color_index);

		// If matches
		if(c == curr_char | curr_pos == cent_index){
			//tag = '<span class="' + colorTags[c] + '">' + c + '</span>'; 
	    	tag = sprintf('<span class=%s>%s</span>', colorTags[c], c)
	    	seq_color = seq_color.replaceAt(color_index, tag);
	    	offset += tag.length-1;
		}

	    
	}
	seq_color = seq_color.replace("$", '[<span class="aa-polar">ST</span>]');
	return seq_color;
}
