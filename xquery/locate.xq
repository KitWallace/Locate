import module namespace tp = "http://kitwallace.co.uk/lib/tp" at "lib/tp.xqm";

declare option exist:serialize "method=xhtml media-type=text/html omit-xml-declaration=no indent=yes 
        doctype-public=-//W3C//DTD&#160;XHTML&#160;1.0&#160;Transitional//EN
        doctype-system=http://www.w3.org/TR/xhtml1/DTD/xhtml1-transitional.dtd";


let $range := request:get-parameter("range",())
let $view_count := request:get-parameter("view_count",())
let $raddress := request:get-parameter("address",())
let $rid := request:get-parameter("id",()) 
let $rlatitude := request:get-parameter("latitude",())
let $rlongitude := request:get-parameter("longitude",())
let $rcollection := request:get-parameter("collection",())
let $rsitecode := request:get-parameter("sitecode",())
let $rlatin := request:get-parameter("latin",())
let $rcommon := request:get-parameter("common",())
return
<html>
    <head>    
        <link rel="stylesheet" type="text/css" href="../assets/mobile.css"></link>
        <script type="text/javascript" src="https://ajax.googleapis.com/ajax/libs/jquery/1.7.1/jquery.min.js"></script> 
        <script src="https://maps.googleapis.com/maps/api/js?key={$tp:googlekey}"></script>
        <script type="text/javascript">
        var ntabs=5;
        var statesx = [  
           {string-join(
               for $state in $tp:states/state
               return 
                    concat("{state : '",$state/name,"', icon : '",$state/icon ,"'}")
                    ,",")
           }
        ];
        </script>
        <script src="../javascript/locate.js" type="text/javascript" charset="utf-8"></script>
        <script src="../javascript/controls.js" type="text/javascript" charset="utf-8"></script>
        <meta name="viewport" content="width=device-width, initial-scale=1"/>
     <link href="../assets/7sisters.png" rel="icon" sizes="128x128" />
    <link rel="shortcut icon" type="image/png" href="../assets/7sisters.png"/>
    </head>
    <body  onload="startup()">       
       <div>
         <h2><a target="_blank" class="external" href="/Tree/">Bristol Trees </a> &#160;<a href="?">Tree map</a></h2>
         <div>
            <span>
                <button class="button"  id="but0" onClick="tab(0)">Setup</button>
            </span>&#160; 
            <span>
                <button class="button" id="but1" onClick="tab(1)">Map</button>
            </span>&#160; 
           <span>
                <button class="button" id="but2" onClick="tab(2)">Help</button>
            </span>&#160;
           
            </div>
        <hr/>
          <div id="tab0"  style="display:none"> 
             <h3><span id="username_status"></span></h3>
             <div id="login_form" name="login_form" style="display:none">  
                email address <input name="email" id="email" size="30"/>
                &#160;password <input type="password" name="pw" id="pw" />
                &#160;<button class="button" id="login" onClick="login()">Login</button>
            </div>
    
          <h3>Trees loaded</h3>
             <div><span name="loaded" id="loaded"/>  
             <!-- &#160; <span><a id="link" href="">Link</a></span> -->
             </div>
             Showing nearest  <input type="text" name="view_count" id="view_count" value="{$view_count}" size="4"  onchange="refresh()"/> trees. 
          <h3>Tree selection</h3> 
  
              <table>
              <tr><td/><td>
              <button class="button" onclick="find_trees()">Load Trees</button>&#160; 
              <button class="button" onclick="clear_find_form()">Reset</button></td></tr>
                <tr><th>Address&#160;<span class="tooltip">
                                <img src="/trees/assets/Info_Symbol.png" width="15px"/>
                                <span class="tooltiptext">Enter a Bristol address. This will be completed with "Bristol UK".</span>
                            </span>
                     </th><td><input type="text" id="raddress" value="{$raddress}" size="20"/>&#160;<button class="button" onclick="address_lookup()">Lookup</button> </td></tr>
                <tr><th>Lat/Long&#160;<span class="tooltip">
                                <img src="/trees/assets/Info_Symbol.png" width="15px"/>
                                <span class="tooltiptext">This can be user to enter a latitude and longitude or it will be set by the address lookup  or from your current location.</span>
                            </span>
                    </th><td><input type="text" id ="rlatitude"value="{$rlatitude}" size="10"/>&#160;<input type="text" id="rlongitude" value="{$rlongitude}" size="10"/> &#160;<button onclick="my_position()">Set to my location</button>
                </td></tr>
                <tr><th>Within range&#160;<span class="tooltip">
                                <img src="/trees/assets/Info_Symbol.png" width="15px"/>
                                <span class="tooltiptext">If range is set, trees will be loade incrementally as the current location changes either because the current point is moved on the map or the device's location chnages.</span>
                            </span>
                            
                    </th><td> <input type="text"id="rrange" value="{$range}" size="4"/> metres.</td></tr>
              
                <tr><th>With id(prefix)&#160;<span class="tooltip">
                                <img src="/trees/assets/Info_Symbol.png" width="15px"/>
                                <span class="tooltiptext">Select a single tree or all tress with a given prefix.</span>
                            </span></th>
                       <td><input type="text" id="rid" size="15" value="{$rid}"/></td></tr>
                <tr><th>In collection&#160;<span class="tooltip">
                                <img src="/trees/assets/Info_Symbol.png" width="15px"/>
                                <span class="tooltiptext">Select all trees in one of the curated collections.</span>
                            </span></th><td><select  id="rcollection">  
                <option value="">Select collection</option>
              {for $col in $tp:collectionlist//collection
               order by $col/name
               return
                    <option>{if ($col/name = $rcollection) then attribute selected {"selected"} else () }{$col/name/string()}</option>
              }</select></td></tr>
                <tr><th>In a Green Space&#160;<span class="tooltip">
                                <img src="/trees/assets/Info_Symbol.png" width="15px"/>
                                <span class="tooltiptext">Select trees in a park, nature reserve or other open space.</span>
                            </span></th><td><select id="rgreencode">
              <option value="">Select Green Space</option>
              {for $site in tp:get-green-subsites()[treecount>0]
               order by $site/name[1]
               return
                   <option value="{$site/sitecode[1]}">{if ($site/sitecode=$rsitecode) then attribute selected {"selected"} else ()}{$site/name[1]/string()}</option>
              }
              </select></td></tr>
              <tr><th>With sitecode&#160;<span class="tooltip">
                                <img src="/trees/assets/Info_Symbol.png" width="15px"/>
                                <span class="tooltiptext">Select trees on a site with a system sitecode.</span>
                            </span></th><td><input type="text" id="rsitecode" value="{$rsitecode}" size="10"/></td></tr>
              <tr><th>With common name&#160;<span class="tooltip">
                                <img src="/trees/assets/Info_Symbol.png" width="15px"/>
                                <span class="tooltiptext">Select trees with a Common name. This is not case-sensitive</span>
                            </span></th><td><input type="text"  id="rcommon" value="{$rcommon}" /></td></tr>
              <tr><th>With botanical name&#160;<span class="tooltip">
                                <img src="/trees/assets/Info_Symbol.png" width="15px"/>
                                <span class="tooltiptext">Select trees with a Botanical or Latin name. This is case-sensitive</span>
                            </span></th><td><input type="text" id="rlatin" value="{$rlatin}" /></td></tr>
              </table>
        </div>
        <div id="tab1">  
          <div>
            <button id="here" class="button" onclick="centre_here()">Centre on me</button>&#160;<span class="tooltip">
                                <img src="/trees/assets/Info_Symbol.png" width="15px"/>
                                <span class="tooltiptext">Click to centre the map on your current location.</span>
                            </span>
            &#160;<button id="watching" class="button" onclick="watch_change()">Follow me</button>&#160;<span class="tooltip">
                                <img src="/trees/assets/Info_Symbol.png" width="15px"/>
                                <span class="tooltiptext">When Following, the current position is updated from the device location as the devices moves</span>
                            </span>
            &#160;<button id="talk" class="button" onclick="set_talk()">Talk</button>&#160;
             <span class="tooltip">
                                <img src="/trees/assets/Info_Symbol.png" width="15px"/>
                                <span class="tooltiptext">When Talking, as you near a tree the app will tell you what tree you are near and its girth.</span>
                            </span>
            &#160;<button id="bubble" class="button" onclick="set_bubble()">Show Info</button> &#160;<span class="tooltip">
                                <img src="/trees/assets/Info_Symbol.png" width="15px"/>
                                <span class="tooltiptext">When Showing Info, the info box for the nearest tree will be displayed.</span>
                            </span>
           
           &#160;<button id="bubble" class="button" onclick="find_trees()">Refresh</button> &#160;<span class="tooltip">
                                <img src="/trees/assets/Info_Symbol.png" width="15px"/>
                                <span class="tooltiptext">Refresh the tree data and map. Helps if updates are also being made by other surveyors</span>
                            </span>
           
            </div>
          <hr/>
          <div id="map_canvas" ></div>
       </div>
 
        <div id="tab2"  style="display:none">
         <h3>Using the website</h3>
             <div>This website can be used on a laptop or a mobile phone with GPS. On a mobile phone, you will need to have mobile data turned on because in some cases the website loads new trees as you move.</div>
         <h3>How to find trees</h3>
         <div>You can select the trees to view in two ways, either by position or by selection.
         <h4>By position</h4>
         <div>Trees will be loaded dincrementally as you move around.  Range must be set to selecet this mode.</div>
         <ul><li>the initial position as a latitude and longitude can be set directly or from an address or from the location of the phone or laptop.</li>
         <li> The range parameter determines how many trees to load at a time. </li>
         
         </ul>
         </div>
           
         <h4>By Selection</h4>
          <ul>
                <li>By Tree Id :  enter the full id or just a prefix </li>
                <li>Trees in a collection</li>
                <li>Trees in a park or openspace </li>
                <li>Trees with a sitecode</li>
                <li>Trees with a common or botanical name</li>
                
          </ul> 
          <h4>To Load trees</h4>
          <ul>
           <li>Click on <b>Load Trees</b> to load all selected trees and check what has been loaded.</li>        
           <li>Click on <b>Load and show Map</b> to load all selected trees and open the Map view of these trees.</li>
          <li>Selections are combined so you can select just the Chestnuts in Ashton Court</li></ul>
         <h3>How to use the map</h3>
         
         <ul>
            <li>Click on <b>Centre on me</b> to centre the map on your current position (if a location ois avaible on the computer or phone)</li>
            <li>Click on <b>Follow Me</b> to continuously update the map position as your walk. Click <b>Following</b> to turn it off </li>
            <li>The red dot marks your location. It will move as you move if <b>Following</b></li>
            <li>If not <b>Following</b>, drag the dot or double-click on the map (possibly zoomed out) to set the current location.</li>
 <!--           <li>Click <b>Refresh</b> to refresh the tree data if it gets lost</li>  -->
            <li>Click <b>Talk</b> to turn on speech output, <b>Silent</b> to turn it off.</li>
            <li>Click <b>Show Info</b> to pop up the info window as you near a tree , <b>Hide Info</b> to turn it off.  </li>
            <li>The nearest tree is highlighted.</li> 
        </ul>
        
        <h3 style="background-color:red">The following functions require you to be logged in</h3>
        <ul>
        <li>If you are already registered as a user, Login on the Setup page with your username and password.</li>
        <li>if you are not registered, send a request to info@bristoltrees.space.</li>
        </ul>
        <h3>How to add a photo</h3>
        <div>
        <ul>
        <li>To add a photo - click the photo button on the tree's info window </li>
        <li>You can add a photo from the device or take a photo on a smartphone - use a low resolution for speed of upload </li>
        <li>Be patient - it can take a while to upload.</li>
        </ul>
        </div>
        <h3>How to edit a tree</h3>
        <div>
        <ul>
        <li>Click the Edit button on the tree's info window </li>
        <li>Edit the fields</li>
        <li>Click update to save the revised values.</li>
        <li>You can also delete at tree from this page.</li>
        </ul>
        </div>
        <h3>How to change the position of a tree</h3>
        <div>
        <ul>
        <li>Click the Move button on the tree's info window </li>
        <li>The icon will change to black crosshairs and you can now drag the icon.</li>
        <li>Move the icon to the new position</li>
        <li>Click Save to save the change, or close the window to cancel the change</li>
        </ul>
        </div>
        <h3>How to add a tree</h3>
        <div> 
        <ul>
        <li>Drag the red dot to the location of the new tree </li>
        <li>Click on the dot to bring up the info window</li>
        <li>Click Add Tree to bring up the edit window</li>
        <li>Add the supplementary data.  Of particular importance is the ID which must be created to be a unique value.  The next in sequence can be generated if a prefix is provided.</li>
        </ul>
        </div>
       <div>A <a href="https://bristoltrees.space" target="_blank" class="external">Trees of Bristol</a> production.</div>
   
       </div>               
       <div id="tab3" style="display:none">
     <h3><span id="edit-mode"/> Tree</h3> 
     <table style='font-size: 12pt;'>
     <tr><th>Id</th><td><input type='text' id='id' value='' style="background-color:lightgrey"/> </td></tr>
     <tr id="prefix-row"><th>Id Prefix&#160; <span class="tooltip">
                                <img src="/trees/assets/Info_Symbol.png" width="15px"/>
                                <span class="tooltiptext">This may be a site prefix when surveying a new site or an agree code for a survey or surveyor.</span>
                            </span></th><td><input type='text' id='prefix' value='' /> </td></tr>
     <tr><th>Sitecode &#160;<span class="tooltip">
                                <img src="/trees/assets/Info_Symbol.png" width="15px"/>
                                <span class="tooltiptext">This is the sitecode used in Bristol Trees. Case-insensitive</span>
                            </span></th><td><input type='text' id='sitecode' size="10" value=''/> </td></tr>
      <tr><th>Common name&#160;<span class="tooltip">
                                <img src="/trees/assets/Info_Symbol.png" width="15px"/>
                                <span class="tooltiptext">The common name. Case-insensitive</span>
                            </span></th><td><input type='text' id='common' size="25" value=''/></td></tr>
     <tr><th>Botanical name &#160;<span class="tooltip">
                                <img src="/trees/assets/Info_Symbol.png" width="15px"/>
                                <span class="tooltiptext">If blank, the best guess will be used.</span>
                            </span></th><td><input type='text' id='latin' size="25" value=''/></td></tr>
    <tr><th>Girth (cm) <span class="tooltip">
                                <img src="/trees/assets/Info_Symbol.png" width="15px"/>
                                <span class="tooltiptext">Measured around the tree at breast height (1.5 m)</span>
                            </span></th><td><input type='text' id='girth' size='4' value=''/></td></tr>
     <tr><th>Height(m) <span class="tooltip">
                                <img src="/trees/assets/Info_Symbol.png" width="15px"/>
                                <span class="tooltiptext">Measured from base to top of the canopy. There are apps which canhelp with this measurement.</span>
                            </span></th><td><input type='text' id='height' size='4' value=''/></td></tr>
     <tr><th>Width(m) <span class="tooltip">
                                <img src="/trees/assets/Info_Symbol.png" width="15px"/>
                                <span class="tooltiptext">The width of the tree canopy in metres</span>
                            </span></th><td><input type='text' id='width' size='4' value=''/></td></tr>
     <tr><th>State </th><td><select id='state'>{
               for $state in $tp:states/state
               return 
                    <option value="{$state/name}">{$state/name/string()}</option>
               }
          </select></td></tr>
      <tr><th>Condition&#160; <span class="tooltip">
                                <img src="/trees/assets/Info_Symbol.png" width="15px"/>
                                <span class="tooltiptext">A comment on the overall condition of the tree.</span>
                            </span></th><td><input type='text' id='condition' size="30" value=''/></td></tr>
      <tr><th>Latitude</th><td> <input type='text' id='latitude' value=''/></td></tr>
      <tr><th>Longitude</th><td><input type='text' id='longitude' value=''/></td></tr>
      <tr><th></th><td><button id='update1' onclick='save_tree()' style="background-color:red" >Update</button>
               &#160;<button  id='deletebtn' onclick='delete_tree()' >Delete</button>          
               &#160;<button id='update3' onclick='save_cancel()'>Cancel</button>
       </td></tr>
      </table>
      </div>
 
     <div id="tab4" style="display:none">
      <h3>Add Photo</h3> 
      <div> ?  optional field</div>
     <form id="photoForm"  >
     <table style='font-size: 12pt;'>
     <tr><th>Id</th><td><input type='text' name='treeid' id='treeid' value='' readonly="readonly" style="background-color:lightgrey"/></td></tr>  
     <tr><th>Photographer</th><td><input type='text' id="photographer" name='photographer' size="25" value=''/></td></tr>
     <tr><th>Caption ?</th><td><input type='text' id="caption" name='caption' size="25" value=''/></td></tr>
     <tr><th>Latitude</th><td><input type='text' id="photo-latitude" name='photo-latitude' size="10" value=''/></td></tr>
     <tr><th>Longitude</th><td><input type='text' id="photo-longitude" name='photo-longitude' size="10" value=''/></td></tr>
     <tr><th>Photo <span class="tooltip">
                                <img src="/trees/assets/Info_Symbol.png" width="15px"/>
                                <span class="tooltiptext">Reduce the image resolution for a faster load.  Photos are resized before storage anyway.</span>
                            </span></th><td><input type="file" name="file" id="file"/></td></tr>
     <tr><th></th><td>
       <input type="submit" value="Add Photo" id="photoSubmit" style="background-color:lightgrey"/> 
      <input type="submit" value="Cancel" id="photoCancel" />
      </td></tr>
      </table>
      </form>
      <div id="photo-result"/>
      </div>
    </div>
    
    </body>

</html>
