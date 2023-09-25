<?php
$conn = mysqli_connect("localhost", "root", "", "labwork_3");

if (!$conn) {
    die("Connection failed: " . mysqli_connect_error());
} else {
    echo "MySQL connected successfully!<br>";
}

$sql = "UPDATE students SET Class = 'Two' WHERE Mark < 60";

if ($conn->query($sql) === TRUE) {
    echo "Classes updated successfully!";
} else {
    echo "Error updating classes: " . $conn->error;
}

mysqli_close($conn);
?>