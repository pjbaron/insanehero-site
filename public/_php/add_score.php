<?PHP
function trySql($sql, $link)
{
 $result = mysql_query($sql, $link);
 if (mysql_errno()){
  echo mysql_error();
  mysql_close($link);
  exit("-1");
 }
 return $result;
}

 $game = $_POST['game'];
 $name = $_POST['name'];
 $score = $_POST['score'];
 require "../../_php/pw.php";
 $link = @mysql_connect($srv, $unw, $pww);
 if (mysql_errno()){
  echo mysql_error();
  exit("-2");
 }
 mysql_select_db($dbn, $link);
 if (mysql_errno()){
  echo mysql_error();
  mysql_close($link);
  exit("-3");
 }
 trySql("SET AUTOCOMMIT = 1;", $link);
 trySql("INSERT INTO scores(game, name, score) VALUES('$game', '$name', $score);", $link);
 mysql_close($link);
 echo "success=true"; // AS3 requires a label/value pair output from all PHP scripts
?>
