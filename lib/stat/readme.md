
### Varnishstat

varnishstat provides a flag for streaming json. This makes consumption of analytics easy. Problem is in this format all we get is the "raw data" number. This is fine for doing calculations from as a timestamp is provided. However the interactive screen uses varnishes shared memory and provides in addition to "raw data"  it provides "realtime per sec" and "since boot per sec". 

The problem stems from parsing the interactive version. It streams a bunch of ANSI control characters to update the screen as efficiently as possible. One option is to use https://github.com/kvisle/node-varnishstat this would create a native binding into varnish shared counter memory. This is the fastest approach. The build process is dated and needs some work to actually work across multiple operating systems. This option will be investigated later. For now I want pure js that provides fallback support.

Off to scrape some ansi escape characters.