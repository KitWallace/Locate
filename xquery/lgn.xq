import module namespace tp = "http://kitwallace.co.uk/lib/tp" at "../../lib/tp.xqm";
declare namespace output = "http://www.w3.org/2010/xslt-xquery-serialization";
declare option output:method "json";
declare option output:media-type "application/json";

let $action := request:get-parameter("action",())

return 
   if ($action="login")
   then let $email :=request:get-parameter("email",())
        let $password :=request:get-parameter("password",())
        let $user := $tp:users/user[email=$email]
        return
           if (exists($user) and util:hash($password,"MD5") = $user/password)
           then 
             let $session := session:set-attribute("user",$user/username/string())
             let $max := session:set-max-inactive-interval(60*60)
             return 
             element result {
                  element action {"login"},
                  $user/username 
             }
           else element result {}
   else if ($action="logout" and session:exists()) 
   then 
        let $cancel := session:clear()
        return element result {
                  element action {"logout"}
             }
 
   else if ($action="username" and session:exists()) 
         then 
         let $user := session:get-attribute("user")
         return 
            if ($user)
            then element result {
                element action {"username"},
                element username {string($user)}
            }
         else 
            element result{
                element action {"no login"}
            }
    else ()
 

