# Uncovering phosphorylation–based specificities through functional interaction networks
### Tutorial


### Introduction

In this tutorial, we will do a walkthrough of how to obtain specifcity predictions for a kinase or protein containing a phospho-binding domain.

The idea behind this method is rather simple. The assumption here is that putative interaction partners  of a kinase are more likely than random proteins to be  phosphorylated by that kinase. Therefore, phosphosites occurring on interaction partners of kinases should confer a bias in amino acid composition towards the kinase’s specificity. By performing motif enrichment on these phosphosites, the specifcity of the kinase can, in some cases be predicted (see figure below).

<img src="http://evocellnet.github.io/kpred/images/method.svg" alt="Prediction method"/>

### Before you start

Before we begin there are a few things you will need. 

First of all we will need the package `rmotifx` for finding overrepresented motifs in phosphosites. You can find instructions on how to install [here](https://github.com/omarwagih/rmotifx).


You will also need a few datasets. They can be downloaded from [here](http://evocellnet.github.io/kpred/tutorial/kpred_data.zip)


####1. `string_network_400.tsv` 

This is the STRING interaction network (v9.1) filtered for scores above 400. The data is in tab delimited format and follows the following format:

| protein1          | protein2        | combined_score  |
| :----------------:|:---------------:| :--------------:|
| ENSP00000420824   | ENSP00000390783 | 795             |
| ENSP00000420825   | ENSP00000343577 | 853             |
| ENSP00000420828   | ENSP00000376623 | 609             |

* `protein1` and `protein2` are the two functional interaction partners.
* `combined_score` is the STRING score, which ranges from 0 (weakest) to 1000 (strongest).

####2. `phosphosites.tsv`

This is the set of phosphorylation sites mapped to the STRING proteins. The data is in tab delimited format and follows the following format:

| prot_id         | prot_name | position        | flank           | kinase   | source         |
| :--------------:|:---------:|:---------------:|:---------------:|:--------:|:--------------:|
| ENSP00000300161 |YWHAB      | 60              | GARRSSWRVIS     | PRKCD    | hprd;pelm;psite|
| ENSP00000326603 |SMCHD1     | 78              | VITTTSRKEIT     |          | hprd           |
| ENSP00000269571 |ERBB2      | 1023            | VDAEEYLVPQQ     | ERBB2    | hprd;psite     |

* `prot_id` and `prot_name` are the identifiers of the substrate. 
* `position` is the phosphorylated residue. 
* `flank` is the sequence of the phosphosite and flanking five residues. 
* `kinase` is the list of kinases known to phosphorylated this site from the literature
* `source` is the database(s) the phosphosite was obtained from (PhosphoSitePlus, PhosphoELM and HPRD).

The last two columns we won't be using for the prediction, and are provided just for annotation purposes. 

####3. `bg_phosphosites_ST.tsv` and `bg_phosphosites_Y.tsv`: 

These are true negative phosphosites, defined as a random 10,000 S, T, or Y residue that is not identified in one of the phosphorylation databases. Though they might not all necissarily be true negatives, as they may contain unidentified phosphosites, they are a close representation to the true negative. 

There are two files, each file contains 10,000 random sequences: one for S/T sites and the other for Y sites. Which file you use will depend on the kind of kinase you will predict for.

The data has phosphosite sequences, line separated as follows:

```
PVNPGSVTSDL
QGGLRTKALIV
SDKDESCYDNA
...
```


### Generating predictions


To get started, unzip the compressed file you downloaded above and set your current working directory to the tutorial directory. We will also load the required package, `rmotifx`

```r
# Load rmotifx
require('rmotifx')

# Set our working directory
setwd("/path/to/tutorial")

# Read data in (this may take a few seconds)
phosphosites        = read.table('phosphosites.tsv', header=T, stringsAsFactors = F)
string_network_400  = read.table('string_network_400.tsv', header=T, stringsAsFactors = F)
bg_phosphosites_ST  = readLines('bg_phosphosites_ST.tsv')
bg_phosphosites_Y   = readLines('bg_phosphosites_Y.tsv')
```


We are going to define the kinase we will be predicting specificity for. 

In this case we have chosen cyclin-dependent kinase 2 (CDK2), with an ensembl identifier `ENSP00000266970`. 

We also define the `type` of kinase. This can be `ST` for Serine/Threonine kinases or `Y` for Tyrosine kinases. Since CDK2 is a Serine/Threonine, we will go ahead and set it to `ST`.

We also need to know if the kinase is proline directed. An easy indicator for this is if the kinase belongs to the CMGC family. You can find a list of CMGC kinases [here](http://kinase.com/wiki/index.php/Kinase_Group_CMGC)

```r
# Kinase ID
kinase_id = 'ENSP00000266970'
# Type of kinase ST for Serine/threonine or Y for tyrosine
kinase_type = 'ST'
# Is the kinase proline directed? 
proline_directed = TRUE
```

The first step to the method is to find all partners of CDK2 in the string network

```r
# Get functional interaction partners of the kinase
kinase_partners = subset(string_network_400, protein1 == kinase_id)
kinase_partners = kinase_partners$protein2

# Show how many interactors CDK2 has
print( length(kinase_partners) )
```


The next step is to identify all phosphorylation sites on the proteins CDK2 is functionally interacting with. We will also only keep phosphosites that have a phospho-acceptor residue (central position in the sequence, 6) that do matches the kinases type, in this example `ST`. 

Lastly, if we're dealing with a non proline-directed kinase, we will remove any sites with a proline at position +1 (or 7 in the sequence). CDK2 is proline directed so we won't be removing anything.

```r
# Get phosphosites on the kinases partners
fg_phosphosites = subset(phosphosites, gene %in% kinase_partners)

# Keep only S/T sites. Since our peptides are of length 11, 5 is the central residue
cent_residues = strsplit(kinase_type, '')[[1]]
fg_phosphosites = subset(fg_phosphosites, substr(flank, 6,6) %in% cent_residues)

# If we have a non proline-directed kinase, remove P+1 sequences
if(!proline_directed) fg_phosphosites = subset(fg_seqs, substr(flank, 7,7) != 'P')

# Show the head of our final sites data
print( head(fg_phosphosites) )
```

Next, we will find overrepresnted motifs in the sites we just obtained, compared to the true negative sites. We will use the motifx function for this:

```r
# Run motif-x
enriched_motifs = motifx(pos.seqs    = fg_phosphosites$flank, 
                         neg.seqs    = bg_phosphosites_ST, 
                         central.res = kinase_type, pval.cutoff = 1e-6, min.seqs = 10)

# Sort the data frame by the enrichment score
enriched_motifs = enriched_motifs[ order(enriched_motifs$score, decreasing = T), ]

# Show the head of our extracted motifs
print( head(enriched_motifs) )

# Pick the top five motifs
enriched_motifs_top = head( enriched_motifs, n=5 )
```

The motif column is a regular expression of the overrepresented motif. We will loop through each motif and extract all phosphosites sites that match it. After that we will merge all sequences from all regular expressions and this will be our final prediction

```r
# List of matched sequences for each regular expression
matched_seqs = lapply(enriched_motifs_top$motif, function(pattern){
  grep(pattern, fg_phosphosites$flank, value = T)
})

# The final list of sequences
final_seqs = unique( unlist(matched_seqs) )
``` 

Now if you were to plot a sequence logo (using weblogo) of the final sequences, you would get a nice visual representation as such:

<img src="http://evocellnet.github.io/kpred/data/predictions/CDK2/CDK2_logo_prob.png" alt="CDK2 probability logo from weblogo"/>

The code here has been conveniently placed into a function so that you can run everything easily.
You can access the code [here](http://evocellnet.github.io/kpred/tutorial/predict-specifcity.r)

