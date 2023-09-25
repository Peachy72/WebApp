<?php
$conn = mysqli_connect("localhost", "root", "", "labwork_3");

if (!$conn) {
    die("Connection failed: " . mysqli_connect_error());
} else {
    echo "MySQL connected successfully!<br>";
}

$sql_best_students = "SELECT * FROM students WHERE Mark > 75";
$sql_good_students = "SELECT * FROM students WHERE Mark > 60 AND Mark <= 75";
$sql_average_students = "SELECT * FROM students WHERE Mark < 60";

$result_best_students = $conn->query($sql_best_students);
$result_good_students = $conn->query($sql_good_students);
$result_average_students = $conn->query($sql_average_students);

echo "<h3 align=\"center\">Best Students (Mark > 75)</h3>";
generateTable($result_best_students);

echo "<h3 align=\"center\">Good Students (60 < Mark <= 75)</h3>";
generateTable($result_good_students);

echo "<h3 align=\"center\">Average Students (Mark < 60)</h3>";
generateTable($result_average_students);

function generateTable($result) {
    if ($result->num_rows > 0) {
        echo "<table border=\"1\" width=\"500\" align=\"center\">
        <tr><th>ID</th><th>Name</th><th>Class</th><th>Mark</th><th>Sex</th></tr>";
        while ($row = $result->fetch_assoc()) {
            echo "<tr>";
            echo "<td>" . $row["ID"] . "</td>";
            echo "<td>" . $row["Name"] . "</td>";
            echo "<td>" . $row["Class"] . "</td>";
            echo "<td>" . $row["Mark"] . "</td>";
            echo "<td>" . $row["Sex"] . "</td>";
            echo "</tr>";
        }
        echo "</table>";
    } else {
        echo "¯\_(ツ)_/¯";
    }
}

mysqli_close($conn);
?>