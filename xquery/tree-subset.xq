import module namespace tp = "http://kitwallace.co.uk/lib/tp" at "../../lib/tp.xqm";
import module namespace math ="http://exist-db.org/xquery/math"  at "org.exist.xquery.modules.math.MathModule";
import module namespace ui="http://kitwallace.me/ui" at "/db/lib/ui.xqm";

declare namespace output = "http://www.w3.org/2010/xslt-xquery-serialization";
declare option output:method "json";
declare option output:media-type "application/json";

declare function local:get-filter() {
let $id := upper-case(request:get-parameter("id",""))
let $common := request:get-parameter("common","")
let $latin := request:get-parameter("latin","")
let $sitecode := upper-case(request:get-parameter("sitecode",""))
let $collection :=request:get-parameter("collection","")
let $latitude := request:get-parameter("latitude","")
let $longitude := request:get-parameter("longitude","")
let $range := request:get-parameter("range","")

let $filter := 
     element filter {
         if ($id =("undefined","")) then () else for $i in $id return element id {$i},
         if ($common = ("undefined","")) then () else for $com in $common return element common {$com} ,
         if ($latin = ("undefined","")) then () else for $lat in $latin return element latin {$lat},
         if ($sitecode =("undefined","")) then () else element sitecode {$sitecode} ,
         if ($latitude =("undefined","")) then () else element latitude {$latitude} ,
         if ($longitude = ("undefined","")) then() else  element longitude {$longitude} ,
         if ($range = ("undefined","")) then () else element range {xs:integer($range)} ,
         if ($collection =("undefined","")) then () else 
             let $contains := $tp:collectionlist/collection[name=$collection]/contains/collection 
             return 
                if ($contains) then
                  for $scollection in $contains
                  return element collection {$scollection/name/string()} 
                else element collection {$collection}
     }
    return $filter
};

declare function local:apply-filter($filter) {
    let $trees := if ($filter/collection != "") 
                  then tp:get-tree-by-collection($filter/collection) 
                  else if ($filter/id) 
                  then tp:get-tree-by-id-stem($filter/id)
                  else tp:get-trees()
    let $trees := if ($filter/latin) 
                  then $trees[starts-with(latin,$filter/latin)] 
                  else $trees
    let $trees := if ($filter/sitecode) 
                  then tp:select-trees-by-sitecode($trees,$filter/sitecode)
                  else $trees
    let $trees := if ($filter/common)
                  then $trees[matches(common,$filter/common,"i")] 
                  else $trees
    let $trees := if ($filter/range and $filter/latitude and $filter/longitude) 
                  then tp:trees-in-range($trees, number($filter/latitude),number($filter/longitude),(number($filter/range),500)[1])
                  else $trees 
    return $trees
};

declare function local:subset-bounding-box($trees) {
  element box {
         element top-left {
                 element      latitude {max($trees/latitude) },
                 element      longitude{min($trees/longitude)}
         },
         element bottom-right {
                 element     latitude {min($trees/latitude) },
                 element     longitude {max($trees/longitude) }
         }
  }
};

declare function local:show-filter($filter) {
    string-join(
        for $field in $filter/*
        return concat(name($field),":",$field)
        ,","
    )
};

declare function local:filter-parameters($filter) {
    string-join(
        for $field in $filter/*
        return concat(name($field),"=",$field)
        ,"&amp;"
    )
};

let $filter := local:get-filter()
return if (empty($filter/( * except range))) then () else
let $trees := local:apply-filter($filter)
let $trees := $trees[latitude][latitude !=0]
let $ntrees := count($trees)
return
  if (empty($trees))
  then ()
  else 
let $bbox := local:subset-bounding-box($trees)
let $latitude:= round-half-to-even(($bbox/top-left/latitude + $bbox/bottom-right/latitude) div 2,6)
let $longitude:= round-half-to-even(($bbox/bottom-right/longitude +$bbox/top-left/longitude)div 2,6)
let $height-m:= ($bbox/top-left/latitude - $bbox/bottom-right/latitude)* 60 * 1850
let $m-per-pixel := $height-m div 800
let $zoom := max((round(19 -  math:sqrt($height-m div 200)) ,12))
let $title := concat(count($trees)," trees in ",local:show-filter($filter))
return
  element result {
     for $tree in $trees
     return 
        element tree {
             $tree/(id,sitecode[1],latitude,longitude,latin[1],common[1],state,girth,height,width,condition)
        },
     element ntrees {count($trees)}, 
     element title {$title},
     element latitude {$latitude},
     element longitude {$longitude},
     element zoom  {$zoom},
     element bbox {$bbox},
     element url {local:filter-parameters($filter)}
   }
      
