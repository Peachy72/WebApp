<?php
$dbname = "labwork_3";
$conn = mysqli_connect("localhost", "root", "", $dbname);

if (!$conn) {
    die("Connection failed: " . mysqli_connect_error());
} else {
    echo "MySQL connected successfully!<br>";
    echo "Database '$dbname' selected successfully!<br>";
}

$sql = "UPDATE students SET Class = 'Two' WHERE Mark < 60";

if ($conn->query($sql) === TRUE) {
    echo "Classes updated successfully!";
} else {
    echo "Error updating classes: " . $conn->error;
}

mysqli_close($conn);
?>