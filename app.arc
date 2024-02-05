@app
arc-codes

@aws
region us-west-2
profile openjsf

@static
fingerprint true

@http
get /docs/:lang/*
get /api/package
any /*

@plugins
spellcheck
architect/plugin-node-prune
