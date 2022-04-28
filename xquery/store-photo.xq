xquery version "3.0";

import module namespace tpp ="http://kitwallace.co.uk/lib/tpp" at "../../lib/tpp.xqm";

let $result := tpp:store-photo()
return 
  if (contains($result,"moderation"))
  then 
     let $emailmessage := 
  <mail>
   <from>tree@bristoltrees.space</from>
   <to>kit.wallace@gmail.com</to>
   <subject>Photo to moderate {current-dateTime()}</subject>
   <message>
     <xhtml><div>
            Moderate photo at <a href="http://kitwallace.co.uk/trees/utils/reconcile-photos.xq?mode=list-public">Public photos</a>  
            </div>
     </xhtml>
   </message>
  </mail>

      let $mail := mail:send-email($emailmessage,(),())
      return $result
   else $result


