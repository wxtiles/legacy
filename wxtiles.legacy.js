/*
About: WXTiles API
Title: WXTiles API
Version: 2.0
*/

var LAYER_IDS={
    'hs':'ncep-mww3-global-hs',
    'tp':'ncep-mww3-global-tp',
    'wind':'ncep-gfs-global-wind',
    'rain':'ncep-gfs-global-rain',
    'tmp':'ncep-gfs-global-temp-2m',
    'sst':'sat-sst',
    'satenh':'nogood',
    'satir':'nogood',
    'satvis':'nogood'
};

var STYLE_IDS={
  'hs':'hs-si',
  'tp':'wave-period',
  'wind':'wind-speed-direction-msl-classic',
  'rain':'precip-compose',
  'tmp':'temperature-metric',
  'sst':'sst',
  'satenh':'nogood',
  'satir':'nogood',
  'satvis':'nogood'
}

var LAYER_DESCRIPTIONS={
    "hs":"Wave height",
    "tp":"Peak wave period",
    "wind":"Wind 10 m above surface",
    "rain":"Precipitation and MSLP",
    "tmp":"Air temperature",
    "sst":"Sea surface temperature",
    "satenh":"Satellite IR enhanced",
    "satir":"Satellite IR",
    "satvis":"Satellite Visible"
};

var LAYER_DEFALPHA={"hs":1,"tp":1,"wind":0.6,"rain":0.75,"tmp":0.6,"sst":1,"hs":0.6,"wind":0.6};

var init=null;

var t = document.getElementsByTagName("script");
var _WXROOTURL="http://api.wxtiles.com/v1/wxtiles/";


var gsMonthNames = new Array('January','February','March','April','May','June','July','August','September','October','November','December');
var gsDayNames = new Array('Sunday','Monday','Tuesday','Wednesday','Thursday','Friday','Saturday');
Date.prototype.wxformat = function(f)
{
    if (!this.valueOf())
        return '&nbsp;';
    var d = this;
    return f.replace(/(%Y|%y|%B|%b|%m|%A|%a|%d|%e|%H|%M|%S|%p)/gi,
        function($1)
        {
            switch ($1)
            {
            case '%Y': return d.getFullYear();
            case '%y': return d.getFullYear().substr(2,2);
            case '%B': return gsMonthNames[d.getUTCMonth()];
            case '%b': return gsMonthNames[d.getUTCMonth()].substr(0, 3);
            case '%m': return zer0(d.getUTCMonth() + 1);
            case '%A': return gsDayNames[d.getUTCDay()];
            case '%a': return gsDayNames[d.getUTCDay()].substr(0, 3);
            case '%d': return zer0(d.getUTCDate());
            case '%e': return d.getUTCDate();
            case '%h': return zer0(((h = d.getUTCHours() % 12) ? h : 12));
            case '%H': return zer0(d.getUTCHours());
            case '%M': return zer0(d.getUTCMinutes());
            case '%S': return zer0(d.getSeconds());
            case '%p': return d.getUTCHours() < 12 ? 'a' : 'p';
            }
        }
    );
}

function zer0(str){
    if (String(str).length<2) str='0'+str;
    return str;
}

function jsonload(url){
    var xobj = new XMLHttpRequest();
    xobj.overrideMimeType("application/json");
    xobj.open('GET', url, false);
    xobj.send(null);
    if (xobj.status == "200"){
        var obj=JSON.parse(xobj.responseText);
    }
    return obj;
}

extendTo = function(destination, source) {
    destination = destination || {};
    if(source) {
        for(var property in source) {
            var value = source[property];
            if(value !== undefined) {
                destination[property] = value;
            }
        }
        var sourceIsEvt = typeof window.Event == "function"
                          && source instanceof window.Event;

        if(!sourceIsEvt
           && source.hasOwnProperty && source.hasOwnProperty('toString')) {
            destination.toString = source.toString;
        }
    }
    return destination;
};

Object.keys = Object.keys || function(o) {
    var result = [];
    for(var name in o) {
        if (o.hasOwnProperty(name))
          result.push(name);
    }
    return result;
};

if (!Array.prototype.indexOf) {
    Array.prototype.indexOf = function(obj, start) {
         for (var i = (start || 0), j = this.length; i < j; i++) {
             if (this[i] === obj) { return i; }
         }
         return -1;
    }
}

/*
class: WXTiles
Main tile overlay class
*/

_WXTiles = {
/*
  propery: nameupdate_view
  {string}  Overlay name
*/
  name: 'Weather overlay',
  isBaseLayer: false,
  wrapDateLine: true,
  minZoom: 1,
  maxZoom: 14,
  views: null,
  colorBar: null,
  map:null,
/*
  property: cview
  {String}   Currently displayed view. See <WXTilesViews>
*/
  cview: 'none',
/*
  property: ctime
  {Integer}   Currently displayed time (Javascript Date/Time value)
*/
  ctime: -1,
  strtime: '.',
  cycle: null,
/*
  property: autoupdate
  {boolean}   Autoupdate enabled
*/
  autoupdate: true,
  isinit: false,
  hidden: false,
  ext: '.png',
  tselect: null,
  vselect: null,
/*
  property: withnone
  {Boolean}   'None' added to the view list
*/
  withnone:false,
  toff:-99,

  type:'',
  linklayers:false,
  buffer:0,
/*
  property: updateCallback
  {Function}     Callback triggered when layer is updated.

  The scope of 'this' within the callback function is the WXTiles layer object.
*/
  updateCallback:null,
/*
  property: vorder
  {Array}     Views in the layer and order of views shown on select control. Default is all <WXTiles views>
*/


  vorder:[],
  attribution:'<div><a target="_blank" href="http://www.wxtiles.com"><img src="http://www.wxtiles.com/images/wxtiles_48.png" /><br><span>WXTiles</span></a></div>',
/*
    Constructor: WXTiles

    Parameters:
    url - {String}
    options - {Object} Hashtable of extra options to tag onto the layer.
	      Any property value can be specified as an option.
*/
  key: null,

  initialize: function(apikey,options) {
    this._url=_WXROOTURL;
    this.apikey=apikey;
    extendTo(this,options);
    this._url=this._url.replace(/\/$/, "")
    this._srv=this._url;
    this.lastinit=new Date();
    this._loadinitcount=0;
    if (this.autoupdate){
        var inst=this;
        setInterval(function(){inst._loadinit()},600000);
    }
    if (this.toff==-99){
        var now=new Date();
        this.toff=-now.getTimezoneOffset()/60;
    }
    this.times={};
    this._timekey={};
    this.alpha=(options && options.alpha) ? options.alpha : {};
    this.meta={};
    this.alltimes=[];
    this.views={};
    this.setVisibility(false);
    this._loadinit();
  },
  _loadinit: function(){
    obj=jsonload(_WXROOTURL+'layer');
    this._init(obj);
  },
  _init: function(datalist){
    if (!this.isinit){
      if (!(datalist instanceof Array)) {
        datalist=[datalist];
      }
      this._serverlist={};
      this._cyclelist={};
      this.views={};
      this.layerid={};
      this.styles={};
      this.instid={};
      this.times={};
      this.defalpha={};
      this._timekey={};
      var new_ids=[];
      for (i=0;i<datalist.length;i++) {
        new_ids.push(datalist[i].id);
      }
      for (a in LAYER_IDS){
        var ids=new_ids.indexOf(LAYER_IDS[a]);
        if (ids<0) continue;
        var instances=datalist[ids].instances;
        if (instances.length<1) continue;
        this.views[a]=LAYER_DESCRIPTIONS[a];
        this.styles[a]=STYLE_IDS[a];
        this.layerid[a]=new_ids[ids];
        this.instid[a]=instances.pop()['id'];
        this.defalpha[a]=LAYER_DEFALPHA[a];
        this.times[a]=jsonload(_WXROOTURL+'layer/'+this.layerid[a]+'/instance/'+this.instid[a]+'/times/');
	    var server=_WXROOTURL;
        for (v in this.views) {
          this._serverlist[v]=server;
          this._cyclelist[v]=this.instid[v];
        }
      }
      for (v in this.times) {
        for (i=0;i<this.times[v].length;i++){
          var timestamp=this.times[v][i];
          if (!this._timekey[timestamp]) {
            this.times[v][i]=new Date(timestamp).valueOf();
          }
        }
      }
	this.getTimes();
	if (!this.vorder.length) {
	    this.vorder=Object.keys(this.views);
	}
	if (this.withnone) {
	    this.views['none']='None';
	    this.times['none']=[];
	    this.alpha['none']=0;
          if (this.vorder.indexOf && this.vorder.indexOf('none')<0) this.vorder=['none'].concat(this.vorder)
      }
      if (!this.views[this.cview]) {
          for (var i=0;i<this.vorder.length;i++){
            if (this.views[this.vorder[i]]){
                this.cview=this.vorder[i];
                break;
            }
          }
      }
      this._makeVSelect(this.vorder);
      this.setView(this.cview);
      if (this.getTimes(false,true).indexOf(this.ctime)<0) this.ctime=false;
      this.setTime(this.ctime);
      this._makeTSelect();
      this.isinit=true;
      this.lastinit=new Date();
      if (this.updateCallback) this.updateCallback.apply(this);
    }
  },
  _updateOpacity:function(){
    opacity=this.alpha[this.cview];
    this._setOpacity(opacity ? opacity : typeof(this.defalpha[this.cview])==='undefined' ? 1.0 : this.defalpha[this.cview]);
  },
  _update: function(){
    if (!this.times[this.cview]) {
      this.setVisibility(false);
      return;
    }
    for (var i=0;i<this.times[this.cview].length;i++){
      if (this.times[this.cview][i]==this.ctime | this.times[this.cview][i]==-1) break;
    }
    if (this.cview && !this.hidden && i<this.times[this.cview].length){
      this.setVisibility(true);
    }else{
      this.setVisibility(false);
    }
    this._setURL();
    this._updateOpacity();
    if (this.colorBar) this.colorBar.update(this.hidden ? 'none' : this.cview,this.style);
    this.redraw();
  },
  _setURL: function(){
    var v=this.cview;
    for (s in this._serverlist){
        if (v==s) {
            this._srv=this._serverlist[s];
            return;
        }
    }
  },
  /*
  Method: addToMap
     Add to a map

     Parameters:
        map {Map Object}   OpenLayers or GoogleMaps Map object

     Returns:
        {Null}

    Note: WXTiles may reset the map properties to ensure the tiles overlay correctly
 */
  addToMap: function(map){
  //  overridden by derived types
  },
  /*
  Method: addColorBar
     Add a color bar to the map

     Parameters:
     size {String}	(optional) Colorbar size 'small'(default) or 'large'
     orient {String}	(optional) Orientation 'horizontal'(default) or 'vertical'
     position {String}  (optional) One of 'TopRight'(default),'TopLeft',BottomRight','BottomLeft'

     Returns:
     colorbar {<WXColorBar>} The new WXColorBar object
     */
  addColorBar: function(size,orient,position){
    var thesize=size ? size : 'small'
    var theorient=orient ? orient : 'horizontal'
    this.colorBar=new WXColorBar({size:thesize,orientation:theorient,location:position});
    if (this.map) {
        this.colorBar.addToMap(this.map);
    }
    this.colorBar.update(this.cview,this.style);
    return this.colorBar;
  },
  /*
  Method: getVSelect
     Get a select control to change the overlay view

     Parameters:
     views {Array}      (optional) An array of views to include in the Select control. Defaults to <WXTiles.vorder>.

     Returns:
     vselect {Select}   A select control
  */
  getVSelect: function(views){
    return this._makeVSelect(views ? views : this.vorder);
  },
  /*
  Method: getTSelect
     Get a select control to change the time shown in the overlay

     Parameters:
     ctime {Javascript date/time}      (optional) The initially selected time - pass null for default
     format {String}                   (optional) The format to be used for time in C language convention

     Returns:
     tselect {Select}   A select control
  */
  getTSelect: function(format){
    return this._makeTSelect(format);
  },
   /*
  Method: linkTime
     Link time setting with another WXTiles layer

     Parameters:
     layer {<WXTiles>}	Layer to link to

     Returns:
     {Null}
     */
  linkTime: function(layer,_linked){
    if (!this.linklayers) this.linklayers=[];
    this.linklayers.push(layer);
    if (!_linked) layer.linkTime(this,true);
  },
  /*
 Method: hide
    Hide the layer.

    Returns:
    {Null}
  */
  hide: function(){
	this.hidden=true;
        this._update();
  },
  /*
 Method: show
    Show the layer (undo hide).

    Returns:
    {Null}
  */
  show: function(){
  	this.hidden=false;
        this._update();
  },
  /*
  Method: getTimes
     Get the times for one or all forecast views

     Parameters:
     aview {String/Boolean}	Get times for view aview. To get times for all, omit or set to false
     link {Boolean}		nclude times from linked layers

     Returns:
     {Array} An array of Javascript Date/Time values
     */
  getTimes: function(aview,_link){
    this.alltimes=[];
    var tobj={};
    var layers=[this];
    if (_link) layers.concat(this.linklayers);
    for (var il=0;il<layers.length;il++){
        for (v in this.views){
            if (!this.times[v]) continue;
            for (var j=0;j<this.times[v].length;j++){
              var t=this.times[v][j];
              tobj[t]=1;
            }
        }
    }
    for (t in tobj) {
        var tt=parseInt(t);
        this.alltimes.push(isNaN(tt) ? t : tt);
    }
    this.alltimes.sort();
    return (aview) ? this.times[aview] : this.alltimes;
  },
  /*
  Method: getTimeKeys
     Get the time keys and their values for one or all forecast views

     Parameters:
     aview {String/Boolean}	Get times for view aview. To get times for all, omit or set to false
     link {Boolean}		nclude times from linked layers

     Returns:
     {Object} A hash of key:value pairs
     */
  getTimeKeys: function(aview,_link){
    var times=this.getTimes(aview,_link);
    var timekeys={};
    for (var it=0;it<times.length;it++) {
        if (this._timekey[times[it]]) {
            timekeys[times[it]]=this._timekey[times[it]];
        }
    }
    return timekeys;
  },
  getCycle: function(v){
    return this._cyclelist[v];
  },
  /*
  Method: getViews
     Get the forecast views in the layer

     Returns:
     {Object} A hash of key:Name pairs of views available in the WXTiles layer
     */
  getViews: function(){
    return this.views;
  },
/*
  Method: setView
     Set currently displayed forecast view

     Parameters:
     newview {String} New view to set layer to

     Returns:
     cview {String} The new view the layer is set on
     */
  setView: function(newv){
    if (this.views[newv]){
      this.cview=newv;
      this.style=STYLE_IDS[newv];
      this._update();
      return this.cview;
    }
    return false;
  },
/*
  Method: setTime
     Set currently displayed forecast time

     Parameters:
     newtime {Javascript date/time}	New time to set layer to
     link {Boolean}		Include times from linked layers

     Returns:
     ctime {Javascript date/time} The new time the layer is set on
     */
  setTime: function(strtime,_linked){
    if (!strtime) {
        var now=new Date();
        dt=this.alltimes.length>1 ? this.alltimes[1]-this.alltimes[0] : 0;
        strtime=now.valueOf()-dt;
    }
    if (typeof(strtime)=="object") strtime=strtime.valueOf();
    newtime=parseInt(strtime);
    if (isNaN(newtime)){
        if (this.alltimes.indexOf(strtime)<0) strtime=this.alltimes[0];
        this.strtime=strtime;
        this.ctime=strtime;
    }else{
        for (var i=0;i<this.alltimes.length;i++){
          if (this.alltimes[i+1]>newtime) {
            newtime=this.alltimes[i];
            break;
          }
        }
        this.ctime=newtime;
        if (typeof(this.ctime)=='string'){
            this.strtime=this.ctime;    //This allows arbitary time indices for timekey option. Pre 1970 dates will not work though!
        }else{
            var newdate=new Date(this.ctime);
            this.strtime=newdate.wxformat('%Y-%m-%dT%H:%M:%SZ');
        }
    }
    if (this.linklayers && !_linked) {
        for (i=0;i<this.linklayers.length;i++){
            this.linklayers[i].setTime(newtime,true);
        }
    }
    this._update();
    return newtime;
  },
/*
  Method: setToffset
     Set time offset from UTC

     Parameters:
     toff {Float} Local time offset from UTC in hours (+ve values for east of Greenwich)

     Returns:
     {Null}
     */
  setToffset: function(toff){
    this.toff=toff;
    this._makeTSelect();
  },
/*
  Method: setAlpha
     Set alpha transparency of layer

     Parameters:
     alpha {Float} Alpha value between 0 (transparent) and 1 (opaque)
     view {String} (Optional) Layer to set transparency for - default current layer

     }
     Returns:
     {Null}
     */
  setAlpha: function(alpha,view){
    if (view) {
        this.alpha[view]=alpha;
    }else{
        for (var i=0;i<this.vorder.length;i++){
            this.alpha[this.cview]=alpha;
        }
    }
    this._updateOpacity();
  },
  _makeVSelect: function(vo){
    if (!this.vselect) {
        this.vselect=document.createElement('Select');
        this.vselect.setAttribute('name',this.id+'_vSelect');
    }
    if (!this.views) return null;
    this.vselect.length=0;
    for (i=0;i<vo.length;i++){
        if (this.views[vo[i]]) this.vselect.options[this.vselect.options.length] = new Option(this.views[vo[i]],vo[i],(vo[i]==this.cview), (vo[i]==this.cview));
    }
    this.vselect.onchange=(function(obj,func){
            return function(e){return func.apply(obj,[this.value]);}
    })(this,this.setView);
    return this.vselect;
  },
  _makeTSelect: function(format,view){
    if (!this.tselect) {
        this.tselect=document.createElement('Select');
        this.tselect.setAttribute('name',this.id+'_tSelect');
        this.tselect.format='%a %e %b %H:%M';
    }
    if (!format) {
        format=this.tselect.format;
    }
    this.tselect.length=0;
    var alltimes=this.getTimes(view,true);
    for (i=0;i<alltimes.length;i++){
        var t=alltimes[i];
        if (typeof(t)=='string') {
	    if (this._timekey[t]) {
		var jstime=this._timekey[t];
	    }else{
		var jstime=t;
	    }
        }else{
            var nd=new Date(t+this.toff*3600000);
            var jstime=nd.wxformat(format);
        }
        this.tselect.options[this.tselect.options.length] = new Option(jstime,t,(t==this.ctime),(t==this.ctime));
    }
    this.tselect.onchange=(function(obj,func){
        return function(e){return func.apply(obj,[this.value]);}
    })(this,this.setTime);
    this.tselect.format=format;
    return this.tselect;
  },
   /*
  Method: addToMap
     Add to a map

     Parameters:
     map {Map Object}	OpenLayers or GoogleMaps Map object

     Returns:
     {Null}
     */
  addToMap: function(map){
    //overridden by derived types
  },
  /*
  Method: removeFromMap
     Remove layer from its map

     Returns:
     {Null}

     Note: this does not destroy the layer
     */
  removeFromMap: function(){
    //overridden by derived types
  },
  /*
  Method: setVisibility
     Show or hide layer
     Note that this is not a permanent state change will be reset when time or view altered.
     Use hide() to permanently hide layer.

     Parameters:
     vis {Boolean}	Show layer (true) or hide layer (false)

     Returns:
     {Null}
     */
  setVisibility: function(vis){
    //overridden by derived types
  },
  /*
  Method: getMetaData
     Get meta data associated with current visible layer

     Returns:
     metadata {String}
     */
  getMetaData: function(){
    if (this.cview=='None') {
        return Null;
    }else{
        return this.meta[this.cview];
    }
  }
}

/*
class: WXColorBar

   Colorbar class
*/
_WXColorBar = {
    id:'WXColorBar',
/*
    Property: size
    {String}  'large' or 'small'
*/
    size:'small',
/*
    Property: orientation
    {String}  'horizontal' or 'vertical'
*/
    orientation:'horizontal',
/*
    Property: location
    {String}  One of 'TopRight','TopLeft',BottomRight','BottomLeft'
*/
    location:null,
    mpos:['TopRight','TopLeft','BottomRight','BottomLeft'],
    cview:null,
/*
    Constructor: WXColorBar

    Parameters:
    url - {String}  URL of the wxtiles server
    options - {Object} Hashtable of extra options to tag onto the layer. Any property value can be specified as an option. For the OpenLayers API, any valid option for the OpenLayers.Layer.TMS class can also be included.


    Notes:
    Usually called internally by <WXTiles.addColorBar>
*/
    initialize: function(options){
      extendTo(this,options);
      this.imurl=_WXROOTURL+'legend/{v}/{s}/'+this.size+'/'+this.orientation+'.png';
    },
/*
    Method: update
    Update colorbar

    Parameters:
    aview {String}:	Variable to show in colorbar
    styl {String}: Style for the variagble

    Returns:
    {Null}

    Notes:
    This is usually called internally by the <WXTiles> layer to which the colorbar belongs
*/
    /*
     Method: addToMap
        Add to a map

        Parameters:
        map {Map Object}	OpenLayers or GoogleMaps Map object

        Returns:
        {Null}
        */
     addToMap: function(map){
       //overridden by derived types
     },
     /*
     Method: removeFromMap
        Remove layer from its map

        Returns:
        {Null}

        Note: this does not destroy the colorbar object
    */
     removeFromMap: function(){
       //overridden by derived types
     },
     update: function(aview,styl){
        if (!this.div) return;
        if (!aview) aview=this.cview;
        this.cview=aview;
        if (aview=='none') {
            this.div.style.display='none';
        }else{
            this.div.innerHTML='<img class="wxcolorbar" src="'+this.imurl.replace(/{v}/g,LAYER_IDS[aview]).replace(/{s}/g,styl)+'" />';
            this.div.style.display='block';
        }
    }
}

if (typeof(OpenLayers)!="undefined"){
    WXTiles=OpenLayers.Class(OpenLayers.Layer.TMS,_WXTiles,{
	mapz0:0,
        initialize:function(options){
            var name=(options && options.name) ? options.name : 'WXTiles Overlay';
            OpenLayers.Layer.TMS.prototype.initialize.apply(this, [name,'',options]);
            _WXTiles.initialize.apply(this,[options]);
        },
        getURL: function(bounds){
            if (!this.getVisibility()) return this._url+"/images/none.png";
            var res = this.map.getResolution();
            var z = this.map.getZoom()+this.mapz0;
            if (z >= this.minZoom && z <= this.maxZoom) {
              var x = Math.round((bounds.left - this.tileOrigin.lon) / (res * this.tileSize.w));
              var zmod=Math.pow(2,z);
              x=((x%zmod)+zmod)%zmod;
              var y = Math.round((bounds.bottom - this.tileOrigin.lat) / (res * this.tileSize.h));
                 return this._srv+'tile/'+this.layerid[this.cview]+"/"+this.styles[this.cview]+"/"+this.instid[this.cview]+"/"+this.strtime+"/0/"+z + "/" + x + "/" + y + this.ext;
            } else {
              return this._url+"/images/none.png";
            }
        },
        _update: function(){
            this.transitionEffect=null;
            _WXTiles._update.apply(this);
        },
        _getZoom: function(){
            return this.map.getZoom();
        },
        _setOpacity: function(opacity){
            this.setOpacity(opacity);
        },
        addToMap: function(map){
          map.setOptions({
            projection: new OpenLayers.Projection("EPSG:900913"),
            units: "m",
            maxResolution: 156543.0339,
            maxExtent: new OpenLayers.Bounds(-20037509, -20037508.34, 20037508.34, 20037508.34)
            })
          map.addLayers([this]);
	    if (this._url==_WXROOTURL && this.map.getControlsByClass("OpenLayers.Control.Attribution").length==0){
	      this.attrib=new OpenLayers.Control.Attribution();
	      map.addControl(this.attrib);
	      this.attrib.div.style.bottom="10px";
	    }
          map.events.register('movestart',this,this._setURL)
	    if (typeof this.map.baseLayer.minZoomLevel != 'undefined') this.mapz0=this.map.baseLayer.minZoomLevel;
        },
        removeFromMap: function(){
            if (this.map.getLayersByClass("WXTiles").length==0){
                this.map.removeControl(this.attrib);
            }
            this.map.removeControl(this.colorBar);
            this.map.removeLayer(this);
	},
	setVisibility: function(vis){
	  OpenLayers.Layer.TMS.prototype.setVisibility.apply(this,[vis]);
	},
        CLASS_NAME: 'WXTiles'
    });
    WXColorBar=OpenLayers.Class(OpenLayers.Control,_WXColorBar,{
        initialize: function(options){
            OpenLayers.Control.prototype.initialize.apply(this,[options]);
            _WXColorBar.initialize.apply(this,[options]);
        },
        draw: function(px){
            OpenLayers.Control.prototype.draw.apply(this,[px]);
            if (!px) {
                if (this.location=='TopLeft'){
                    this.div.style.left=20+'px';
                    this.div.style.top=10+'px';
                }else if(this.location=='BottomLeft'){
                    this.div.style.left=20+'px';
                    this.div.style.bottom=10+'px';
                }else if(this.location=='BottomRight'){
                    this.div.style.right=20+'px';
                    this.div.style.bottom=10+'px';
                }else{
                    this.div.style.right=20+'px';
                    this.div.style.top=10+'px';
                }
            }
            this.div.style.backgroundColor = "rgba(255,255,255,0.7)";
            return this.div;
        },
        addToMap: function(map){
            map.addControl(this);
        },
        removeFromMap: function(){
            map.removeControl(this);
	},
        CLASS_NAME: 'WXColorBar'
    });
}
else if (typeof(google)!="undefined"){
    GMWXTiles={
        tileSize:new google.maps.Size(256, 256),
        index:0,
        attrib:-1,
        calpha:1,
        getTile: function(pos, z, doc) {
            var id=this.index+'_' + pos.x + '_' + pos.y;
            for (i=0;i<this.tiles.length;i++){
                if (this.tiles[i].id==id){
                    var tile=this.tiles[i];
                    break;
                }
            }
            if (i==this.tiles.length){
                var tile = doc.createElement('IMG');
                tile.id = id;
                tile.style.width = '256px';
                tile.style.height = '256px';
                this.tiles.push(tile);
            }
            if (!this.visible) {
                tile.style.display = 'none';
            }else{
                tile.src = this.getTileUrl(pos, z);
                tile.style.display = '';
                if (typeof (tile.style.filter) == 'string') { tile.style.filter = 'alpha(opacity:' + this.calpha + ')'; }
                if (typeof (tile.style.KHTMLOpacity) == 'string') { tile.style.KHTMLOpacity = this.calpha; }
                if (typeof (tile.style.MozOpacity) == 'string') { tile.style.MozOpacity = this.calpha; }
                if (typeof (tile.style.opacity) == 'string') { tile.style.opacity = this.calpha; }
            }
            return tile;
        },
        getTileUrl:function(pos, z) {
            if (z >= this.minZoom && z <= this.maxZoom) {
                //handle wrap around date line
                var x = pos.x %(1<<z);
                //convert google tile format into server format
                var zmod=Math.pow(2,z);
                var y=zmod-1-pos.y
                return this._srv+'tile/'+this.layerid[this.cview]+"/"+this.styles[this.cview]+"/"+this.instid[this.cview]+"/"+this.strtime+"/0/"+z + "/" + x + "/" + y + this.ext;
            } else {
              return this._url+"/images/none.png";
            }
        },
        setVisibility: function(vis){
            this.visible=vis;
        },
        _setOpacity: function(alpha){
            this.calpha=alpha;
        },
        _getZoom: function(){
            return this.map.getZoom();
        },
        redraw: function(){
            if (!this.map) return;
            var zoom=this.map.getZoom();
            if ((zoom-1) >= this.map.minZoom) {
				this.map.setZoom(zoom-1);
			}
			else {
				this.map.setZoom(zoom+1);
			}
            this.map.setZoom(zoom);
        },
        addToMap: function(map){
            this.map=map;
            this.tiles=new Array();
            map.overlayMapTypes.push(this);
            this.index=map.overlayMapTypes.length-1;
            this.id='WXTiles_'+this.index
            if (this._url==_WXROOTURL && !this.map.has_wxtiles_attrib){
              var attribution=document.createElement('DIV');
              attribution.innerHTML=this.attribution;
              attribution.id='wxtiles_attrib';
              attribution.style.bottom='20px';
              this.map.controls[google.maps.ControlPosition.RIGHT_BOTTOM].push(attribution);
              this.attrib=this.map.controls[google.maps.ControlPosition.RIGHT_BOTTOM].length-1;
              this.map.has_wxtiles_attrib=true;
            }
            var that=this;
            var zoomchange=(function(){
              return function(){that._setURL.apply(that,[]);}
            })();
            google.maps.event.addListener(map, 'zoom_changed', zoomchange);
        },
        removeFromMap: function(keepattrib){
	      this.map.overlayMapTypes.removeAt(this.index);
            this.colorBar.removeFromMap();
            var has_wxtiles=false;
            if (keepattrib) return;
            this.map.overlayMapTypes.forEach(function(layer){
                has_wxtiles=(layer instanceof WXTiles) | has_wxtiles;
            })
            if (!has_wxtiles) this.map.controls[google.maps.ControlPosition.RIGHT_BOTTOM].removeAt(this.attrib);
	}
    }
    var WXTiles=(function(){
        var Class=function(url,options){
            this.initialize.apply(this,[url,options]);
        }
        var extend={};
        extendTo(extend,_WXTiles);
        extendTo(extend,GMWXTiles);
        Class.prototype=extend;
        return Class;
    })();
    GMWXColorBar=function(){
        this.div=document.createElement('DIV');
        this.div.style.padding = '4px';
        this.div.index = 1;
    }

    WXColorBar=function(options){
        var obj=new GMWXColorBar();
        extendTo(obj,_WXColorBar);
        extendTo(obj,{
            addToMap: function(map){
                if (this.location=='TopLeft'){
                    map.controls[google.maps.ControlPosition.TOP_LEFT].push(this.div);
                    this.index=map.controls[google.maps.ControlPosition.TOP_LEFT].length-1;
                }else if(this.location=='BottomLeft'){
                    map.controls[google.maps.ControlPosition.LEFT_BOTTOM].push(this.div);
                    this.index=map.controls[google.maps.ControlPosition.LEFT_BOTTOM].length-1;
                }else if(this.location=='BottomRight'){
                    map.controls[google.maps.ControlPosition.RIGHT_BOTTOM].push(this.div);
                    this.index=map.controls[google.maps.ControlPosition.RIGHT_BOTTOM].length-1;
                }else{
                    map.controls[google.maps.ControlPosition.TOP_RIGHT].push(this.div);
                    this.index=map.controls[google.maps.ControlPosition.TOP_RIGHT].length-1;
                }
                this.map=map;
            },
            removeFromMap: function(){
                if (this.location=='TopLeft'){
                    this.map.controls[google.maps.ControlPosition.TOP_LEFT].removeAt(this.index);
                }else if(this.location=='BottomLeft'){
                    this.map.controls[google.maps.ControlPosition.LEFT_BOTTOM].removeAt(this.index);
                }else if(this.location=='BottomRight'){
                    this.map.controls[google.maps.ControlPosition.RIGHT_BOTTOM].removeAt(this.inex);
                }else{
                    this.map.controls[google.maps.ControlPosition.TOP_RIGHT].removeAt(this.index);
                }
            }
        })
        obj.initialize(options);
        return obj;
    }
}
/*
Section: WXTiles views
 These are the currently available forecast views on legacy WXTiles:
  rain - Precipitation and MSLP
  wind - Wind (at 10m above surface)
  tmp - Temperature (at 2m above surface)
  hs - Significant wave height
  tp - Peak wave period
  sst - Sea surface temperature
  satir -  Infrared satellite cloud view
  satenh - Enhanced infrared satellite cloud view
  satvis - Visible satellite
*/
