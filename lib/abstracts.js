var sparqler = require("sparqler");
var _ = require("lodash");
var Promise = require("bluebird");
var natural = require("natural");

var dbpediaSparqler = new sparqler.Sparqler("http://dbpedia.org/sparql");
var graph = "<http://dbpedia.org>";

// enable tokenizing and stemming on strings
natural.PorterStemmer.attach();

var flattenResponseForKey = function(response, key) {
  return _(dbpediaSparqler.sparqlFlatten(response))
    .mapValues(key)
    .map(function(value) { return value; })
    .value();
};

var flattenAbstract = function(response) {
  var abstracts = flattenResponseForKey(response, "abstract");

  if (abstracts && abstracts.length > 0) {
    return abstracts[0];
  }

  throw new Error("there is no abstract");
};

var getAbstractOf = function(uri) {
	return new Promise(function(resolve) {
		var query = "select ?abstract from $graph where { <$uri> dbpedia-owl:abstract ?abstract. FILTER (langMatches(lang(?abstract),'en')) }";
		var sQuery = dbpediaSparqler.createQuery(query);

		sQuery
	    .setParameter("graph", graph)
			.setParameter("uri", encodeURI(uri))
			.execute(function(response) {
				resolve( flattenAbstract(response) );
			});
	});
};

var getAbstractsOf = function(uris) {
  return _.map(uris, function(uri) { return getAbstractOf(uri); });
};

var getStemmedAbstractsOf = function(uris) {
  return Promise
    .all(getAbstractsOf(uris))
    .map(function(abstract) { return abstract.toLowerCase(); })
    .map(function(abstract) { return abstract.tokenizeAndStem(); });
};

var flattenPromise = function(promise) {
  return promise.reduce(function(concatenated, current) {
    return concatenated.concat(current);
  }, []);
};

module.exports = function(listOfResources) {
	return flattenPromise( getStemmedAbstractsOf(listOfResources) );
};

/* 

module.exports([
  "http://dbpedia.org/resource/Lists_of_writers", 
  "http://dbpedia.org/resource/List_of_National_Basketball_Association_players_(C)",
  "http://dbpedia.org/resource/Jason_Caffey"]).then(function(text) { console.log(text); });

*/