

PRED_BASE = "data/predictions"
PRED_NAME = "";

var motif_data = [];
var site_data = [];

var tables_styled = false;
//******************************
// Bootstrap style after drawing tables
//******************************
var processingComplete = function(){
      if(!tables_styled){
      	  search_bar = $('.dynatable-search input');
	      search_bar.addClass("form-control search-table");
	      search_bar.attr("placeholder", "Search...");
	      search_bar.parent().contents().filter(function(){ return this.nodeType != 1; }).remove();

	      pagination_label = $('.dynatable-pagination-links li:first-child');
	      pagination_label.hide();

	      dropdown = $('.dynatable-per-page-select');
	      dropdown.addClass('form-control input-md')
	        .wrap('<div class="form-group">').wrap('<form class="form-inline">');

	      dropdown = $('.dynatable-per-page-select');
	      dropdown.siblings('label').remove();
	      dropdown.before('<label for="dummy">Show:&nbsp;</label>');

	      dropdown_label = $('.dynatable-per-page-label')
	      dropdown_label.hide();
	      tables_styled = true;
      }
};


$(function() {

	//******************************
	// Menu navigation clicks
	//******************************
	$('.nav-pills li').click(function(){
		
		$("div[class*='menu-content-']").addClass('hide');
		$("." + $(this).attr('content')).removeClass('hide');

		$('.nav-pills li').removeClass('active');
		$(this).addClass('active');

		document.title = "kinpred dummy |" + $(this).text();

		if(PRED_NAME == "") $('#prediction-display').addClass('hide');

	});
	$('.nav-pills li.active').click();

	//******************************
	// Left and right navigation for sites table
	//******************************
	$("body").keydown(function(e) {
	  if(e.keyCode == 37) { // left
	    $('.dynatable-active-page').prev().find('a').click();
	  }
	  else if(e.keyCode == 39) { // right
	    $('.dynatable-active-page').next().find('a').click();
	  }
	});

	//******************************
	// Logo toggle click
	//******************************
	$('#toggle-logo').click(function(){
		prob = $('#logo-prob');
		bits = $('#logo-bits');
		if(prob.hasClass("hide")){
			prob.removeClass("hide");
			bits.addClass("hide");
		}else{
			prob.addClass("hide");
			bits.removeClass("hide");
		}
	});

	
	//******************************
	// Populate prediction dropdown
	//******************************
	$.getJSON("data/dropdown_data.json").done(function(records) {
	     $('#query').select2({
		  	data:records,
		  	placeholder: "Select a prediction"
		  }).on("change", function(e) {
		  	  // Show div if its hidden
		  	  $('#prediction-display').removeClass("hide");

	          PRED_NAME = e.added.text;
	          changePrediction();

          }); 
	});

  	changePrediction();


    var elements = document.querySelectorAll( '.intense' );
	Intense( elements );

});

// Update prediction
function changePrediction() {
	if(PRED_NAME == "") return;
	base = [PRED_BASE, PRED_NAME].join("/")
    motifs_path = [base, "motifs.json"].join("/");
    sites_path = [base, "sites.json"].join("/");
    meta_path = [base, "metadata.json"].join("/");

    bits_png_path = [base, "logo_bits.png"].join("/");
    prob_png_path = [base, "logo_prob.png"].join("/");

    bits_pdf_path = [base, "logo_bits.pdf"].join("/");
    prob_pdf_path = [base, "logo_prob.pdf"].join("/");

    tsv_path = [base, "data.tsv"].join("/");



    $.getJSON(meta_path, function(data){
    	window.metadata = data;
    	$('#proline-rm').text(data.rm_p);
    	$('#npartners-sites').text(data.npartners_with_sites);
    	$('#npartners-all').text(data.npartners);
    	$('#nsites').text(data.nsites);
    	$('#enzyme-type').text(data.type);
    	$('#enzyme-name').text(data.name);


	    bits_name = ["logo_bits_" , data.name, ".pdf"].join("");
	    prob_name = ["logo_prob_" , data.name, ".pdf"].join("");
	    tsv_name = ["data_" , data.name, ".tsv"].join("");

	    $('#logo-bits-dl').attr('href', bits_pdf_path).attr('download', bits_name);
	    $('#logo-prob-dl').attr('href', prob_pdf_path).attr('download', prob_name);
	    $('#tsv-dl').attr('href', tsv_path).attr('download', tsv_name);


		$('#logo-bits')
	    	.attr('src', bits_png_path)
	    	.attr('data-image', bits_png_path)
	    	.attr('data-title', data.name);
	    $('#logo-prob')
	    	.attr('src', prob_png_path)
	    	.attr('data-image', prob_png_path)
	    	.attr('data-title', data.name);
    });



    pos_and_char = {};
    //******************************
    // Populate motifs table
    //******************************
	$.getJSON(motifs_path).done(function(records) {
		  motif_data = records;
		  pos_and_char = motifsPositionAndChar()
		  
		  for(var i = 0; i < records.length; i++){

			records[i].motif = colorSequence(records[i].motif, pos_and_char);
			// Adjust R Inf -> Javascript Infinity
			if(records[i]['fold_increase'] == "Inf") 
				records[i]['fold_increase'] = Infinity 
		  }

	      dynatable = $('#motifs-table').dynatable({
	        dataset: {
	          perPageDefault: 5,
	          perPageOptions: [5],
	          records: records
	        }, 
	        features: {
	          paginate: false,
	          sort: true,
	          search: false,
	          recordCount: false,
	          perPageSelect: false,
	          pushState:false
	        }
	      }).data("dynatable");

	      dynatable.settings.dataset.originalRecords = records;
	      dynatable.process();
	});


    //******************************
    // Populate sites table
    //******************************
	$.getJSON(sites_path).done(function(records) {
		site_data = records;

		// COLOR SITES :)
		for(var i = 0; i < records.length; i++){

			records[i].sub_region = colorSequence(records[i].sub_region, pos_and_char);
			string_link = sprintf("http://string-db.org/version_9_1/newstring_cgi/show_network_section.pl?all_channels_on=0&identifiers=9606.%s%%0D9606.%s", metadata.ensp, records[i].sub_ensp)
			records[i].string_score_link = sprintf('<a target="_blank" class="string-score" href="%s">%s</a>', string_link, records[i].string_score);
		}
	      dynatable = $('#sites-table').dynatable({
	        dataset: {
	          perPageDefault: 10,
	          perPageOptions: [10,20,100],
	          records: records
	        },
	        features: {pushState:false},
	        inputs: { queryEvent: 'keyup'}
	      }).data('dynatable');
		  dynatable.settings.dataset.originalRecords = records;
	      
	      dynatable.process();

	      processingComplete();
	});



}
