This library is a drop-in replacement for the old WXTiles Javascript API.

**Note:** The only difference is that you must use a valid `apikey` argument in the WXTiles constructor. The examples included here require
that the `apikey` variable is changed from `undefined` to this value (string) in both the Google Maps and OpenLayers examples. Please note that this will expose your key to any clients if used like this, but should be OK for development purposes.

WXTiles API keys can be obtained from the [WXTiles website](https://wxtiles.com/). Once you have registered and logged in, you will find it on the ["My Account" page](https://wxtiles.com/my-account/).
