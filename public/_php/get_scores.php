<?PHP
function trySql($sql, $link)
{
 $result = mysql_query($sql, $link);
 if (mysql_errno()){
  mysql_close($link);
  echo mysql_error();
  exit("-1");
 }
 return $result;
}

 require "../../_php/pw.php";
 $link = @mysql_connect($srv, $unw, $pww);
 if (mysql_errno()){
  echo mysql_error();
  exit("-2");
 }
 mysql_select_db($dbn);
 if (mysql_errno()){
  echo mysql_error();
  mysql_close($link);
  exit("-3");
 }
 $game = $_GET["game"];
 $results = trySql("SELECT * FROM scores WHERE game = '$game' ORDER BY score DESC;", $link);
 echo "<?xml version=\"1.0\"?>\n";
 echo "<scores>\n";
 $cnt = 10;
 while($cnt > 0 && $line = mysql_fetch_assoc($results)){
  echo "<name>".$line["name"]."</name>\n";
  echo "<score>".$line["score"]."</score>\n";
  $cnt--;
 }
 echo "</scores>\n";
 trySql("DELETE LOW_PRIORITY FROM scores WHERE game = '$game' AND id IN (SELECT * FROM (SELECT id FROM scores WHERE game = '$game' ORDER BY score DESC LIMIT 10,10000) as t);", $link);
 mysql_close($link);
?>
