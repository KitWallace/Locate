xquery version "3.0";

import module namespace tp = "http://kitwallace.co.uk/lib/tp" at "../../lib/tp.xqm";
import module namespace tpe = "http://kitwallace.co.uk/lib/tpe" at "../../lib/tpe.xqm";
import module namespace math ="http://exist-db.org/xquery/math"  at "org.exist.xquery.modules.math.MathModule";
import module namespace ui="http://kitwallace.me/ui" at "/db/lib/ui.xqm";

declare namespace output = "http://www.w3.org/2010/xslt-xquery-serialization";
declare option output:method "json";
declare option output:media-type "application/json";

declare function local:zero-pad($i as xs:integer, $n as xs:integer) as xs:string {
    let $s := string($i)
	return
	if (string-length($s) < $n)
	then let $pad-length := $n - string-length($s)	     
	     let $pad-zeros := string-join((for $i in 1 to $pad-length return "0"),'')
		 return concat($pad-zeros,$s)
	else
		$s
};

let $login := xmldb:login("/db/apps/tree","treeman","fagus")
let $user := request:get-parameter("user",())
let $mode := request:get-parameter("mode",())
let $prefix := request:get-parameter("prefix",())
let $entity := tp:get-entity("tree")
let $newtree := ui:get-entity($entity)
let $oldtree := tp:get-tree-by-id($newtree/id)

return
    if ($mode="delete" and $newtree/id and $user and exists($oldtree))
    then
        let $auditupdate := update insert 
                           element delete {
                                 attribute ts {current-dateTime()},
                                 $oldtree
                           }
                          into doc(concat($tp:base,"/logs/treelog/log.xml"))/log
        let $delete := update delete $oldtree
        return 
            element tree { $newtree/id }  
            
    else if ($mode="update" and $newtree/id and $user  and exists($oldtree))
    then
        let $newtree := element tree {
                   $newtree/(* except survey-date),
                   element survey-date {current-date()}
                }
        let $tree := tpe:merge($oldtree,$newtree)
        let $tree := if (empty($tree/latin) and $tree/common!="")
                then let $best-latin := tp:get-best-latin($tree/common)
                     return 
                       element tree {
                           $tree/(* except latin),
                           $best-latin
                       }
                else if (empty($tree/common) and $tree/latin !="")
                then let $species := tp:get-species-by-latin($tree/latin)
                     return 
                       element tree {
                           $tree/(* except common),
                           $species/common[1]
                       }
                 else $tree 

        let $auditupdate := update insert 
                           element update {
                                 attribute ts {current-dateTime()},
                                  $oldtree
                           }
                          into doc(concat($tp:base,"/logs/treelog/log.xml"))/log
        let $dbupdate := update replace $oldtree with $tree
        return 
             element tree {
                 $tree/(id,sitecode,latitude,longitude,latin[1],common[1],state,girth,height,width,condition)
             }
    else if ($mode="add" and $user)  
    then 
        let $id :=
            if ($prefix and $prefix != "")
            then 
                  let $trees := tp:get-tree-by-id-stem($prefix)
                  let $last := (for $tree in $trees order by $tree/id return $tree/id )[last()]
                  return 
                    if ($last) 
                    then
                      let $last-p := tokenize($last,"-")
                      let $prefix := string-join(subsequence($last-p,1,count($last-p) -1),"-")
                      let $digits := string-length($last-p[last()])
                      let $n := $last-p[last()]
                      let $ni := if ($n castable as xs:integer)  then xs:integer($n) + 1 else ()
                      return if (exists($ni)) 
                             then concat($prefix,"-",local:zero-pad($ni,$digits))
                             else ()
                    else concat($prefix,"-",local:zero-pad(1,4))
             else ()
       let $oldtree := tp:get-tree-by-id($id)
       return 
         if (exists ($id) and empty($oldtree))
         then
            let $tree := element tree {
                   element id {$id},
                   $newtree/(* except (id,prefix,edit-user,survey-date)),
                   element edit-user {$user},
                   element survey-date {current-date()}
                }
            let $tree := if (empty($tree/latin) and $tree/common!="")
                then let $best-latin := tp:get-best-latin($tree/common)
                     return 
                       element tree {
                           $tree/(* except latin),
                           $best-latin
                       }
                else if (empty($tree/common) and $tree/latin !="")
                then let $species := tp:get-species-by-latin($tree/latin)
                     return 
                       element tree {
                           $tree/(* except common),
                           $species/common[1]
                       }
                 else $tree 

            let $auditupdate := update insert 
                           element add {
                                 attribute ts {current-dateTime()},
                                 $tree
                           }
                          into doc(concat($tp:base,"/logs/treelog/log.xml"))/log
            let $dbupdate := update insert $tree into doc(concat($tp:base,"/trees/extras.xml"))/trees
            return 
                element tree {
                       $tree/(id,sitecode,latitude,longitude,latin[1],common[1],state,girth,height,width,condition)
                 }
        else element tree {
                   element error {"Error: no prefix entered "}
             }
     else 
          element tree {
                   element error {"Operation not successful "}
           }
