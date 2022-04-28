
/*
 *  structures
 *    trees  associative array of tree objects loaded via AJAX
 *        index is tree.id
 *        tree has properties:
 *            id - tree id
 *            latin - latin name
 *            common - common name
 *            sitecode - code of site where tree is located 
 *            latitude, longitude - tree position
 *            girth - if not 0 is girth in cms
 *            height
 *            width
 *            state - tree state  
 *            condition  - condition , a comment
 * 
 *   selection  array in ascending order of distance (from current location)
 *        distance,
 *        direction from point
 *        tree_id
 *   statesx  array of states and icons for markers
 * 
 *   markers - associative array of google.maps.Marker objects 
 *        markers hold the usual properties but also an added id to link to the tree object
 * 
 *   on startup, if rlatitude, rlongitude set from query parameters, these will be the initial
 *   location.  If not, the GPS interface is queried to obtain the current location.
 * 
 */
var base_url = "https://bristoltrees.space/trees/locate-3.xq?";

var compass_points = ["N","NNE","NE","ENE","E","ESE","SE","SSE","S","SSW","SW","WSW","W","WNW","NW","NNW"];
var compass_points_text = [
    "North", "Nor Nor East", "Northeast", "East Nor East", "East",
    "East Sow East", "South East", "Sow Sow East","South",
    "Sow Sow West", "Sow West", "West Sow West", "West",
    "West Nor West", "North West", "Nor Nor West"];
    
var here_icon = "https://maps.google.com/mapfiles/kml/pal4/icon49.png";
var nearest_icon = "https://maps.google.com/mapfiles/kml/pal2/icon4.png";
var crosshairs = {
    url: "/trees/assets/icons/crosshairs2.png",
    anchor: new google.maps.Point(16,16)
  };

var infowindow = null;
var markers = {};

var map;
var here ;
var trees;
var selection ;

//  nearest tree controls
var nearest = null;
var near_threshold = 10;
var hold_ratio = 0.9;
var mlatitude; 
var mlongitude;
var alpha = 0.9;   // lat/long hystersis
var watching =false;
var was_watching = false;
var watch_id ;


//  range-based dynamic loading
var dynamic = false
var load_lat = 0;
var load_long  =0;
var all_loaded=false;
var default_range = 50;
// talking

var talk=false;

// show bubble

var bubble=false;

// login
var username;

//geocoder
var geocoder = new google.maps.Geocoder();

// base function
function radians(degrees) {
   return degrees * Math.PI / 180;
}
 
function degrees(radians) {
   return radians * 180 / Math.PI;
}

function round_degrees(degrees) {
  return  Math.round(degrees * 100000) / 100000; 
}

function distance_direction(flat,flong,slat,slong) {
      midlat = (Number(flat) + Number(slat)) /2.0;
      midrad = radians(midlat);
      longCorr = Math.cos(midrad);
      dlat =  (flat - slat) * 60;
      dlong = (flong - slong) * 60 * longCorr;
      deg = Math.round(degrees(Math.atan2(-dlat,-dlong)));
      if (deg < 0 ) deg +=  360;
      return {distance : Math.sqrt((dlat * dlat) + (dlong * dlong)) * 1852 ,
              direction :( 450 - deg ) % 360
             }
}

function compass_point(dir) {
   var point =  Math.floor((dir + 11.25) / 22.5) % 16 ;
   return compass_points[point];
}

function compass_text(dir) {
   var point =  Math.floor((dir + 11.25) / 22.5) % 16 ;
   return compass_points_text[point];
}

function sort_by_distance(a,b) {
   return ((a.distance < b.distance) ? -1 : ((a.distance > b.distance)? 1 : 0 ));
}

function capitalize(str) {
    return str.charAt(0).toUpperCase() + str.slice(1);
}

// tree functions


function get_tree_icon(tree) {
    for (var i in statesx){
        if (statesx[i].state==tree.state)
        return statesx[i].icon;
    }
}

function tree_info(tree) {
console.log(tree);
      var html = "<div style='font-size: 14pt';>";
      html+="<b><a target='_blank' class='external' href='/Tree/tree/"+tree.id+"'>"+tree.id+"</a></b><br/>";
      if (typeof tree.latin !='undefined') html+= "<em>"+tree.latin+"</em>"+"<br/>"
      if (typeof tree.common !='undefined') html+= "<span>"+tree.common+"</span>"+"<br/>"
      if (typeof tree.state != 'undefined' && tree.state != "Tree") html+= tree.state +" ";
      if (typeof tree.sitecode != 'undefined' ) html+= "Site: " + tree.sitecode +"<br/>";
      if (typeof tree.girth != 'undefined') html+= " Girth " + tree.girth + " cm <br/>" ;
      console.log("username",username);
      if  (username) { 
           html += "&#160;&#160;<button class='buttonc' id='editbtn' onclick='edit_tree(\""+tree.id+"\")' >Edit</button>";
           html += "&#160;&#160;<button class='buttonc' id='movebtn' onclick='move_tree(\""+tree.id+"\")' >Move</button>";          
           html += "&#160;&#160;<button class='buttonc' id='photobtn' onclick='photo_tree(\""+tree.id+"\")' >Add Photo</button>";          
           } 
      else html += "&#160;<button id='photobtn' onclick='photo_tree(\""+tree.id+"\")' >Submit photo</button>";  
      html += "</div>";
      return html
}

//  map creation
// initialize global map variables


function initialize_map(){
  var canvas = document.getElementById("map_canvas");
  var position = new google.maps.LatLng(latitude,longitude);
  map = new google.maps.Map(canvas,{
      zoom:  18,
      center: position,
      panControl: false,
      zoomControl: true,
      zoomControlOptions: {position: google.maps.ControlPosition.TOP_RIGHT},
      mapTypeControl: false,
      scaleControl: true,
      streetViewControl: false,
      overviewMapControl: false, 
      fullscreenControl: false,
      rotateControl: false,
      mapTypeId: 'satellite'
      }); 


   google.maps.event.addListener(map,'dblclick', 
       function(event) {
           jump_position(event.latLng);
       }
   );

  here = new google.maps.Marker({
          position: position,
          title: "Here",
          draggable: true,
          map: map,
          zIndex: google.maps.Marker.MAX_ZINDEX + 1,
          icon: here_icon
       });
      
   google.maps.event.addListener(
         here,
         'dragend',
         function () {
             jump_position(here.getPosition());
          }
       );     
   google.maps.event.addListener(here,'click', function() {
                   infowindow.setContent(this.html);
                   infowindow.open(map, this);
                   });
  markers = {};
  infowindow =  new google.maps.InfoWindow( {
          content: "loading ... "
       });  
  google.maps.event.addListener(infowindow, 'closeclick', function() {  
    close_window();  
     });
}


function set_draggable() {
   console.log(markers.length);
   console.log(markers[0]);
   for (var mark in markers) 
         mark.setDraggable(true) ;   
}

function refresh() {
    nearest = null;
//   get_position();
    update_visible_trees(); 
}

function centre_here() {
    get_position();
    if (dynamic) load_range();
  
}
//  functions to update the map

function make_marker (tree) {
    var id = tree.id;
    var position = new google.maps.LatLng(tree.latitude,tree.longitude);
    var icon = get_tree_icon(tree);
    var marker = new google.maps.Marker({
                 position: position,
                 title: tree.id + (typeof tree.latin != 'undefined' ? ' '+tree.latin : ""),
                 id: tree.id,
                 draggable: false,
                 map: map,
                 icon: icon
              });
    markers[id]=marker;
    google.maps.event.addListener(marker,'click', function() {
                  
                      var tree = trees[this.id];
                      var html = tree_info(tree);
                      infowindow.id=id;
                      infowindow.setContent(html);
                      infowindow.open(map, this);   
                 
    });
    
    google.maps.event.addListener(
         marker,
         'dragend',
         function () {
             update_tree_position(marker);
          }
       );  
}

function update_tree_position(marker) {
    if (username) {
        var id = marker.id;
        var tree = trees[id];
        var latlng = marker.position;
        tree.latitude = latlng.lat().toFixed(6);
        tree.longitude= latlng.lng().toFixed(6);
        
    } 
}

function update_map_here() {
    var position = new google.maps.LatLng(latitude,longitude);
    map.setCenter(position);
    map.setTilt(0);
    here.setPosition(position);
    html = '<div>'+latitude.toFixed(5)+','+longitude.toFixed(5)+'<br/>';
    if (username) {
         html+="<button class='button' onclick='add_tree()'>Add Tree</button>";     
        }
    html+="&#160;&#160;<button class='button' onclick='photo_tree()'>Add Photo</button>";
    html+='</div>';
    here.html=html;
    $('#rlatitude').val(latitude.toFixed(5));
    $('#rlongitude').val(longitude.toFixed(5));
}


function set_bubble() {
    bubble= ! bubble;
    if (bubble) {
        $('#bubble').html("Hide Info"); 
        update_visible_trees();
    }
    else {
        $('#bubble').html("Show Info");
        if (infowindow) infowindow.close();
        }
}

function update_visible_trees() {
    var view_count = $('#view_count').val();
    selection = nearby_by_count(view_count);
    var live = {};
    for (var i in selection){
       var id =selection[i].tree_id;
       var tree = trees[id];
       var mark =  markers[id];
       if (mark === undefined )   {    // missing 
          make_marker(tree);
          live[id]=1;
          }
       else  { // update
          if (mark.map === null) mark.setMap(map);  
          live[id]=1;
       }
   }
   
   for (var k in markers) {
       if (live[k] === undefined) {
          mark = markers[k];
          mark.setMap(null);  
       }  
   }
   show_nearest();
}

function show_nearest(){     
   if (selection.length > 0 ) {  // there is a nearest and info bubble to be shown
       var near = selection[0];
       var id = near.tree_id;
 //      alert (nearest+' '+id);
       var tree = trees[id];
       var dist = Math.round(near.distance);
       var dir =  Math.round(near.direction);
       if (nearest === null ) {  //  no current nearest
           var marker = markers[id];
           marker.setIcon(nearest_icon);
           var html =  tree.common + " at " + dist+ "m , " + dir + '° [' + compass_point(dir) + ']';
           $('#nearest').html(html);
           if (bubble) google.maps.event.trigger(marker,'click');
           if (dist <= near_threshold) 
              say_tree(near);
           nearest = near;
          }
       
       else if (id != nearest.tree_id ) {   // there is a nearest and its not this nearest one
           var ntree = trees[nearest.tree_id]; 
           var oldnearest = typeof ntree !== 'undefined';
//           alert(oldnearest);
           if (oldnearest) {
              var nearest_dist_dir =  distance_direction (latitude,longitude,ntree.latitude,ntree.longitude);
              if (  dist <  nearest_dist_dir.distance * hold_ratio) {  // switch to new nearest
                 markers[nearest.tree_id].setIcon(get_tree_icon(ntree));  // revert
                 var marker = markers[id];
                 marker.setIcon(nearest_icon);
                 if (bubble) google.maps.event.trigger(marker,'click');
 
                 var html =  tree.common + " at " + dist+ "m , " + dir + '° [' + compass_point(dir) + ']';
                   $('#nearest').html(html);

                 if (dist <= near_threshold) 
                    say_tree(near);
                 nearest = near;
               }
               else  // keep the old nearest tll nearer
                   var html =  ntree.common + " at " + dist+ "m , " + dir + '° [' + compass_point(dir) + ']';
             }
             else  {// old nearest no more 
                 var marker = markers[id];
                 marker.setIcon(nearest_icon);
                 if (bubble) google.maps.event.trigger(marker,'click');
 
                 var html =  tree.common + " at " + dist+ "m , " + dir + '° [' + compass_point(dir) + ']';
                   $('#nearest').html(html);

                 if (dist <= near_threshold) 
                    say_tree(near);
                 nearest = near;
               }
              $('#nearest').html(html);
       }
       else if (tree.id == nearest.tree_id) {  // updated nearest
            
            var html =  tree.common + " at " + dist+ "m , " + dir + '° [' + compass_point(dir) + ']';
            $('#nearest').html(html);
            if (dist < near_threshold && nearest.distance > near_threshold )
              say_tree(near);
            nearest = near;
       }
   }   

   else {  // no new nearest  
      if (nearest !== null) {  // revert the old nearest
          markers[nearest.tree_id].setIcon(get_tree_icon(ntree)); 
          $('#nearest').html("");
      }
      nearest = null;
   }
}

/*
 * select trees within viewing distance
 * input - trees  
 *       lat, long  position
 *       range - distance in m from position
 * 
 * output - selection of trees in order of increasing distance from position within range, augmented with distance and direction
 */


function nearby_by_range(range) {
     var selection =[];
     for (var k in trees) {
         var tree = trees[k];
         var dist_dir = distance_direction(latitude,longitude,tree.latitude,tree.longitude);
          if (dist_dir.distance <= range) 
                     selection.push({distance: dist_dir.distance, direction: dist_dir.direction, tree_id: tree.id});
       }
     return selection.sort(sort_by_distance);       
}

function nearby_by_count(count) {
     var selection =[];
     for (var k in trees) {
         var tree = trees[k];
         var dist_dir = distance_direction(latitude,longitude,tree.latitude,tree.longitude);
         selection.push({distance: dist_dir.distance, direction: dist_dir.direction, tree_id: tree.id});
       }
     return selection.sort(sort_by_distance).slice(0,count);  
}
//  main page and map updater

function jump_position(latlng) {
    latitude = latlng.lat();
    longitude= latlng.lng();
    update();
}

function set_latlng(position) {
    var lat = round_degrees(position.coords.latitude);
    var lng = round_degrees(position.coords.longitude); 
    if (latitude == 0 ) latitude = lat; else latitude = alpha * lat + (1.0- alpha) * latitude;
    if (longitude == 0 ) longitude  = lng; else longitude = alpha * lng + (1.0- alpha) * longitude;
    update()
}

// text-to-speech
function say_tree(nearest) {
   if (! talk) return;
   var tree = trees[nearest.tree_id];
   var text = "";
   var dist = Math.round(nearest.distance);
   var plural = dist > 1 ? "s" : "";
   var dir =  Math.round(nearest.direction);
   var name = tree.common !== undefined ? tree.common : "undentified tree";
   var vowelRegex = '^[aieouAIEOU].*';
   var starts_vowel = name.match(vowelRegex);
   var particle = starts_vowel ? "An" : "A";
   var compass = compass_text(dir) ;
   text += dist + " metre" + plural  + " away in direction " + compass + " is " + particle + " "+ name + ". ";
   if (tree.state != "Tree") text+= " It is a " + tree.state + ".";
   if (typeof tree.girth != 'undefined' )
       text += "Girth is "+ tree.girth + " centimeters.";
   text+="";
   speak(text);
}

function set_talk() {
    talk = ! talk;
    if (talk)  { $('#talk').html("Silent");}
    else $('#talk').html("Talk");
}

function speak(message) {
 //   alert(message);
    var speech = new SpeechSynthesisUtterance();
  // Set the text and voice attributes.
	speech.text = message;
	speech.volume = 1;
	speech.rate = 1;
	speech.pitch = 1;
	speechSynthesis.speak(speech);
}

// edit tree 
function clear_tree_form(tree) {   
    $('#id').val("");
    $('#sitecode').val("");
    $('#latin').val("");
    $('#common').val("");
    $('#girth').val("");
    $('#height').val("");
    $('#width').val("");
    $('#condition').val("");
    $('#latitude').val("");
    $('#longitude').val("");
    $('#state option[0]').prop('selected', true);
    $("#update1").html("");   
}

function tree_to_form(tree) { 
console.log("tree-to-form",tree);
    $('#edit-mode').val("");
    $('#id').val(tree.id);
    $('#id').prop('readonly','readonly')
    $('#sitecode').val(tree.sitecode);
    $('#latin').val(tree.latin);
    $('#common').val(tree.common);
    $('#girth').val(tree.girth);
    $('#height').val(tree.height);
    $('#width').val(tree.width);
    $('#condition').val(tree.condition);
    $('#latitude').val(tree.latitude);
    $('#longitude').val(tree.longitude);
    $('#state option[value="'+tree.state+'"]').prop('selected', true);
    $("#update1").html("Update");   
}

function move_tree(id) {   
     marker = markers[id];
     if (marker.draggable) {
         save_move(id);
         marker.setDraggable(false);
         $("#movebtn").text("Move");
     }
     else  {
        marker.setDraggable(true); 
        marker.setIcon(crosshairs);
        $("#movebtn").text("Save");
        tree=trees[id];
      }   
}

function delete_tree() {
/* 
 *   confirm deletion
 *   if confirmed 
 *     use update_tree to do the deletion
 *     remove the tree from the current set of trees
 */ 
      var id = $('#id').val();
      var tree = trees[id];
      if (window.confirm("Do you really want to delete tree with id " + id + " ?")) {
      var url = "../trees/Locate/ajax/update-tree.xq?mode=delete&id="+id+"&user="+username;
         $.ajax({
             url: url,
             //force to handle it as text
             dataType: "text", 
             success: function(data) {
                var result = $.parseJSON(data);
                if (result.error)  {
                    alert(result.error);
                    }
                else {
                    delete trees[id];
                    markers[id].setMap(null);
                    delete markers[id];
                    tab(1);
                }
             }  
           });
           
      }
}

function close_window() {
    id = infowindow.id;
    tree=trees[id];
    marker = markers[id];
    marker.setDraggable(false);
    marker.setIcon(get_tree_icon(tree));
    $("#movebtn").text("Move");
}

function edit_tree(id) {
   var tree = trees[id];
   clear_tree_form();
   $('#prefix-row').hide();
   tree_to_form(tree);
   $("#edit-mode").html("Update");
   was_watching = watching;
   set_follow(false);
   tab(3);
}

function add_tree(id) {
   clear_tree_form();
   $('#prefix-row').show();
   var rgreencode = $('#rgreencode').val();
   var rsitecode = $('#rsitecode').val();
   var sitecode = rgreencode !="" ? rgreencode : rsitecode
   $("#sitecode").val(sitecode);
   $("#latitude").val(latitude.toFixed(6));
   $("#longitude").val(longitude.toFixed(6));
   $("#edit-mode").html("Add");
   $("#update1").html("Add Tree");
   was_watching = watching;
   set_follow(false);
   tab(3);
}

function photo_tree(id) {
   $("#treeid").val(id);
   $("#photographer").val(username);
   $("#photo-result").html("");
   $("#caption").val("");
   $("#file").val("");
   $("#photo-latitude").val(latitude.toFixed(6));
   $("#photo-longitude").val(longitude.toFixed(6));
   tab(4);
}

function add_photo_submit() {
   $("#photoSubmit").click(function (event) { 
       event.preventDefault();
       var form = $("#photoForm")[0];
       var fdata = new FormData(form);
       $("#photoSubmit").prop("disabled", true);
       $.ajax({
            type: "POST",
            enctype: 'multipart/form-data',
            url: "../trees/Locate/ajax/store-photo.xq",
            data: fdata,
            dataType: "html",
            processData: false,
            contentType: false,
            cache: false,
            timeout: 600000,
            success: function (data) {
                $("#photo-result").html(data);
                console.log("SUCCESS : ", data);
 //               alert(data);
                $("#photoSubmit").prop("disabled", false);
               
            },
            error: function (e) {

                $("#photo-result").text(e.responseText);
                console.log("ERROR : ", e);
//                alert("error");
                $("#photoSubmit").prop("disabled", false);
            }
        });
   });
   $("#photoCancel").click(function (event) { 
       event.preventDefault();
       tab(1);
    });
 
}

function blank(t) {
    if (t === undefined) return '' ;  else return t;
}

function save_cancel() {
     set_follow(was_watching);
     tab(1);
}

function save_move(id) {
    tree = trees[id];
    latitude =tree.latitude;
    longitude =tree.longitude;   
    var url = "../trees/Locate/ajax/update-tree.xq?mode=update&id="+id+"&user="+username+"&latitude="+latitude+"&longitude="+longitude;
//    alert(url);
    $.ajax({
          url: url,
          //force to handle it as text
          dataType: "text", 
          success: function(data) {
                var tree = $.parseJSON(data);
                trees[tree.id] = tree;
                mark = markers[tree.id];
                mark.setIcon(get_tree_icon(tree));
           }  
      });
      tab(1);
}

function save_tree() {
    id=$('#id').val().toUpperCase();
    prefix=$('#prefix').val().toUpperCase();
    sitecode=$('#sitecode').val().toUpperCase();
    common=$('#common').val();
    common = capitalize(common);
    latin=$('#latin').val();
    girth=$('#girth').val();
    height=$('#height').val();
    width=$('#width').val();
    state=$('#state').val();
    condition=$('#condition').val();
    latitude =$('#latitude').val();
    longitude =$('#longitude').val(); 
    mode=$('#edit-mode').html();
//    alert(mode);
    if (mode=="Update") {
    var url = "../trees/Locate/ajax/update-tree.xq?mode=update&id="+id+"&sitecode="+sitecode+"&user="+username+"&latin="+latin+"&common="+common+"&latitude="+latitude+"&longitude="+longitude+"&girth="+girth+"&height="+height+"&width="+width+"&state="+state+"&condition="+condition;

//   alert(url);
    $.ajax({
          url: url,
          //force to handle it as text
          dataType: "text", 
          success: function(data) {
                var tree = $.parseJSON(data);
                if (tree.error) {
                   alert(tree.error);
                }
                else {             
                   trees[tree.id] = tree;
                   mark = markers[tree.id];
                   mark.setIcon(get_tree_icon(tree));
                   mark.setDraggable(false);
                   google.maps.event.trigger(mark,'click');
                   set_follow(was_watching);
                   tab(1);
                }
               
                   
           }  
      });
      }
     else if (mode=="Add") {
     var url = "../trees/Locate/ajax/update-tree.xq?mode=add&prefix="+prefix+"&sitecode="+sitecode+"&user="+username+"&latin="+latin+"&common="+common+"&latitude="+latitude+"&longitude="+longitude+"&girth="+girth+"&height="+height+"&width="+width+"&state="+state+"&condition="+condition;
//   alert(url);
     $.ajax({
          url: url,
          //force to handle it as text
          dataType: "text", 
          success: function(data) {
                var tree = $.parseJSON(data);
                if (tree.error) {
                   alert(tree.error);
                }
                else {
                   trees[tree.id] = tree;
                   console.log(tree);
                   make_marker(tree);
                   set_follow(was_watching);
                   tab(1);
                }
          }
      });
      }  
     
}

/* 
   * load trees from external script
 */
function load_trees() {
     var load_range = $('#rrange').val();   
     var url = "../trees/Locate/ajax/tree-subset.xq?latitude="+latitude+"&longitude="+longitude+"&range="+load_range;
     load_url(url);
}

 
function find_trees () {
     var load_range = $('#rrange').val();  
     var rlatitude =$('#rlatitude').val();
     var rlongitude =$('#rlongitude').val();
     var rcollection = $('#rcollection').val();
     var rgreencode = $('#rgreencode').val();
     var rsitecode = $('#rsitecode').val();
     var sitecode = rgreencode !="" ? rgreencode : rsitecode
     var rlatin = $('#rlatin').val();
     var rcommon = $('#rcommon').val();    
     var rid = $('#rid').val();
     var url = "../trees/Locate/ajax/tree-subset.xq?range="+load_range+"&latitude="+rlatitude+"&longitude="+rlongitude+"&collection="+rcollection+"&sitecode="+sitecode+"&latin="+rlatin+"&common="+rcommon+"&id="+rid;
     dynamic= load_range > 0;
     load_url(url);
}


function clear_find_form() {
    $('#raddress').val("");
    $('#rrange').val("");  
    $('#rlatitude').val("");
    $('#rlongitude').val("");
    $('#rcollection').val("");
    $('#rgreencode').val("");
    $('#rsitecode').val("");
    $('#rlatin').val("");
    $('#rcommon').val("");
    $('#rid').val("");
    
    window.history.pushState({}, null, base_url);
}

function load_url(url) {
    set_follow(false);
    console.log(url);
    $.ajax({
          url: url,
          //force to handle it as text
           dataType: "text",
           success: function(data) {
                ts = $.parseJSON(data);
                if(ts) {
                   trees=[];
                   for (var i in ts.tree) {
                      t= ts.tree[i];
                      trees[t.id]=t;
                   }              
                   trees_loaded(ts.title,ts.latitude,ts.longitude,ts.zoom,ts.url,ts.ntrees);                   
                   all_loaded=true;
                   tab(1);
                }
              else {
                 $('#loaded').html("No trees found");
                 
                 tab(0);
              }
           }  
      }); 
}

function trees_loaded(title,lat,long,zoom,url,ntrees) {
    $('#loaded').html(title);
    window.history.pushState({}, null, base_url+url);
    latitude = parseFloat(lat);
    longitude=  parseFloat(long);
    load_lat = latitude;
    load_long = longitude;
    
    if (map === undefined)  
        initialize_map();
    update_map_here()

    map.setZoom(parseFloat(zoom));
    if (! dynamic) {
       $('#view_count').val(ntrees); 
    }
    else $('#view_count').val(default_range);
    update_visible_trees();
    console.log("trees loaded",load_lat);
}

function update() {
    if (map === undefined)  
        initialize_map();
    update_map_here();
    if (dynamic) {
        var offset = distance_direction(load_lat,load_long,latitude,longitude).distance;
        var load_range = $('#rrange').val();
        var out_of_range = offset > Number(load_range) * 0.8;
        console.log("Distance from load position "+offset+" outofrange "+out_of_range);
        if ( out_of_range ) 
           load_trees();
        }
    update_visible_trees();    
}

// geolocation
function my_position() {
     if (navigator.geolocation) {
       navigator.geolocation.getCurrentPosition(set_latlng_form, errorFunction,{enableHighAccuracy:true});
    } else {
       alert("no navigator");
       
    }
}

function set_latlng_form(position) {
    var lat = round_degrees(position.coords.latitude);
    var lng = round_degrees(position.coords.longitude); 
    $('#rlatitude').val(lat.toFixed(5));
    $('#rlongitude').val(lng.toFixed(5));  
}

function get_position() {
     if (navigator.geolocation) {
       navigator.geolocation.getCurrentPosition(set_latlng, errorFunction,{enableHighAccuracy:true});
    } else {
       alert("no location available");
    }
}

function set_follow(do_watch) {
   if (navigator.geolocation) {
      if(! do_watch) {
         navigator.geolocation.clearWatch(watch_id);
         watching = false;
         $('#watching').text('Follow Me');
         // alert("watching now off");  
      }
      else {
          watch_id =  navigator.geolocation.watchPosition(set_latlng, errorFunction, {enableHighAccuracy:true,maximumage:30000});
          watching = true;
          $('#watching').text('Following');
          // alert("watching now on"); 
      }
   }
   else alert("no navigator")
}

function watch_change() {
     set_follow( ! watching);
}

function errorFunction(error) {
    alert('Error!' + JSON.stringify(error));
}
 
function address_lookup() {
    address = $('#raddress').val();
    address = address.trim();
    if (address !="") {
       geocoder.geocode(
       {'address':address+', Bristol UK'} , 
       function(results,status) {
         if (status==google.maps.GeocoderStatus.OK) {
            var latlong = results[0].geometry.location;
            console.log(latlong);
            $('#rlatitude').val(latlong.lat().toFixed(5));
            $('#rlongitude').val(latlong.lng().toFixed(5));
          } else 
            alert("Geocoding "+address +" was not successful for the following reason: " + status);
      }
     );
   }
};


// user login/logout

function login_status() {
    var url="../trees/Locate/ajax/lgn.xq?action=username";
    $.ajax({
          url: url,
          //force to handle it as text
           dataType: "text",
           success: function(data) {
                ts = $.parseJSON(data); 
                if(ts.action=='username') {
                   username = ts.username; 
                   $('#username_status').html("<span>"+username+" Logged in " +"<button class='buttonb' onclick='logout()'>Logout</button></span>");
                   console.log("logged in");
                   $('#login_form').hide();
                 }
                else {
                   $('#username_status').html("Log in");
                   $('#login_form').show();
                }
           } 
      }); 
}

function login() {
    var email = $('#email').val();
    var pw = $('#pw').val();
    var url="../trees/Locate/ajax/lgn.xq?action=login&email="+email+"&password="+pw;
    $.ajax({
          url: url,
          //force to handle it as text
           dataType: "text",
           success: function(data) {
                ts = $.parseJSON(data);               
                if(ts.action=='login') {
                   username = ts.username; 
                   $('#username_status').html("<span>"+username+" Logged in " +"<button class='buttonb' onclick='logout()'>Logout</button></span>");
                   $('#login_form').hide();

                }
                else {
                    alert("login failed");
                    $('#login_form').show();
                    }
           }  
      }); 
}

function logout() {
    var url="../trees/Locate/ajax/lgn.xq?action=logout";
    $.ajax({
          url: url,
          //force to handle it as text
           dataType: "text",
           success: function(data) {
                ts = $.parseJSON(data);               
                if(ts.action=='logout') {
                   username = null; 
                   $('#username_status').html("Log in");
                   $('#login_form').show();

                }
                else {
                    alert("logout failed");
                    $('#login_form').show();
                    }
           }  
      }); 
}

function startup() {    
     add_photo_submit();  
     login_status();
     find_trees();
}

     
