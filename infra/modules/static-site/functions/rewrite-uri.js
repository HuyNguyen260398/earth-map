// CloudFront Function (viewer-request). Runtime: cloudfront-js-2.0.
//
// The S3 origin is private with no website endpoint, so a request for a path
// that is not a real object key returns AccessDenied instead of the app. Any
// path whose final segment has no file extension is therefore served the SPA
// shell; real asset paths pass through unchanged.
//
// Must stay a bare script with a global `handler` — CloudFront rejects
// `export` / `module.exports`. Tested by rewrite-uri.test.mjs via node:vm.
function handler(event) {
    var request = event.request;
    var uri = request.uri;
    var lastSegment = uri.substring(uri.lastIndexOf('/') + 1);

    if (lastSegment.indexOf('.') === -1) {
        request.uri = '/index.html';
    }

    return request;
}
