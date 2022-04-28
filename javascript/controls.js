var ntabs;

function init_tabs() {
   ntabs=$(".tab").length;
}

function tab(n) {
  $('#tab'+n).show();
  $('#but'+n).css("background-color","red");
  for (var i=0;i<ntabs;i++)
     if (i != n) {
       $('#tab'+i).hide(); 
       $('#but'+i).css("background-color","blue");       
     }
};
