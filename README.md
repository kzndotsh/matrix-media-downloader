# Matrix Media Downloader v1

Export a Matrix room chat into JSON format and run this script against it.

Currently set to download video files but can be adjusted to download all media types.

Includes some basic
- verbose logging
- error handling
- rate limit handling with exponential backoff
- and resuming functionality using a log file

Sometimes freezes up, need to fix rate limiting/error handling better.
