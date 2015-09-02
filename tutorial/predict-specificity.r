#' Predict specifcity for a kinase 
#' 
#' @param kinase_id ensp ID of the kinase (e.g. 'ENSP00000266970')
#' @param kinase_type type of kinase, 'ST' for Serine/Threonine kinases or 'Y' for Tyrosine kinases (default = 'ST')
#' @param proline_directed  Is the proline proline directed? (default = TRUE)
#' @param phosphosites Phosphosites data.frame (loaded from 'phosphosites.tsv')
#' @param string_network String network (loaded from 'string_network_400.tsv')
#' @param bg_phosphosites Background sites used for motif-x enrichment (loaded from 'bg_phosphosites_ST.tsv' or 'bg_phosphosites_Y.tsv' depending on the kinase)
#' 
predictSpecificity <- function(kinase_id, kinase_type='ST', proline_directed = TRUE, 
                               phosphosites, string_network, bg_phosphosites){
  require(rmotifx)
  
  # Get functional interaction partners of the kinase
  kinase_partners = subset(string_network, protein1 == kinase_id)
  kinase_partners = kinase_partners$protein2
  
  # Get phosphosites on the kinases partners
  fg_phosphosites = subset(phosphosites, prot_id %in% kinase_partners)
  
  # Keep only S/T sites. Since our peptides are of length 11, 5 is the central residue
  cent_residues = strsplit(kinase_type, '')[[1]]
  fg_phosphosites = subset(fg_phosphosites, substr(flank, 6,6) %in% cent_residues)
  
  # If we have a non proline-directed kinase, remove P+1 sequences
  if(!proline_directed) fg_phosphosites = subset(fg_seqs, substr(flank, 7,7) != 'P')
  
  
  # Run motif-x
  enriched_motifs = motifx(pos.seqs    = fg_phosphosites$flank, 
                           neg.seqs    = bg_phosphosites_ST, 
                           central.res = kinase_type, pval.cutoff = 1e-6, min.seqs = 10)
  
  # Sort the data frame by the enrichment score
  enriched_motifs = enriched_motifs[ order(enriched_motifs$score, decreasing = T), ]
  
  # Pick the top five motifs
  enriched_motifs_top = head( enriched_motifs, n=5 )
  
  # List of matched sequences for each regular expression
  matched_seqs = lapply(enriched_motifs_top$motif, function(pattern){
    grep(pattern, fg_phosphosites$flank, value = T)
  })
  
  # The final list of sequences
  final_seqs = unique( unlist(matched_seqs) )
  
  return( list(final_seqs=final_seqs, 
               enriched_motifs=enriched_motifs_top, 
               fg_phosphosites=fg_phosphosites) )
}
